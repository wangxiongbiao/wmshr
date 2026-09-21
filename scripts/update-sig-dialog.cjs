const fs = require('fs');

let code = fs.readFileSync('admin-v4/src/components/InvoiceManager.tsx', 'utf8');

const oldSigBlock = `      {/* Signature drawing board Modal */}
      {isSigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden transform transition-all animate-scale-up">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {lang === "zh-CN" || lang === "zh-TW" ? "在线手写签名 / 弹窗放大" : "Online Hand-writing Signature (Enlarged)"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {lang === "zh-CN" || lang === "zh-TW" ? "请在下方白色画布上使用鼠标或触屏手指书写您的姓名" : "Please use your mouse or touch screen finger to write below"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSigModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{lang === "zh-CN" || lang === "zh-TW" ? "笔触颜色 / Ink Color:" : "Ink Color:"}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalSigColor("#1e3a8a")}
                      className={cn(
                        "w-5 h-5 rounded-full bg-blue-900 border cursor-pointer transition-all",
                        modalSigColor === "#1e3a8a" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                      )}
                      title="Blue"
                    />
                    <button
                      type="button"
                      onClick={() => setModalSigColor("#ef4444")}
                      className={cn(
                        "w-5 h-5 rounded-full bg-red-500 border cursor-pointer transition-all",
                        modalSigColor === "#ef4444" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                      )}
                      title="Red"
                    />
                    <button
                      type="button"
                      onClick={() => setModalSigColor("#000000")}
                      className={cn(
                        "w-5 h-5 rounded-full bg-black border cursor-pointer transition-all",
                        modalSigColor === "#000000" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                      )}
                      title="Black"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearModalCanvas}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg border border-rose-100 transition cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {lang === "zh-CN" || lang === "zh-TW" ? "清除重写" : "Reset Canvas"}
                </button>
              </div>

              {/* Large Canvas area */}
              <div className="relative bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden h-64 shadow-inner">
                <canvas
                  ref={modalCanvasRef}
                  width={560}
                  height={256}
                  onMouseDown={startModalDrawing}
                  onMouseMove={drawModal}
                  onMouseUp={stopModalDrawing}
                  onMouseLeave={stopModalDrawing}
                  onTouchStart={startModalDrawing}
                  onTouchMove={drawModal}
                  onTouchEnd={stopModalDrawing}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none bg-white"
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSigModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition border border-slate-200 cursor-pointer"
              >
                {lang === "zh-CN" || lang === "zh-TW" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={saveModalSignature}
                className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{lang === "zh-CN" || lang === "zh-TW" ? "确认并应用" : "Save & Apply"}</span>
              </button>
            </div>

          </div>
        </div>
      )}`;

const newSigBlock = `      {/* Signature drawing board Modal */}
      <Dialog open={isSigModalOpen} onOpenChange={setIsSigModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-2xl [&>button]:hidden">
          <DialogHeader className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50 space-y-0">
            <div className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-brand-600" />
              <div>
                <DialogTitle className="font-extrabold text-slate-800 text-sm">
                  {lang === "zh-CN" || lang === "zh-TW" ? "在线手写签名" : "Online Hand-writing Signature"}
                </DialogTitle>
                <DialogDescription className="text-[10px] text-slate-400 font-bold">
                  {lang === "zh-CN" || lang === "zh-TW" ? "请在下方白色画布上使用鼠标或触屏手写您的姓名" : "Please use your mouse or touch screen finger to write below"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSigModalOpen(false)}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {/* Canvas Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{lang === "zh-CN" || lang === "zh-TW" ? "笔触颜色：" : "Ink Color:"}</span>
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => setModalSigColor("#1e3a8a")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-blue-900 border cursor-pointer transition-all",
                      modalSigColor === "#1e3a8a" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                    )}
                    title="Blue"
                  />
                  <div
                    onClick={() => setModalSigColor("#ef4444")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-red-500 border cursor-pointer transition-all",
                      modalSigColor === "#ef4444" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                    )}
                    title="Red"
                  />
                  <div
                    onClick={() => setModalSigColor("#000000")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-black border cursor-pointer transition-all",
                      modalSigColor === "#000000" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                    )}
                    title="Black"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearModalCanvas}
                className="text-[11px] font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-100 flex items-center gap-1 h-7"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {lang === "zh-CN" || lang === "zh-TW" ? "清除重写" : "Reset Canvas"}
              </Button>
            </div>

            {/* Large Canvas area */}
            <div className="relative bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden h-64 shadow-inner">
              <canvas
                ref={modalCanvasRef}
                width={560}
                height={256}
                onMouseDown={startModalDrawing}
                onMouseMove={drawModal}
                onMouseUp={stopModalDrawing}
                onMouseLeave={stopModalDrawing}
                onTouchStart={startModalDrawing}
                onTouchMove={drawModal}
                onTouchEnd={stopModalDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none bg-white"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <DialogFooter className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 sm:space-x-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSigModalOpen(false)}
              className="text-xs font-bold text-slate-500"
            >
              {lang === "zh-CN" || lang === "zh-TW" ? "取消" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={saveModalSignature}
              className="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{lang === "zh-CN" || lang === "zh-TW" ? "确认并应用" : "Save & Apply"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>`;

if (!code.includes('{/* Signature drawing board Modal */}')) {
  console.log('Could not find Signature drawing board Modal comment');
  process.exit(1);
}

// Find index of comment
const idx = code.indexOf('{/* Signature drawing board Modal */}');
const endIdx = code.indexOf('export default InvoiceManager', idx);
const before = code.substring(0, idx);
const after = code.substring(endIdx);

code = before + newSigBlock + '\n\n' + after;

fs.writeFileSync('admin-v4/src/components/InvoiceManager.tsx', code, 'utf8');
console.log('Successfully updated isSigModalOpen to UI Dialog!');
