const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");

async function processVideoToSprite(videoPath, workDir, progressCallback) {
  const spriteDir = path.join(workDir, "frames");
  if (!fs.existsSync(spriteDir)) fs.mkdirSync(spriteDir, { recursive: true });

  const meta = await new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) return resolve({ duration: 0, totalFrames: 0, fps: 30 });
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
  // 计算抽帧后的预计总数 (每5帧取1帧)
  const expectedExportFrames = Math.floor(totalFrames / 5);

  return new Promise((resolve, reject) => {
    /**
     * 优化点：
     * 1. thumbnail=5: 每5帧通过算法选择1帧（比单纯取第1帧画质更好）
     * 2. scale=80:-1: 保持小尺寸减少内存占用
     */
    const filterChain = `thumbnail=5,scale=80:-1`;

    const args = [
      "-i", videoPath,
      "-vf", filterChain,
      "-vsync", "0", 
      "-q:v", "8", // 适度降低质量换取内存安全
      "-an", "-y", "-f", "image2",
      path.join(spriteDir, "f_%06d.jpg")
    ];

    const ffmpegProcess = spawn("ffmpeg", args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    });

    ffmpegProcess.stderr.on("data", (data) => {
      const line = data.toString();
      const frameMatch = line.match(/frame=\s+(\d+)/);
      if (frameMatch && progressCallback) {
        const currentExported = parseInt(frameMatch[1]);
        // 进度计算基于抽帧后的预期数
        const percent = expectedExportFrames ? Math.min(99, (currentExported / expectedExportFrames) * 100) : 0;
        progressCallback({
          stage: "extracting",
          message: `正在提取第 ${currentExported} 张缩略图... (5x 采样)`,
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