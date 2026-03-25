const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openVideoDialog: () => ipcRenderer.invoke("dialog:openVideo"),
  // payload 可以是字符串（videoPath），也可以是 { videoPath, options } 对象
  processVideo: (payload) => ipcRenderer.invoke("video:process", payload),
  onVideoProgress: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("video:progress", listener);
    return () => ipcRenderer.removeListener("video:progress", listener);
  }
});

