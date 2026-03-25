const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { processVideoToSprite } = require("./video-processor");

const isDev = !app.isPackaged;
let mainWindow = null;
let tempRootDir = null;

// 1. 注册自定义协议以安全地访问本地图片 (代替 file:// 协议)
function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, '');
    // 解码路径以处理中文和空格
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Protocol Error:', error);
    }
  });
}

function getTempRootDir() {
  if (!tempRootDir) {
    // 确保临时目录在系统临时文件夹中
    tempRootDir = fs.mkdtempSync(path.join(os.tmpdir(), "frame-vision-v2-"));
  }
  return tempRootDir;
}

function cleanTempRootDir() {
  if (tempRootDir && fs.existsSync(tempRootDir)) {
    try {
      fs.rmSync(tempRootDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Frame Vision - 全帧可视化工作台",
    // 这里的路径取决于你 package.json 中 files 的配置
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true // 开启安全，通过 local-resource 协议访问图片
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools();
  } else {
    // 关键：生产环境下加载打包好的静态文件
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  registerLocalResourceProtocol();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", cleanTempRootDir);

// --- IPC 处理器 ---

ipcMain.handle("dialog:openVideo", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "选择视频源文件",
    properties: ["openFile"],
    filters: [{ name: "视频文件", extensions: ["mp4", "mov", "mkv", "avi", "webm"] }]
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle("video:process", async (event, payload) => {
  const videoPath = typeof payload === "string" ? payload : payload.videoPath;
  const workDir = fs.mkdtempSync(path.join(getTempRootDir(), "job-"));

  const progressCallback = (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("video:progress", info);
    }
  };

  try {
    const result = await processVideoToSprite(videoPath, workDir, progressCallback);
    const originalFps = result.metadata.originalFps || 30;

    const framesData = result.spriteFiles.map((filePath, index) => {
      // 统一路径斜杠
      const normalized = filePath.replace(/\\/g, "/");

      const totalSeconds = (index * 5) / originalFps;
      const m = Math.floor(totalSeconds / 60);
      const s = Math.floor(totalSeconds % 60);
      const ms = Math.floor((totalSeconds % 1) * 100);
      const timecode = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

      return {
        // 关键：使用自定义协议 local-resource 代替 file:// 避免打包后的安全拦截
        url: `local-resource://${normalized}`,
        timecode: timecode,
        index: index
      };
    });

    return { ...result, spriteFiles: framesData };
  } catch (error) {
    console.error("Processing Error:", error);
    throw error;
  }
});