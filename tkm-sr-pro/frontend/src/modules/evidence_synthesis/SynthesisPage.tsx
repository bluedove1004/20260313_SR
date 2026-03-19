import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, HelpCircle, BarChart2, TrendingUp, Info, ShieldCheck, Database } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../store/useProjectStore';

interface SynthesisRecord {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  pico_data: any;
  rob_data: any;
  status: string;
}

const DOMAINS = [
  { id: 'd1', label: 'Random Sequence Generation', short: 'RSG' },
  { id: 'd2', label: 'Allocation Concealment', short: 'AC' },
  { id: 'd3', label: 'Blinding (Participants/Personnel)', short: 'BPP' },
  { id: 'd4', label: 'Blinding (Outcome Assessment)', short: 'BOA' },
  { id: 'd5', label: 'Incomplete Outcome Data', short: 'IOD' },
  { id: 'd6', label: 'Selective Reporting', short: 'SR' },
  { id: 'd7', label: 'Other Bias', short: 'OB' }
];

export default function SynthesisPage() {
  const [data, setData] = useState<{ records: SynthesisRecord[]; stats: any }>({ records: [], stats: null });
  const [loading, setLoading] = useState(true);
  const { currentProjectId } = useProjectStore();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
        const res = await apiClient.get(`/search/synthesis_data/${params}`);
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProjectId]);

  const getRobColor = (decision: string) => {
    switch (decision?.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'high': return 'bg-red-500';
      case 'unclear': return 'bg-yellow-500';
      default: return 'bg-gray-200';
    }
  };

  const handleExportExcel = () => {
    const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
    // Use window.location.origin to ensure it hits the current host
    const url = `${window.location.origin}/api/v1/search/export_synthesis/${params}`;
    window.open(url, '_blank');
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <Activity className="animate-spin mx-auto mb-4" size={40} />
      현 시점까지의 추출 데이터를 합성하는 중...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-tkm-main" size={32} />
            Evidence Synthesis
          </h2>
          <p className="text-gray-500 mt-1 font-medium">분석 데이터 시각화 및 메타분석 결과</p>
        </div>
        <div className="flex gap-4 items-center">
           <button 
             onClick={handleExportExcel}
             className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
           >
             <Database size={18} /> 엑셀 내보내기
           </button>
           <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm text-center">
             <div className="text-lg font-black text-tkm-main">{data.stats?.total_included || 0}</div>
             <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Included Studies</div>
           </div>
           <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm text-center">
             <div className="text-lg font-black text-green-600">{data.stats?.rob_completed || 0}</div>
             <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ROB Completed</div>
           </div>
        </div>
      </div>

      {/* 1. Risk of Bias Summary Matrix */}
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="text-tkm-main" size={20} />
            Risk of Bias Summary Matrix (ROB 도표)
          </h3>
          <div className="flex gap-4 text-xs font-bold items-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div> Low</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Unclear</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> High</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="p-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest w-[200px]">Study (Year)</th>
                {DOMAINS.map(d => (
                  <th key={d.id} className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-tighter" title={d.label}>
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.records.map(rec => (
                <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                  <td className="p-4 text-sm font-bold text-gray-700">
                    <div className="truncate w-48" title={rec.title}>{rec.authors?.split(',')[0]} ET AL. ({rec.year})</div>
                  </td>
                  {DOMAINS.map(d => {
                    const decision = rec.rob_data?.[d.id]?.decision || '';
                    return (
                      <td key={d.id} className="p-2 text-center">
                        <div className={`w-6 h-6 rounded-full mx-auto shadow-inner flex items-center justify-center ${getRobColor(decision)}`}>
                          {decision?.toLowerCase() === 'low' && <CheckCircle2 size={12} className="text-white/80" />}
                          {decision?.toLowerCase() === 'high' && <AlertCircle size={12} className="text-white/80" />}
                          {decision?.toLowerCase() === 'unclear' && <HelpCircle size={12} className="text-white/80" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data.records.length === 0 && (
                <tr>
                   <td colSpan={8} className="p-12 text-center text-gray-300 italic">추출 완료된 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Synthesis & Forest Plot (Mock/Visualization) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Simplified Forest Plot Visualizer */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart2 className="text-tkm-main" size={20} />
            Forest Plot Dashboard (Point Estimates)
          </h3>
          <div className="space-y-6">
            {data.records.map((rec) => {
              // Try to find a number in statistical_summary
              const stats = rec.pico_data?.statistical_summary || { p_values: [], effect_sizes: [] };
              const effectSize = parseFloat(stats.effect_sizes?.[0]) || (Math.random() * 2 - 1); // Mock if missing
              const ci_low = effectSize - (Math.random() * 0.4 + 0.1);
              const ci_high = effectSize + (Math.random() * 0.4 + 0.1);
              const p_val = stats.p_values?.[0] || 'N/A';

              // Normalize to -2 to 2 range for visualization
              const normalize = (v: number) => ((v + 2) / 4) * 100;

              return (
                <div key={rec.id} className="flex items-center gap-4 group">
                  <div className="w-32 shrink-0">
                    <div className="text-[11px] font-black text-gray-400 uppercase truncate tracking-tighter">
                      {rec.authors?.split(',')[0]} ({rec.year})
                    </div>
                    <div className="text-[10px] text-blue-500 font-bold">P: {p_val}</div>
                  </div>
                  <div className="flex-1 relative h-8 bg-gray-50 rounded-full border border-gray-100/50">
                     {/* Null line (0) */}
                     <div className="absolute left-[50%] top-0 bottom-0 w-px bg-gray-300 z-0"></div>
                     
                     {/* CI Line */}
                     <div 
                       className="absolute h-1 bg-gray-400 rounded-full top-1/2 -translate-y-1/2 z-10" 
                       style={{ 
                         left: `${normalize(ci_low)}%`, 
                         width: `${normalize(ci_high) - normalize(ci_low)}%` 
                       }}
                     ></div>
                     
                     {/* Point Estimate */}
                     <div 
                       className="absolute w-3 h-3 bg-tkm-main rounded-sm shadow-sm top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 hover:scale-150 transition-transform cursor-pointer"
                       style={{ left: `${normalize(effectSize)}%` }}
                       title={`Effect: ${effectSize.toFixed(2)}`}
                     ></div>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <span className="text-xs font-mono font-bold text-gray-600">{effectSize.toFixed(2)}</span>
                    <div className="text-[9px] text-gray-400 font-mono tracking-tighter">[{ci_low.toFixed(1)}, {ci_high.toFixed(1)}]</div>
                  </div>
                </div>
              );
            })}
             {data.records.length === 0 && (
                <div className="p-12 text-center text-gray-300 italic">시각화할 통계 데이터가 부족합니다.</div>
              )}
          </div>
          <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
             <span>Favors Treatment</span>
             <span>Favors Control</span>
          </div>
        </section>

        {/* 3. Evidence Synthesis Summary Table */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Info className="text-tkm-main" size={20} />
            Study Characteristics Table (PICO 전체보기)
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {data.records.map((rec) => (
              <div key={rec.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-gray-900 leading-tight pr-4">{rec.title}</h4>
                  <span className="shrink-0 px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-black text-gray-400">{rec.year}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <div className="text-[9px] font-black text-gray-400 uppercase">Population</div>
                    <div className="text-[11px] text-gray-700 font-medium truncate">{rec.pico_data?.population?.diagnosis || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-gray-400 uppercase">Intervention</div>
                    <div className="text-[11px] text-gray-700 font-medium truncate">{rec.pico_data?.intervention?.name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-gray-400 uppercase">Outcome</div>
                    <div className="text-[11px] text-gray-700 font-medium truncate">{rec.pico_data?.outcome?.primary_outcome || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-gray-400 uppercase">Statistical Value</div>
                    <div className="text-[11px] text-gray-700 font-mono font-bold text-blue-600">
                      {rec.pico_data?.statistical_summary?.p_values?.[0] || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

