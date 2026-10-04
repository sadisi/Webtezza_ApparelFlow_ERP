export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-900 text-slate-100 font-sans">
      <div className="max-w-2xl w-full border border-slate-800 rounded-lg p-8 bg-slate-950 shadow-xl space-y-6 text-center">
        <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
          Phase 1 Complete — Project Bootstrap
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-white">
          APPARELFLOW ERP
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed">
          Production Batch Verification &amp; Sewing Queue Gate.
          A server-enforced production control system for garment manufacturing cutting operations.
        </p>

        <div className="grid grid-cols-3 gap-4 text-left pt-4 border-t border-slate-800 text-xs text-slate-300">
          <div className="p-3 bg-slate-900 rounded border border-slate-800">
            <span className="block font-semibold text-slate-200">Supervisor</span>
            <span className="text-slate-500">Order Creation &amp; Progress</span>
          </div>
          <div className="p-3 bg-slate-900 rounded border border-slate-800">
            <span className="block font-semibold text-slate-200">Verifier</span>
            <span className="text-slate-500">QC &amp; Hard-Stop Gate</span>
          </div>
          <div className="p-3 bg-slate-900 rounded border border-slate-800">
            <span className="block font-semibold text-slate-200">Sewing</span>
            <span className="text-slate-500">Verified-Only Queue</span>
          </div>
        </div>
      </div>
    </main>
  );
}
