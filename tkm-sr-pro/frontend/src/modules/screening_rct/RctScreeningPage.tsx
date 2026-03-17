import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Activity, Check, X, AlertCircle, Loader2, RefreshCw, Database } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../store/useProjectStore';

interface LitRecord {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  year: number;
  pmid: string;
  source_db: string;
}

interface Prediction {
  is_rct: boolean;
  confidence: number;
  exclusion_reason: string | null;
  explanation: string;
  highlighted_sentences: string[];
  status: 'pending' | 'include' | 'exclude' | 'loading';
}

export default function RctScreeningPage() {
  const [records, setRecords] = useState<LitRecord[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [screeningCount, setScreeningCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'high' | 'review'>('high');
  const { currentProjectId } = useProjectStore();

  const loadPendingRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
      const response = await apiClient.get(`/search/screening_pending/${params}`);
      const recs: LitRecord[] = response.data.records;
      setRecords(recs);
      setScreeningCount(response.data.count);
      // Initialize all as loading
      const initPreds: Record<string, Prediction> = {};
      recs.forEach(r => { initPreds[r.id] = { is_rct: false, confidence: 0, explanation: '', highlighted_sentences: [], exclusion_reason: null, status: 'loading' }; });
      setPredictions(initPreds);
      // Auto-predict each record sequentially
      for (const rec of recs) {
        try {
          const res = await apiClient.post('/search/rct_predict/', {
            title: rec.title,
            abstract: rec.abstract || '',
            keywords: '',
          });
          setPredictions((prev: Record<string, Prediction>) => ({
            ...prev,
            [rec.id]: { ...res.data, status: 'pending' }
          }));
        } catch {
          setPredictions((prev: Record<string, Prediction>) => ({
            ...prev,
            [rec.id]: { is_rct: false, confidence: 0, explanation: 'AI 예측 실패', highlighted_sentences: [], exclusion_reason: null, status: 'pending' }
          }));
        }
      }
    } catch (e) {
      console.error(e);
      alert('스크리닝 대기 문헌을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingRecords(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    loadPendingRecords();
  }, [loadPendingRecords]);

  const handleDecision = async (id: string, decision: 'include' | 'exclude') => {
    // Optimistic UI update
    setPredictions((prev: Record<string, Prediction>) => ({ ...prev, [id]: { ...prev[id], status: decision } }));
    try {
      await apiClient.post('/search/rct_decision/', { record_id: id, decision });
    } catch (e) {
      console.error(e);
      // Revert on failure
      setPredictions((prev: Record<string, Prediction>) => ({ ...prev, [id]: { ...prev[id], status: 'pending' } }));
      alert('저장에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
      const response = await apiClient.get(`/search/export_rct_screening/${params}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RCT_Screening_List_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('엑셀 내보내기 중 오류가 발생했습니다.');
    }
  };

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return <span>{text}</span>;
    let result = text;
    highlights.forEach(h => {
      if (!h) return;
      const regex = new RegExp(`(${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
    });
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  const predValues = Object.values(predictions) as Prediction[];
  const includedCount = predValues.filter(p => p.status === 'include').length;
  const excludedCount = predValues.filter(p => p.status === 'exclude').length;
  const pendingCount = predValues.filter(p => p.status === 'pending' || p.status === 'loading').length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <FileCheck className="text-tkm-main" size={32} />
            RCT Auto Classification
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            메타데이터(제목, 초록)를 기반으로 RCT 여부를 자동 감별하고, 판단 근거를 하이라이팅하여 연구자의 확정을 보조합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPendingRecords}
            disabled={isLoadingRecords}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoadingRecords ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
          >
            <Database size={20} />
            엑셀로 내보내기 (.xlsx)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1"><Database size={16} className="text-blue-600" /></div>
          <div className="text-2xl font-black text-blue-700">{screeningCount}</div>
          <div className="text-xs text-blue-600 font-semibold mt-1">Total Pending</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-yellow-700">{pendingCount}</div>
          <div className="text-xs text-yellow-600 font-semibold mt-1">Awaiting Decision</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-green-700">{includedCount}</div>
          <div className="text-xs text-green-600 font-semibold mt-1">Included (RCT)</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-red-700">{excludedCount}</div>
          <div className="text-xs text-red-600 font-semibold mt-1">Excluded</div>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('high')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'high' 
            ? 'border-tkm-main text-tkm-main' 
            : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          AI 강력 추천 (Confidence ≥ 90%)
          <span className="ml-2 bg-tkm-light text-tkm-main px-2 py-0.5 rounded-full text-xs">
            {records.filter(r => predictions[r.id]?.is_rct && predictions[r.id]?.confidence >= 0.9).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'review' 
            ? 'border-tkm-main text-tkm-main' 
            : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          정밀 검토 필요 (기타)
          <span className="ml-2 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
            {records.length - records.filter(r => predictions[r.id]?.is_rct && predictions[r.id]?.confidence >= 0.9).length}
          </span>
        </button>
      </div>

      {isLoadingRecords && records.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" />
          <p>DB에서 스크리닝 대기 문헌을 불러오고 있습니다...</p>
        </div>
      )}

      {!isLoadingRecords && records.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileCheck size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold">스크리닝 대기 문헌이 없습니다.</p>
          <p className="text-sm mt-2">Dedup 페이지에서 중복 제거를 먼저 실행해 주세요.</p>
        </div>
      )}

      <div className="space-y-6">
        {records
          .filter(r => {
            const isHigh = (predictions[r.id]?.is_rct && predictions[r.id]?.confidence >= 0.9);
            return activeTab === 'high' ? isHigh : !isHigh;
          })
          .map((rec: LitRecord) => {
          const pred = predictions[rec.id];
          const isIncluded = pred?.status === 'include';
          const isExcluded = pred?.status === 'exclude';
          const isLoading = pred?.status === 'loading';

          return (
            <div key={rec.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${
              isIncluded ? 'border-green-300 ring-1 ring-green-100' :
              isExcluded ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
            }`}>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    pred?.is_rct ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : (pred?.confidence * 100).toFixed(0)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        rec.source_db === 'PubMed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{rec.source_db}</span>
                      <span className="text-xs text-gray-400">{rec.year}</span>
                      {rec.pmid && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">PMID: {rec.pmid}</span>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">{rec.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{rec.authors}</p>
                  </div>

                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={() => handleDecision(rec.id, 'exclude')}
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                        isExcluded ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600'
                      }`}
                      title="Exclude"
                    >
                      <X size={24} />
                    </button>
                    <button
                      onClick={() => handleDecision(rec.id, 'include')}
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                        isIncluded ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-green-200 hover:text-green-600'
                      }`}
                      title="Include"
                    >
                      <Check size={24} />
                    </button>
                  </div>
                </div>

                {!isLoading && pred && (
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="text-xs font-black text-gray-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} /> AI 추출 근거 및 분석
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed font-sans">
                        {highlightText(rec.abstract || '', pred.highlighted_sentences)}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex gap-4">
                        <span className="font-bold">🎯 판단 근거:</span>
                        <p>{pred.explanation}</p>
                      </div>
                    </div>
                    {pred.exclusion_reason && (
                      <div className="w-64 bg-red-50 rounded-xl p-4 border border-red-100">
                        <div className="text-xs font-black text-red-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle size={12} /> 배제 사유 (예상)
                        </div>
                        <p className="text-sm font-bold text-red-700">{pred.exclusion_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
