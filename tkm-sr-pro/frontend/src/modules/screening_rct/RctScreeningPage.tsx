import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Activity, Check, X, AlertCircle, Loader2, RefreshCw, Database } from 'lucide-react';
import { apiClient } from '../../api/client';

interface LitRecord {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  year: number;
  pmid: string;
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

  const loadPendingRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const response = await apiClient.get('/search/screening_pending/');
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
  }, []);

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
        <button
          onClick={loadPendingRecords}
          disabled={isLoadingRecords}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoadingRecords ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Summary Bar */}
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
        {records.map((rec: LitRecord) => {
          const pred = predictions[rec.id];
          if (!pred) return null;
          const isLoading = pred.status === 'loading';
          const isAutoExcluded = !pred.is_rct && pred.confidence > 0.90;

          return (
            <div key={rec.id} className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${
              pred.status === 'include' ? 'border-green-400 ring-2 ring-green-100' :
              pred.status === 'exclude' ? 'border-red-400 ring-2 ring-red-100 opacity-70' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-4 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">{rec.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500">{rec.authors} ({rec.year}) {rec.pmid && <span className="ml-2 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">PMID: {rec.pmid}</span>}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl text-sm leading-relaxed text-gray-700 line-clamp-4">
                    {pred.highlighted_sentences?.length > 0
                      ? highlightText(rec.abstract, pred.highlighted_sentences)
                      : rec.abstract}
                  </div>

                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
                      <Loader2 size={16} className="animate-spin" /> AI 분류 모델 분석 중...
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg border text-sm ${pred.is_rct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2 font-bold mb-1" style={{ color: pred.is_rct ? '#166534' : '#991b1b' }}>
                        <Activity size={16} />
                        AI 판별 결과 — Confidence: <span className="font-mono">{(pred.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ color: pred.is_rct ? '#166534' : '#7f1d1d' }}>
                        <strong>Prediction:</strong> {pred.is_rct ? '✅ Likely RCT' : '❌ Not RCT'}<br />
                        {pred.exclusion_reason && <><strong>Exclusion Reason:</strong> {pred.exclusion_reason}<br /></>}
                        <strong>Explanation:</strong> {pred.explanation}
                      </div>
                    </div>
                  )}
                </div>

                {/* Decision Buttons */}
                <div className="w-44 flex flex-col gap-3 shrink-0">
                  <div className="text-center text-sm font-semibold text-gray-500 mb-1">연구자 최종 판단</div>
                  <button
                    onClick={() => handleDecision(rec.id, 'include')}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors disabled:opacity-30 ${
                      pred.status === 'include' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <Check size={18} /> Include
                  </button>
                  <button
                    onClick={() => handleDecision(rec.id, 'exclude')}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors disabled:opacity-30 ${
                      pred.status === 'exclude' ? 'bg-red-600 text-white shadow-md' :
                      isAutoExcluded && pred.status === 'pending' ? 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100' :
                      'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <X size={18} /> Exclude
                  </button>
                  {isAutoExcluded && pred.status === 'pending' && (
                    <div className="text-xs text-red-500 flex items-start gap-1">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      AI 강제 배제 권장 (≥90%)
                    </div>
                  )}
                  {pred.status === 'include' && (
                    <div className="text-xs text-green-600 font-bold text-center bg-green-50 rounded-lg py-1">✓ DB 저장됨</div>
                  )}
                  {pred.status === 'exclude' && (
                    <div className="text-xs text-red-500 font-bold text-center bg-red-50 rounded-lg py-1">✗ DB 저장됨</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
