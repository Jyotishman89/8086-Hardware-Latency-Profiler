import React, { useState } from 'react';
import { Terminal, Cpu, Zap, Activity } from 'lucide-react';

const formatInsight = (insightText) => {
  if (!insightText) return null;
  
  const match = insightText.match(/^\[(.*?)\]\s*(.*)$/);
  
  if (!match) {
    return <p className="text-slate-300 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">"{insightText}"</p>;
  }

  const tag = match[1];
  const message = match[2];

  let tagColor = "text-cyan-400 border-cyan-400/30 bg-cyan-400/10"; 
  
  const upperTag = tag.toUpperCase();
  if (upperTag.includes('CRITICAL') || upperTag.includes('FATAL') || upperTag.includes('HAZARD')) {
    tagColor = "text-rose-400 border-rose-400/30 bg-rose-400/10 shadow-[0_0_10px_rgba(244,63,94,0.2)]";
  } 
  else if (upperTag.includes('BOUND') || upperTag.includes('SATURATION') || upperTag.includes('STALL')) {
    tagColor = "text-amber-400 border-amber-400/30 bg-amber-400/10 shadow-[0_0_10px_rgba(251,191,36,0.2)]";
  } 
  else if (upperTag.includes('OPTIMAL') || upperTag.includes('ACCELERATED') || upperTag.includes('EFFICIENT') || upperTag.includes('CLEAR')) {
    tagColor = "text-emerald-400 border-emerald-400/30 bg-emerald-400/10 shadow-[0_0_10px_rgba(52,211,153,0.2)]";
  }

  return (
    <div className="flex flex-col gap-3 mt-1">
      <span className={`inline-block px-3 py-1 text-[11px] font-bold tracking-widest uppercase border rounded w-fit ${tagColor}`}>
        {tag}
      </span>
      <span className="text-slate-300 text-sm leading-relaxed font-mono pl-4 border-l-2 border-slate-700">
        {message}
      </span>
    </div>
  );
};

function App() {
  const [asm, setAsm] = useState('MOV AX, [BX]\nADD CX, 1\nJZ LABEL_END');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    
    const instructionArray = asm.split('\n').filter(line => line.trim() !== '');

    try {
      const response = await fetch('http://127.0.0.1:8000/predict_block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: instructionArray })
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const result = await response.json();
      setData(typeof result === 'string' ? JSON.parse(result) : result);
    } catch (err) {
      setError('Failed to connect to the heuristic engine. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="flex items-center gap-4 mb-12 border-b border-slate-800 pb-6">
        <Cpu className="text-emerald-400 w-10 h-10" />
        <h1 className="text-3xl font-bold tracking-tighter">8086_PROFILER_V2</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4 text-slate-400 uppercase text-xs tracking-widest">
            <Terminal size={16} /> Assembly Input (Multi-Line Supported)
          </div>
          <textarea 
            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-4 text-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all uppercase resize-none shadow-inner"
            value={asm}
            onChange={(e) => setAsm(e.target.value)}
            spellCheck="false"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap size={18} /> {loading ? 'ANALYZING PIPELINE...' : 'RUN_HOTSPOT_ANALYSIS'}
          </button>
          {error && <div className="mt-4 text-rose-400 text-sm">{error}</div>}
        </div>

        {data && !data.error && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
                <div className="text-slate-500 text-xs mb-2">TOTAL_PREDICTED_T_STATES</div>
                <div className="text-4xl font-bold text-emerald-400">{data.total_t_states}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="text-slate-500 text-xs mb-2">PRIMARY_BOTTLENECK</div>
                <div className="text-lg font-bold text-rose-400">Line {data.bottleneck_line}</div>
                <div className="text-sm font-semibold text-slate-200 mt-1">{data.primary_bottleneck}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 mb-4 font-bold uppercase text-xs">
                <Activity size={16} /> Optimization_Directive (Line {data.bottleneck_line})
              </div>
              
              {formatInsight(data.insight)}
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;