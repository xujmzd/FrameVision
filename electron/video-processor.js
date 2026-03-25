const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");

// --- 新增：获取打包后的 FFmpeg 路径逻辑 ---
const isDev = !require('electron').app.isPackaged;

// 获取 ffmpeg 和 ffprobe 的路径
// 在打包环境中，electron-builder 会把它们放在 app.asar.unpacked 目录下
let ffmpegPath = require('ffmpeg-static');
let ffprobePath = require('ffprobe-static').path;

if (!isDev) {
  // 修正生产环境路径：将 app.asar 替换为 app.asar.unpacked
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
}

// 设置 fluent-ffmpeg 使用的路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
// ---------------------------------------

async function processVideoToSprite(videoPath, workDir, progressCallback) {
  const spriteDir = path.join(workDir, "frames");
  if (!fs.existsSync(spriteDir)) fs.mkdirSync(spriteDir, { recursive: true });

  const meta = await new Promise((resolve) => {
    // 自动使用上面 setFfprobePath 设置的路径
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        console.error("ffprobe error:", err);
        return resolve({ duration: 0, totalFrames: 0, fps: 30 });
      }
      const v = data.streams.find(s => s.codec_type === "video");
      const fpsParts = (v.r_frame_rate || "30/1").split('/');
      const fps = parseFloat(fpsParts[0]) / parseFloat(fpsParts[1]);
      resolve({
        duration: parseFloat(data.format.duration) || 0,
        totalFrames: parseInt(v.nb_frames) || 0,
        fps: fps
      });
    });
  });

  const { totalFrames, fps } = meta;
  const expectedExportFrames = Math.floor(totalFrames / 5);

  return new Promise((resolve, reject) => {
    const filterChain = "thumbnail=5,scale=80:-1";

    const args = [
      "-i", videoPath,
      "-vf", filterChain,
      "-vsync", "0",
      "-q:v", "8",
      "-an", "-y", "-f", "image2",
      path.join(spriteDir, "f_%06d.jpg")
    ];

    // --- 修改点：使用上面获取的绝对 ffmpegPath 而不是全局 "ffmpeg" 字符串 ---
    const ffmpegProcess = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    ffmpegProcess.stderr.on("data", (data) => {
      const line = data.toString();
      const frameMatch = line.match(/frame=\s+(\d+)/);
      if (frameMatch && progressCallback) {
        const currentExported = parseInt(frameMatch[1]);
        const percent = expectedExportFrames ? Math.min(99, (currentExported / expectedExportFrames) * 100) : 0;
        progressCallback({
          stage: "extracting",
          message: `正在提取第 ${currentExported} 张缩略图...`,
          percent: percent
        });
      }
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        const files = fs.readdirSync(spriteDir)
          .filter(f => f.endsWith(".jpg"))
          .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
          .map(f => path.join(spriteDir, f));

        resolve({
          spriteFiles: files,
          metadata: { totalFiles: files.length, fps: fps / 5, originalFps: fps }
        });
      } else {
        reject(new Error(`FFmpeg 退出码: ${code}`));
      }
    });

    ffmpegProcess.on("error", (err) => reject(err));
  });
}

module.exports = { processVideoToSprite };