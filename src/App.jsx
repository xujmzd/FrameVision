import React, { useState, useEffect, useRef } from "react";

const hasElectron = typeof window !== "undefined" && !!window.electronAPI;

// 优化后的图标组件：直接引用本地图标
const AppIcon = () => (
  <div className="w-10 h-10 shadow-lg shadow-indigo-200 rounded-xl overflow-hidden flex items-center justify-center">
    <img
      src="icon.ico"
      alt="App Icon"
      className="w-full h-full object-cover"
    />
  </div>
);

function App() {
  const [videoPath, setVideoPath] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", message: "", percent: 0 });
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!hasElectron) return;
    const unsubscribe = window.electronAPI.onVideoProgress((payload) => {
      setProgress(payload);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleProcess = async () => {
    if (!videoPath || !hasElectron) return;
    setResult(null);
    setProgress({ stage: "init", message: "引擎初始化... Engine Initializing", percent: 0 });
    setProcessing(true);

    try {
      const res = await window.electronAPI.processVideo({ videoPath });
      setResult(res);
      setProgress({ stage: "done", message: "处理完成 Done", percent: 100 });
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDrag = (e, entering) => {
    e.preventDefault();
    if (entering) dragCounter.current++;
    else dragCounter.current--;
    setIsDragging(dragCounter.current > 0);
  };

  return (
    <div className="h-screen flex flex-col bg-white text-slate-800 font-sans select-none overflow-hidden">
      {/* Header / 头部 */}
      <header className="px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <AppIcon />
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              FrameVision <span className="text-indigo-600">帧视界</span>
              <span className="text-slate-400 font-light ml-2 text-xs">@Xujmzd V0.1.0</span>
            </h1>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
              {processing ? `Processing 处理中: ${Math.round(progress.percent)}%` : 'System Ready 系统就绪'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden xl:block text-right max-w-sm">
             <div className="text-[9px] text-slate-400 font-bold uppercase">Source Path 源路径</div>
             <div className="text-xs text-slate-500 truncate italic max-w-[200px]">{videoPath || 'No file selected 未选文件'}</div>
          </div>
          <button
            onClick={() => window.electronAPI.openVideoDialog().then(p => p && setVideoPath(p))}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
          >
            选择文件 Select
          </button>
          <button
            onClick={handleProcess}
            disabled={!videoPath || processing}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 ${
              processing ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {processing ? '分析中 Running' : '开始解析 Start'}
          </button>
        </div>
      </header>

      <main
        className="flex-1 flex overflow-hidden relative"
        onDragEnter={(e) => handleDrag(e, true)}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => handleDrag(e, false)}
        onDrop={(e) => {
          handleDrag(e, false);
          const files = Array.from(e.dataTransfer.files || []);
          if (files.length > 0 && files[0].path) setVideoPath(files[0].path);
        }}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-[100] bg-indigo-600/10 backdrop-blur-md border-4 border-dashed border-indigo-400 flex items-center justify-center pointer-events-none transition-all">
            <div className="bg-white shadow-2xl px-12 py-6 rounded-3xl font-black text-indigo-600 text-xl border border-indigo-100">
              DROP VIDEO 释放导入视频
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className="w-14 border-r border-slate-50 bg-slate-50/50 flex flex-col items-center py-8">
          <div className="flex-1 w-1.5 bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="absolute bottom-0 w-full bg-indigo-500 transition-all duration-700 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
              style={{ height: `${progress.percent}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-slate-400 mt-6 [writing-mode:vertical-lr] rotate-180 uppercase tracking-[0.2em]">
            Progress 进度
          </span>
        </aside>

        {/* Frame Grid */}
        <section className="flex-1 bg-[#f8fafc] overflow-y-auto overflow-x-hidden custom-scrollbar p-1">
          {result?.spriteFiles ? (
            <div className="flex flex-wrap items-start content-start">
              {result.spriteFiles.map((frame) => (
                <div
                  key={frame.index}
                  className="group relative w-[60px] sm:w-[70px] md:w-[80px] h-auto m-0 p-0 border-[0.5px] border-white/40 overflow-hidden bg-slate-200"
                >
                  <img
                    src={frame.url}
                    loading="lazy"
                    className="w-full h-auto block transition-transform duration-300 group-hover:scale-125 group-hover:z-10"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/30 transition-all flex items-end justify-center pointer-events-none">
                     <span className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 mb-1 rounded font-mono">
                        {frame.timecode}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <svg className="w-20 h-20 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-bold tracking-[0.3em] uppercase">Ready to Analysis 待命中</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-2 bg-white border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400">
         <div className="flex gap-8">
           <span className="flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${processing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
             STATUS 状态: {processing ? 'EXTRACTING 提取中' : 'IDLE 待命'}
           </span>
           <span>MODE 模式: 5x SAMPLING (每5帧取1)</span>
         </div>
         <div className="font-mono bg-slate-50 px-3 py-1 rounded-full border border-slate-100 text-slate-500">
           {result ? `TOTAL 总帧数: ${result.spriteFiles.length}` : 'v2.1.0 Optimized'}
         </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 14px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 7px;
          border: 4px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

export default App;