import { useState } from 'react'

function App() {
  const [code, setCode] = useState("MOV AX, 0001H\nCMP CX, 0000H\nJNE START_LOOP\nADD AX, 0002H")
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:8000/predict_block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: code.split('\n') })
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("API Error:", error)
    }
    setLoading(false)
  }

  let instruction = "Awaiting execution trace...";
  let telemetryTag = "";

  if (results && results.primary_bottleneck) {
    const parts = results.primary_bottleneck.split('—');
    if (parts.length > 1) {
      instruction = parts[0].trim();
      telemetryTag = parts[1].trim().toUpperCase();
    } else {
      telemetryTag = parts[0].trim().toUpperCase();
      instruction = "N/A";
    }
  }

  const getTelemetryTheme = (text) => {
    const upper = text.toUpperCase()
    if (upper.includes("HAZARD") || upper.includes("CRITICAL") || upper.includes("FATAL")) 
      return { border: "border-red-500/50", text: "text-red-400", bg: "bg-red-950/40", leftBorder: "border-l-red-500" }
    if (upper.includes("MEMORY") || upper.includes("BUS") || upper.includes("SATURATION")) 
      return { border: "border-amber-500/50", text: "text-amber-400", bg: "bg-amber-950/40", leftBorder: "border-l-amber-500" }
    return { border: "border-emerald-500/50", text: "text-emerald-400", bg: "bg-emerald-950/40", leftBorder: "border-l-emerald-500" }
  }

  const activeTheme = results ? getTelemetryTheme(telemetryTag) : { border: "border-slate-700", text: "text-slate-400", bg: "bg-slate-900", leftBorder: "border-l-slate-700" }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono selection:bg-cyan-900 selection:text-cyan-50">
      
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="w-10 h-10 rounded border border-cyan-500/30 bg-cyan-950/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-white">8086_PROFILER_<span className="text-cyan-500">V3</span></h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Hardware Profiler</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-1 backdrop-blur-sm focus-within:border-cyan-500/50 transition-colors duration-300">
            <div className="px-4 py-2 border-b border-slate-800/50 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">&gt;_ Assembly Input</span>
            </div>
            <textarea 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 bg-transparent text-cyan-100 p-4 font-mono text-sm resize-none focus:outline-none"
              spellCheck="false"
            />
          </div>
          
          <button 
            onClick={runAnalysis}
            disabled={loading}
            className="w-full py-4 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400 font-bold tracking-widest uppercase hover:bg-cyan-900 hover:text-white transition-all duration-300 disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            {loading ? "INITIALIZING SLIDING WINDOW..." : "RUN HOTSPOT ANALYSIS"}
          </button>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex flex-col justify-center backdrop-blur-md">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Predicted T-States</span>
              <span className="text-5xl font-light text-white">{results ? results.total_t_states : "--"}</span>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 flex flex-col justify-center backdrop-blur-md">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Heaviest Instruction {results && results.bottleneck_line ? `(Line ${results.bottleneck_line})` : ""}
              </span>
              <span className="text-lg font-bold text-slate-200 leading-relaxed">
                {instruction}
              </span>
            </div>

          </div>

          {results && results.insight && (
            <div className={`bg-slate-900/40 border border-slate-800 border-l-4 ${activeTheme.leftBorder} rounded-lg p-6 backdrop-blur-md transition-all duration-500 shadow-lg`}>
              <div className="flex items-center gap-3 mb-4 border-b border-slate-800/50 pb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Optimization Directive</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${activeTheme.border} ${activeTheme.text} ${activeTheme.bg}`}>
                  {telemetryTag}
                </span>
              </div>
              <span className="text-sm font-light text-slate-200 leading-relaxed block">
                {results.insight}
              </span>
            </div>
          )}

          {results && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden backdrop-blur-md mt-2">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Instruction Pipeline Trace</span>
              </div>
              
              <div className="p-2">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-2">Line</div>
                  <div className="col-span-7">Instruction</div>
                  <div className="col-span-3 text-right">Cycles (T)</div>
                </div>
                
                {results.breakdown.map((item, idx) => {
                  let rowColor = "text-slate-300 hover:bg-slate-800/50"
                  if (item.t_states > 10) rowColor = "text-red-400 bg-red-950/20 border border-red-900/30 hover:bg-red-900/30"
                  else if (item.t_states > 4) rowColor = "text-amber-400 bg-amber-950/10 hover:bg-amber-900/20"
                  else rowColor = "text-emerald-400 bg-emerald-950/10 hover:bg-emerald-900/20"

                  return (
                    <div key={idx} className={`grid grid-cols-12 gap-4 px-4 py-3 text-sm rounded mb-1 transition-colors ${rowColor}`}>
                      <div className="col-span-2 opacity-50">{String(item.line).padStart(2, '0')}</div>
                      <div className="col-span-7 font-bold">{item.instruction}</div>
                      <div className="col-span-3 text-right">{item.t_states.toFixed(1)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default App