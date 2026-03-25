# FrameVision 帧视界 (V0.1.0)

[![Electron](https://img.shields.io/badge/Electron-31.7-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-ffc91f.svg)](https://vitejs.dev/)

**FrameVision** 是一款专为视频剪辑、广告片、长视频导出后进行快速质检（QC）而设计的桌面端工具。它能够将视频的每一帧进行可视化平铺，并利用底层图像引擎自动检测黑帧、撕裂帧等异常情况，极大提升后期审核效率。

---

## 🛠️ 技术栈

* **前端框架**: React 18 + Vite (基于 ESM 的极速开发响应)
* **桌面外壳**: Electron 31 (跨平台原生集成)
* **UI 样式**: Tailwind CSS (原子化 CSS 设计)
* **图像处理**: Sharp (高性能 Node.js 图像处理库，负责帧分析与长图拼接)
* **视频分析**: FFmpeg (通过 `fluent-ffmpeg` 驱动，支持多格式硬件加速解码)
* **状态管理**: React Hooks (useState, useEffect, useRef)

---

## ✨ 核心特性

* **全帧可视化**: 自动将视频按网格系统平铺，默认支持 5x 采样或全量提取。
* **智能异常检测**: 
    * **黑帧检测**: 自动识别并标记平均亮度低于阈值的无效画面。
    * **撕裂检测**: 通过 Sharp 分析相邻帧的像素差异与亮度突变，高亮疑似渲染异常帧。
* **高性能渲染**: 
    * 生成的预览图采用 **WebP 格式**，兼顾高保真与极小体积。
    * 使用自定义 `local-resource://` 协议加载本地缓存，规避打包后的 Web 安全限制。
* **自动缓存管理**: 任务执行期间使用系统 `os.tmpdir()` 存储碎片，并在应用关闭时自动销毁，不占用磁盘空间。

---

## 🚀 快速开始

### 1. 环境准备
* **Node.js**: 推荐版本 >= 18.0.0
* **FFmpeg**: 需确保 `ffmpeg` 与 `ffprobe` 在系统环境变量中，或项目已正确集成二进制包。

### 2. 安装
```bash
git clone [https://github.com/your-username/frame-vision.git](https://github.com/your-username/frame-vision.git)
cd frame-vision
npm install
```

### 3. 开发模式运行
* 一个命令同时启动 Vite 开发服务器和 Electron 窗口：

```bash
npm run dev
```

## 📦 打包与分发 (Production)

* 项目已集成 electron-builder 配置，支持 ASAR 静态资源打包。

** 步骤 1：构建前端资源 **
```Bash
npm run build
```
此步骤会清理 dist 文件夹，并根据 vite.config.mjs 中的 base: "./" 配置生成相对路径资源。

** 步骤 2：生成 Windows 安装程序 **
```Bash
npm run package
```
打包成功后，可在项目根目录下的 release 文件夹内找到 .exe 安装包。

提示: 打包配置文件已包含 asarUnpack 逻辑，用于解压 ffmpeg 和 sharp 等原生二进制模块，确保生产环境下算法引擎正常运行。

## 📂 项目结构
```
Project\
├── electron/          # Electron 主进程 (main.js, preload.js)
├── src/               # React 前端逻辑与组件
├── public/            # 静态资源 (打包时直接复制到根目录)
├── build/             # 打包配置文件与图标 (icon.ico)
├── dist/              # 前端编译产物 (构建后生成)
├── release/           # 最终打包输出目录 (安装程序所在位置)
├── LICENSE.txt        # 开源许可证
├── vite.config.mjs    # Vite 配置文件 (含 base 路径修正)
└── package.json       # 项目依赖与构建脚本
```
## 🛡️ 许可证
**本项目基于 MIT License 开源。详情请参阅 LICENSE.txt。**

## 👨‍💻 维护者
**@Xujmzd V0.1.0 Optimized for High-Performance Quality Control.**