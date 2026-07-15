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
    <div className="min-h-screen bg-black text-emerald-500 p-4 font-mono">
      <div className="border-b-2 border-emerald-900 pb-3 mb-4 flex justify-between items-end">
        <div>
          <span className="text-sm font-bold tracking-widest block">8086_PROFILER_V3</span>
          <span className="text-xs text-emerald-700 block mt-1">HARDWARE_PROFILER</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <div className="lg:col-span-4 flex flex-col">
          <div className="text-xs text-emerald-800 mb-1">&gt;_ASSEMBLY_INPUT</div>
          <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-80 bg-black border-2 border-emerald-900 p-2 text-emerald-400 focus:outline-none focus:border-emerald-500 resize-none"
            spellCheck="false"
          />
          <button 
            onClick={runAnalysis}
            disabled={loading}
            className="w-full mt-2 bg-emerald-900 text-black font-bold p-2 hover:bg-emerald-500 transition-all disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : "RUN_HOTSPOT_ANALYSIS"}
          </button>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-emerald-900 p-4">
              <div className="text-[10px] text-emerald-800 mb-2">TOTAL_PREDICTED_T-STATES</div>
              <div className="text-4xl">{results ? results.total_t_states : "0000"}</div>
            </div>
            <div className="border-2 border-emerald-900 p-4">
              <div className="text-[10px] text-emerald-800 mb-2">PIPELINE_STATUS</div>
              <div className="text-sm uppercase font-bold">{results ? results.primary_bottleneck : "IDLE"}</div>
            </div>
          </div>

          {results && results.insight && (
            <div className="border-2 border-emerald-900 p-4 bg-emerald-950/20">
              <div className="flex items-center gap-3 mb-3 border-b border-emerald-900/50 pb-2">
                <div className="text-[10px] text-emerald-800">OPTIMIZATION_DIRECTIVE</div>
                <div className={`text-[10px] font-bold text-black px-2 py-0.5 ${
                  telemetryTag.includes("HAZARD") || telemetryTag.includes("FATAL") ? "bg-red-600" : 
                  (telemetryTag.includes("MEMORY") || telemetryTag.includes("BUS")) ? "bg-amber-600" : "bg-emerald-600"
                }`}>
                  [{telemetryTag}]
                </div>
              </div>
              <div className="text-sm text-emerald-300 leading-relaxed">
                {results.insight}
              </div>

              {telemetryTag.includes("FATAL") && (
                <div className="border border-red-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-red-800 mb-2 tracking-widest">SYSTEM_INTERRUPT_CONTROLLER</div>
                  <svg className="w-full h-12" viewBox="0 0 400 40" fill="none" stroke="currentColor">
                    <rect x="50" y="10" width="80" height="20" className="stroke-red-900 fill-red-950/30" />
                    <text x="90" y="24" className="fill-red-500 text-[10px] font-bold" textAnchor="middle" stroke="none">ILLEGAL_OP</text>
                    
                    <rect x="270" y="10" width="85" height="20" className="stroke-red-900 fill-red-950/30" />
                    <text x="310" y="24" className="fill-red-500 text-[10px] font-bold" textAnchor="middle" stroke="none">ABORTED</text>
                    
                    <path d="M 130 20 L 270 20" className="stroke-red-600" strokeWidth="2" strokeDasharray="6 2" />
                    <circle cx="200" cy="20" r="8" className="fill-red-900 stroke-red-500" strokeWidth="2" />
                    <text x="200" y="24" className="fill-black text-[12px] font-bold" textAnchor="middle" stroke="none">!</text>
                    <text x="200" y="8" className="fill-red-500 text-[8px]" textAnchor="middle" stroke="none">EXCEPTION_HANDLER</text>
                  </svg>
                </div>
              )}
              
              {telemetryTag.includes("HAZARD") && (
                <div className="border border-red-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-red-800 mb-2 tracking-widest">PIPELINE_PREFETCH_QUEUE (6-BYTE)</div>
                  <svg className="w-full h-12" viewBox="0 0 450 40" fill="none" stroke="currentColor">
                    <rect x="10" y="10" width="80" height="20" className="stroke-emerald-900" strokeDasharray="4 2" />
                    <text x="50" y="24" className="fill-emerald-900 text-[10px]" textAnchor="middle" stroke="none">FLUSHED</text>
                    <rect x="105" y="10" width="80" height="20" className="stroke-emerald-900" strokeDasharray="4 2" />
                    <text x="145" y="24" className="fill-emerald-900 text-[10px]" textAnchor="middle" stroke="none">FLUSHED</text>
                    <rect x="200" y="10" width="125" height="20" className="stroke-red-900 fill-red-950/30" strokeWidth="2" />
                    <text x="262.5" y="24" className="fill-red-500 text-[10px] font-bold" textAnchor="middle" stroke="none">PREFETCH REFILL (16T)</text>
                    <rect x="340" y="10" width="80" height="20" className="stroke-emerald-500" strokeWidth="2" />
                    <text x="380" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">NEW FETCH</text>
                    <path d="M 90 20 L 105 20 M 185 20 L 200 20 M 325 20 L 340 20" className="stroke-emerald-800" strokeWidth="2" />
                  </svg>
                </div>
              )}

              {(telemetryTag.includes("MEMORY") || telemetryTag.includes("BUS")) && (
                <div className="border border-amber-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-amber-800 mb-2 tracking-widest">BUS_INTERFACE_UNIT (BIU_IO)</div>
                  <svg className="w-full h-12" viewBox="0 0 400 40" fill="none" stroke="currentColor">
                    <rect x="50" y="10" width="80" height="20" className="stroke-emerald-900" />
                    <text x="90" y="24" className="fill-emerald-700 text-[10px]" textAnchor="middle" stroke="none">EU</text>
                    <rect x="270" y="10" width="80" height="20" className="stroke-amber-600 fill-amber-950/30" strokeWidth="2" />
                    <text x="310" y="24" className="fill-amber-500 text-[10px] font-bold" textAnchor="middle" stroke="none">RAM</text>
                    <path d="M 130 18 L 270 18 M 270 22 L 130 22" className="stroke-amber-700" strokeWidth="2" />
                    <circle cx="200" cy="20" r="6" className="fill-amber-500 stroke-none" />
                    <text x="200" y="12" className="fill-amber-500 text-[8px]" textAnchor="middle" stroke="none">BUS WAIT-STATE</text>
                  </svg>
                </div>
              )}

              {(telemetryTag.includes("OPTIMAL") || telemetryTag.includes("STANDARD")) && (
                <div className="border border-emerald-900/50 p-2 bg-black mt-4">
                  <div className="text-[8px] text-emerald-700 mb-2 tracking-widest">EXECUTION_UNIT (NATIVE_SILICON)</div>
                  <svg className="w-full h-12" viewBox="0 0 400 40" fill="none" stroke="currentColor">
                    <rect x="50" y="10" width="80" height="20" className="stroke-emerald-600 fill-emerald-950/30" />
                    <text x="90" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">REGISTERS</text>
                    <rect x="270" y="10" width="80" height="20" className="stroke-emerald-600 fill-emerald-950/30" />
                    <text x="310" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">ALU CORE</text>
                    <path d="M 130 15 L 270 15 M 270 25 L 130 25" className="stroke-emerald-400" strokeWidth="2" strokeDasharray="4 2" />
                    <text x="200" y="12" className="fill-emerald-500 text-[8px]" textAnchor="middle" stroke="none">&lt; FAST PATH &gt;</text>
                  </svg>
                </div>
              )}
            </div>
          )}

          <div className="border-2 border-emerald-900 flex-grow">
            <div className="bg-emerald-900 text-black px-2 py-1 text-xs font-bold">INSTRUCTION_PIPELINE_TRACE</div>
            
            <div className="p-2 text-xs grid grid-cols-12 gap-2 text-emerald-700 border-b border-emerald-950 mb-2">
              <div className="col-span-2">LINE</div>
              <div className="col-span-6">INSTRUCTION</div>
              <div className="col-span-4 text-right">CYCLES (T)</div>
            </div>

            <div className="px-2 pb-2">
              {results && results.breakdown.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 text-xs mb-1 hover:bg-emerald-950/30">
                  <div className="col-span-2 text-emerald-800">{String(item.line).padStart(2, '0')}</div>
                  <div className="col-span-6 text-emerald-400">{item.instruction}</div>
                  <div className="col-span-4 text-right text-emerald-500">{item.t_states}T</div>
                </div>
              ))}
              
              {!results && (
                <div className="text-emerald-800 text-center mt-8 text-xs">
                  AWAITING TRACE EXECUTION...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App