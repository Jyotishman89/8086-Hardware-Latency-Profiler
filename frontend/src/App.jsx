import { useState } from 'react'

function App() {
  const [code, setCode] = useState("MOV AX, 0001H\nMOV AX, BX\nADD AX, 0002H\nCMP CX, 0000H\nJNE START_LOOP")
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

  let bottleneckInstruction = "IDLE";
  let telemetryTag = "";

  if (results && results.primary_bottleneck) {
    const parts = results.primary_bottleneck.split('—');
    if (parts.length > 1) {
      bottleneckInstruction = parts[0].trim();
      telemetryTag = parts[1].trim().toUpperCase();
    } else {
      telemetryTag = parts[0].trim().toUpperCase();
      bottleneckInstruction = "N/A";
    }
  }

  return (
    <div className="min-h-screen bg-black text-emerald-500 p-4 font-mono">
      <div className="border-b-2 border-emerald-900 pb-3 mb-4 flex justify-between items-end">
        <div>
          <span className="text-sm font-bold tracking-widest block text-emerald-400">8086_PROFILER_V4</span>
          <span className="text-xs text-emerald-700 block mt-1">HARDWARE_PROFILER</span>
        </div>
        
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="square">
            <rect x="5" y="5" width="14" height="14" />
            <rect x="9" y="9" width="6" height="6" />
            <path d="M7 5V2M12 5V2M17 5V2M7 19v3M12 19v3M17 19v3M5 7H2M5 12H2M5 17H2M19 7h3M19 12h3M19 17h3" />
          </svg>
          
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
            {loading ? "PROCESSING TRACE..." : "ANALYZE"}
          </button>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-emerald-900 p-4">
              <div className="text-[10px] text-emerald-800 mb-2">TOTAL_PREDICTED_T-STATES</div>
              <div className="text-4xl">{results ? results.total_t_states : "0000"}</div>
            </div>
            <div className="border-2 border-emerald-900 p-4">
              <div className="text-[10px] text-emerald-800 mb-2">BOTTLENECK_OPCODE</div>
              <div className={`text-xl uppercase font-bold ${
                telemetryTag.includes("FATAL") || telemetryTag.includes("HAZARD") ? "text-red-500" : "text-emerald-400"
              }`}>
                {bottleneckInstruction}
              </div>
            </div>
          </div>

          {results && results.shap_importances && results.shap_importances.length > 0 && (
            <div className="border-2 border-emerald-900 p-4 bg-black">
              <div className="text-[10px] text-emerald-800 mb-2 tracking-widest">SHAP_HEURISTIC_WEIGHTS (XGB_REGRESSOR)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {results.shap_importances.map((shapStr, idx) => {
                  const parts = shapStr.split(' from ');
                  
                  const numericValue = parseFloat(parts[0].replace('+', '').replace('T', ''));
                  
                  let colorClass = "text-emerald-500"; 
                  if (numericValue > 10) {
                    colorClass = "text-red-500";       
                  } else if (numericValue >= 5) {
                    colorClass = "text-amber-500";  
                  }

                  return (
                    <div key={idx} className="border border-emerald-900/50 p-2 bg-emerald-950/20 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-600 uppercase tracking-wider">{parts[1]}</span>
                      <span className={`text-xs font-bold ${colorClass}`}>{parts[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {results && results.insight && (
            <div className="border-2 border-emerald-900 p-4 bg-emerald-950/20">
              <div className="flex items-center gap-3 mb-3 border-b border-emerald-900/50 pb-2">
                <div className="text-[10px] text-emerald-800">OPTIMIZATION_DIRECTIVE (XGB_CLASSIFIER)</div>
                <div className={`text-[10px] font-bold px-2 py-0.5 border ${
                  telemetryTag.includes("FATAL") || telemetryTag.includes("HAZARD") ? "text-red-500 bg-red-950/30 border-red-900/50" : 
                  (telemetryTag.includes("MEMORY") || telemetryTag.includes("BUS") || telemetryTag.includes("HEAVY")) ? "text-amber-500 bg-amber-950/30 border-amber-900/50" : 
                  telemetryTag.includes("STACK") ? "text-indigo-400 bg-indigo-950/30 border-indigo-900/50" :
                  "text-emerald-500 bg-emerald-950/30 border-emerald-900/50"
                }`}>
                  [{telemetryTag}]
                </div>
              </div>
              <div className="text-sm text-emerald-300 leading-relaxed">
                {results.insight}
              </div>

              {telemetryTag.includes("FATAL") && (
                <div className="border border-red-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-red-800 mb-2 tracking-widest">SYSTEM_INTERRUPT_CONTROLLER (EXCEPTION)</div>
                  <svg className="w-full h-12" viewBox="0 0 450 40" fill="none" stroke="currentColor">
                    <rect x="10" y="10" width="100" height="20" className="stroke-red-900 fill-red-950/30" />
                    <text x="60" y="24" className="fill-red-500 text-[10px] font-bold" textAnchor="middle" stroke="none">ILLEGAL_OP</text>
                    <rect x="160" y="10" width="60" height="20" className="stroke-red-600 fill-red-950/50" strokeWidth="2"/>
                    <text x="190" y="24" className="fill-red-400 text-[10px] font-bold" textAnchor="middle" stroke="none">INT 6</text>
                    <rect x="270" y="10" width="170" height="20" className="stroke-red-900 fill-red-950/30" />
                    <text x="355" y="24" className="fill-red-500 text-[10px] font-bold" textAnchor="middle" stroke="none">ISA VALIDATION FAILURE</text>
                    <path d="M 110 20 L 160 20 M 220 20 L 270 20" className="stroke-red-600" strokeWidth="2" strokeDasharray="6 4" />
                    <circle cx="135" cy="20" r="6" className="fill-red-900 stroke-red-500" strokeWidth="1" />
                    <text x="135" y="23" className="fill-black text-[10px] font-bold" textAnchor="middle" stroke="none">!</text>
                  </svg>
                </div>
              )}

              {telemetryTag.includes("SEQUENTIAL") && (
                <div className="border border-emerald-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-emerald-800 mb-2 tracking-widest">NATIVE_SCALAR_EXECUTION (BIU/EU_OVERLAP)</div>
                  <svg className="w-full h-12" viewBox="0 0 450 40" fill="none" stroke="currentColor">
                    <rect x="10" y="10" width="80" height="20" className="stroke-emerald-900 fill-emerald-950/30" strokeDasharray="4 2"/>
                    <text x="50" y="24" className="fill-emerald-700 text-[10px]" textAnchor="middle" stroke="none">BIU PREFETCH</text>
                    
                    <rect x="115" y="10" width="90" height="20" className="stroke-emerald-700 fill-black" />
                    <line x1="130" y1="10" x2="130" y2="30" className="stroke-emerald-900" />
                    <line x1="145" y1="10" x2="145" y2="30" className="stroke-emerald-900" />
                    <line x1="160" y1="10" x2="160" y2="30" className="stroke-emerald-900" />
                    <line x1="175" y1="10" x2="175" y2="30" className="stroke-emerald-900" />
                    <line x1="190" y1="10" x2="190" y2="30" className="stroke-emerald-900" />
                    <text x="160" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">6B QUEUE</text>

                    <rect x="230" y="10" width="70" height="20" className="stroke-emerald-600 fill-emerald-950/30" />
                    <text x="265" y="24" className="fill-emerald-500 text-[10px]" textAnchor="middle" stroke="none">DECODE</text>
                    
                    <rect x="325" y="10" width="115" height="20" className="stroke-emerald-500 fill-emerald-950/50" strokeWidth="2"/>
                    <text x="382.5" y="24" className="fill-emerald-400 text-[10px] font-bold" textAnchor="middle" stroke="none">EU EXECUTE</text>
                    
                    <path d="M 90 20 L 115 20 M 205 20 L 230 20 M 300 20 L 325 20" className="stroke-emerald-800" strokeWidth="2" />
                  </svg>
                </div>
              )}

              {telemetryTag.includes("HEAVY") && (
                <div className="border border-amber-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-amber-800 mb-2 tracking-widest">MICROCODE_SEQUENCER (COMPLEX_ALU_LOOP)</div>
                  <svg className="w-full h-14" viewBox="0 0 450 50" fill="none" stroke="currentColor">
                    <rect x="20" y="10" width="70" height="20" className="stroke-emerald-900 fill-emerald-950/30" />
                    <text x="55" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">REGISTERS</text>
                    
                    <rect x="120" y="10" width="100" height="20" className="stroke-amber-600 fill-amber-950/30" strokeWidth="2" />
                    <text x="170" y="24" className="fill-amber-500 text-[10px] font-bold" textAnchor="middle" stroke="none">MICROCODE ROM</text>
                    
                    <rect x="250" y="10" width="80" height="20" className="stroke-amber-600 fill-amber-950/30" strokeWidth="2" />
                    <text x="290" y="24" className="fill-amber-500 text-[10px] font-bold" textAnchor="middle" stroke="none">EXECUTION</text>
                    
                    <rect x="360" y="10" width="60" height="20" className="stroke-emerald-900 fill-emerald-950/30" />
                    <text x="390" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">WRITE</text>
                    
                    <path d="M 90 20 L 120 20 M 220 20 L 250 20 M 330 20 L 360 20" className="stroke-amber-700" strokeWidth="2" />
                    
                    <path d="M 290 30 L 290 40 L 170 40 L 170 31" className="stroke-amber-500" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
                    <polygon points="167,34 170,30 173,34" className="fill-amber-500 stroke-none" />
                    <text x="230" y="48" className="fill-amber-500 text-[7px] tracking-widest font-bold" textAnchor="middle" stroke="none">MULTI-CYCLE FEEDBACK</text>
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
                    <text x="262.5" y="24" className="fill-red-500 text-[10px] font-bold" textAnchor="middle" stroke="none">PREFETCH REFILL</text>
                    <rect x="340" y="10" width="80" height="20" className="stroke-emerald-500" strokeWidth="2" />
                    <text x="380" y="24" className="fill-emerald-500 text-[10px] font-bold" textAnchor="middle" stroke="none">NEW FETCH</text>
                    <path d="M 90 20 L 105 20 M 185 20 L 200 20 M 325 20 L 340 20" className="stroke-emerald-800" strokeWidth="2" />
                  </svg>
                </div>
              )}

              {telemetryTag.includes("STACK") && (
                <div className="border border-indigo-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-indigo-800 mb-2 tracking-widest">DEDICATED_STACK_ENGINE (SS:SP_HARDWARE)</div>
                  <svg className="w-full h-12" viewBox="0 0 450 40" fill="none" stroke="currentColor">
                    <rect x="50" y="10" width="90" height="20" className="stroke-indigo-600 fill-indigo-950/30" />
                    <text x="95" y="24" className="fill-indigo-500 text-[10px] font-bold" textAnchor="middle" stroke="none">SP REG (±2)</text>
                    
                    <rect x="200" y="10" width="50" height="20" className="stroke-indigo-800 fill-indigo-950/30" strokeDasharray="2 2"/>
                    <text x="225" y="24" className="fill-indigo-600 text-[10px]" textAnchor="middle" stroke="none">BIU</text>
                    
                    <rect x="310" y="10" width="90" height="20" className="stroke-indigo-500 fill-indigo-950/50" strokeWidth="2"/>
                    <text x="355" y="24" className="fill-indigo-400 text-[10px] font-bold" textAnchor="middle" stroke="none">LIFO STACK</text>
                    
                    <path d="M 140 16 L 200 16 M 250 16 L 310 16" className="stroke-indigo-600" strokeWidth="2" />
                    <path d="M 200 24 L 140 24 M 310 24 L 250 24" className="stroke-indigo-600" strokeWidth="2" strokeDasharray="2 2" />
                  </svg>
                </div>
              )}

              {(telemetryTag.includes("MEMORY") || telemetryTag.includes("BUS")) && (
                <div className="border border-amber-900/30 p-2 bg-black mt-4">
                  <div className="text-[8px] text-amber-800 mb-2 tracking-widest">BUS_INTERFACE_UNIT (BIU_IO)</div>
                  <svg className="w-full h-12" viewBox="0 0 450 40" fill="none" stroke="currentColor">
                    <rect x="50" y="10" width="80" height="20" className="stroke-emerald-900" />
                    <text x="90" y="24" className="fill-emerald-700 text-[10px]" textAnchor="middle" stroke="none">CPU ALU</text>
                    <rect x="270" y="10" width="80" height="20" className="stroke-amber-600 fill-amber-950/30" strokeWidth="2" />
                    <text x="310" y="24" className="fill-amber-500 text-[10px] font-bold" textAnchor="middle" stroke="none">EXTERNAL RAM</text>
                    <path d="M 130 18 L 270 18 M 270 22 L 130 22" className="stroke-amber-700" strokeWidth="2" />
                    <circle cx="200" cy="20" r="6" className="fill-amber-500 stroke-none" />
                    <text x="200" y="12" className="fill-amber-500 text-[8px]" textAnchor="middle" stroke="none">BUS WAIT-STATE</text>
                  </svg>
                </div>
              )}

              {(telemetryTag.includes("OPTIMAL") || telemetryTag.includes("STANDARD")) && !telemetryTag.includes("HEAVY") && !telemetryTag.includes("SEQUENTIAL") && (
                <div className="border border-emerald-900/50 p-2 bg-black mt-4">
                  <div className="text-[8px] text-emerald-700 mb-2 tracking-widest">EXECUTION_UNIT (NATIVE_SILICON)</div>
                  <svg className="w-full h-12" viewBox="0 0 450 40" fill="none" stroke="currentColor">
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
            <div className="bg-emerald-900 text-black px-2 py-1 text-xs font-bold">MEMORY_TRACE_BUFFER</div>
            <div className="p-2 text-xs grid grid-cols-12 gap-2 text-emerald-700 border-b border-emerald-950 mb-2">
              <div className="col-span-2">LINE</div>
              <div className="col-span-6">OPCODE</div>
              <div className="col-span-4 text-right">CYCLES</div>
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