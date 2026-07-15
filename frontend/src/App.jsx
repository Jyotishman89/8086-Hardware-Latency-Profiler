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
      <div className="border-b-2 border-emerald-900 pb-2 mb-4 flex justify-between">
        <span className="text-sm font-bold tracking-widest">[HARDWARE_PROFILER:8086_PROFILER_V3]</span>
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
              <div className="text-[10px] text-emerald-800 mb-2">OPTIMIZATION_DIRECTIVE</div>
              <div className="text-sm text-emerald-300 leading-relaxed">
                {results.insight}
              </div>
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