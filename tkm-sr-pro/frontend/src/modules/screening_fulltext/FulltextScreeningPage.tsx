import { useState, useEffect, useCallback } from 'react';
import {
  FileSearch, CheckCircle2, XCircle, AlertTriangle, Loader2,
  RefreshCw, ChevronDown, ChevronUp, Sparkles, StickyNote,
  Check, X, Shield, ShieldOff, Info
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface LitRecord {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  year: number;
  pmid: string;
  doi: string;
  source_db: string;
  status: string;
  exclusion_reason: string | null;
  reviewer_notes: string | null;
}

interface CriterionResult {
  criterion_id: string;
  label: string;
  type: string;
  met: boolean;
  confidence: number;
  evidence: string;
}

interface ScreenResult {
  eligible: boolean;
  overall_confidence: number;
  recommendation: 'INCLUDE' | 'EXCLUDE' | 'UNCERTAIN';
  exclusion_reason: string | null;
  criteria_results: CriterionResult[];
  summary: string;
}

interface RecordState {
  screening: ScreenResult | null;
  isScreening: boolean;
  isOpen: boolean;
  fullText: string;
  decisionStatus: string; // current saved status
  notes: string;
  excludeReason: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  RCT_INCLUDED:       { label: 'RCT 확정', cls: 'bg-purple-100 text-purple-700' },
  FULLTEXT_INCLUDED:  { label: '원문 포함', cls: 'bg-green-100 text-green-700' },
  FULLTEXT_EXCLUDED:  { label: '원문 제외', cls: 'bg-red-100 text-red-700' },
};

const RECOM_STYLE: Record<string, string> = {
  INCLUDE:  'bg-green-50 border-green-300 text-green-800',
  EXCLUDE:  'bg-red-50 border-red-300 text-red-800',
  UNCERTAIN:'bg-yellow-50 border-yellow-300 text-yellow-800',
};

export default function FulltextScreeningPage() {
  const [records, setRecords] = useState<LitRecord[]>([]);
  const [states, setStates] = useState<Record<string, RecordState>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/search/fulltext_eligible/');
      const recs: LitRecord[] = res.data.records;
      setRecords(recs);
      const init: Record<string, RecordState> = {};
      recs.forEach(r => {
        init[r.id] = {
          screening: null, isScreening: false, isOpen: false,
          fullText: '', decisionStatus: r.status,
          notes: r.reviewer_notes || '',
          excludeReason: r.exclusion_reason || '',
        };
      });
      setStates(init);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleAiScreen = async (rec: LitRecord) => {
    setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], isScreening: true, isOpen: true } }));
    try {
      const res = await apiClient.post('/search/fulltext_screen/', {
        title: rec.title,
        abstract: rec.abstract || '',
        full_text: states[rec.id]?.fullText || '',
      });
      setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], screening: res.data, isScreening: false } }));
    } catch {
      setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], isScreening: false } }));
      alert('AI 선별 분석 중 오류가 발생했습니다.');
    }
  };

  const handleDecision = async (rec: LitRecord, decision: 'include' | 'exclude') => {
    const st = states[rec.id];
    try {
      await apiClient.post('/search/fulltext_decision/', {
        record_id: rec.id,
        decision,
        exclusion_reason: decision === 'exclude' ? st.excludeReason : '',
        reviewer_notes: st.notes,
      });
      const newStatus = decision === 'include' ? 'FULLTEXT_INCLUDED' : 'FULLTEXT_EXCLUDED';
      setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], decisionStatus: newStatus } }));
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, status: newStatus } : r));
    } catch {
      alert('저장에 실패했습니다.');
    }
  };

  const included = records.filter(r => states[r.id]?.decisionStatus === 'FULLTEXT_INCLUDED').length;
  const excluded = records.filter(r => states[r.id]?.decisionStatus === 'FULLTEXT_EXCLUDED').length;
  const pending  = records.length - included - excluded;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <FileSearch className="text-tkm-main" size={32} />
            원문 선별 보조 (Full-text Eligibility Screening)
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            CONSORT/PRISMA 기준에 따라 각 포함·배제 기준을 자동 점검하고 연구자의 최종 판단을 보조합니다.
          </p>
        </div>
        <button onClick={loadRecords} disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50">
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체 대상', value: records.length, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: '심사 대기', value: pending,          cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: '원문 포함', value: included,         cls: 'bg-green-50 border-green-200 text-green-700' },
          { label: '원문 제외', value: excluded,         cls: 'bg-red-50 border-red-200 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.cls}`}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" />
          <p>원문 선별 대상 논문을 불러오는 중...</p>
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileSearch size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">원문 선별 대상 논문이 없습니다.</p>
          <p className="text-sm mt-2">RCT Screening 페이지에서 Include 판정된 논문이 여기에 표시됩니다.</p>
        </div>
      )}

      <div className="space-y-6">
        {records.map(rec => {
          const st = states[rec.id];
          if (!st) return null;
          const badge = STATUS_BADGE[st.decisionStatus] || STATUS_BADGE['RCT_INCLUDED'];
          const isFinal = st.decisionStatus === 'FULLTEXT_INCLUDED' || st.decisionStatus === 'FULLTEXT_EXCLUDED';

          return (
            <div key={rec.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${
              st.decisionStatus === 'FULLTEXT_INCLUDED' ? 'border-green-300 ring-1 ring-green-100' :
              st.decisionStatus === 'FULLTEXT_EXCLUDED' ? 'border-red-200 opacity-80' : 'border-gray-200'
            }`}>
              {/* ── Card Top ── */}
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        rec.source_db === 'PubMed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{rec.source_db}</span>
                      <span className="text-xs text-gray-400">{rec.year}</span>
                      {rec.pmid && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">PMID: {rec.pmid}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{rec.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{rec.authors}</p>
                  </div>

                  {/* AI Screen Button */}
                  <button
                    onClick={() => handleAiScreen(rec)}
                    disabled={st.isScreening}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-tkm-main hover:bg-tkm-dark text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {st.isScreening ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {st.isScreening ? 'AI 분석 중...' : 'AI 선별 기준 점검'}
                  </button>
                </div>

                {/* Abstract */}
                {rec.abstract && (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed line-clamp-3">{rec.abstract}</div>
                )}

                {/* Full text input */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    원문 본문 입력 (Methods / Results 붙여넣기 시 AI 분석 정확도 향상)
                  </label>
                  <textarea
                    value={st.fullText}
                    onChange={e => setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], fullText: e.target.value } }))}
                    rows={2}
                    placeholder="원문 관련 텍스트를 이곳에 붙여넣으세요..."
                    className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 resize-none focus:ring-2 focus:ring-tkm-main outline-none"
                  />
                </div>
              </div>

              {/* ── AI Screening Result ── */}
              {st.screening && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], isOpen: !st.isOpen } }))}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={15} className="text-tkm-main" />
                      <span>AI 포함·배제 기준 점검 결과</span>
                      {/* Summary pill */}
                      <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${RECOM_STYLE[st.screening.recommendation]}`}>
                        {st.screening.recommendation === 'INCLUDE' ? '✅ 포함 권장' :
                         st.screening.recommendation === 'EXCLUDE' ? '❌ 제외 권장' : '⚠️ 검토 필요'}
                        {' '}({(st.screening.overall_confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    {st.isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {st.isOpen && (
                    <div className="px-5 pb-4 space-y-4">
                      {/* Summary */}
                      <div className={`rounded-xl border p-3 text-sm font-medium ${RECOM_STYLE[st.screening.recommendation]}`}>
                        <Info size={14} className="inline mr-1.5" />{st.screening.summary}
                      </div>

                      {/* Criteria checklist */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">포함·배제 기준 체크리스트</div>
                        {st.screening.criteria_results.map(cr => {
                          const isInclusion = cr.type === 'inclusion';
                          const isGood = isInclusion ? cr.met : !cr.met; // met inclusion = good; NOT met exclusion = good
                          return (
                            <div key={cr.criterion_id}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                                isGood ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                              <div className="shrink-0 mt-0.5">
                                {isGood
                                  ? <CheckCircle2 size={17} className="text-green-600" />
                                  : <XCircle size={17} className="text-red-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                    isInclusion ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isInclusion ? <Shield size={10} className="inline mr-0.5" /> : <ShieldOff size={10} className="inline mr-0.5" />}
                                    {isInclusion ? '포함 기준' : '배제 기준'}
                                  </span>
                                  <span className="font-semibold text-gray-800">{cr.label}</span>
                                  <span className="text-gray-400 text-xs ml-auto">신뢰도 {(cr.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 font-mono">{cr.evidence}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Researcher Decision Panel ── */}
              <div className="border-t border-gray-100 p-5 space-y-3">
                <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <StickyNote size={15} /> 연구자 최종 판정
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Exclusion reason (shown when excluding) */}
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">배제 사유 (제외 시 필수)</label>
                    <input
                      type="text"
                      value={st.excludeReason}
                      onChange={e => setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], excludeReason: e.target.value } }))}
                      placeholder="예: 동물실험, RCT 설계 미흡, 원문 열람 불가..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-tkm-main outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">검토자 메모 (선택)</label>
                    <input
                      type="text"
                      value={st.notes}
                      onChange={e => setStates(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], notes: e.target.value } }))}
                      placeholder="추가 메모..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-tkm-main outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision(rec, 'include')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                      st.decisionStatus === 'FULLTEXT_INCLUDED'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <Check size={17} /> 포함 (Include)
                    {st.decisionStatus === 'FULLTEXT_INCLUDED' && <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded">✓ 저장됨</span>}
                  </button>
                  <button
                    onClick={() => handleDecision(rec, 'exclude')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                      st.decisionStatus === 'FULLTEXT_EXCLUDED'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <X size={17} /> 제외 (Exclude)
                    {st.decisionStatus === 'FULLTEXT_EXCLUDED' && <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded">✓ 저장됨</span>}
                  </button>
                </div>

                {isFinal && (
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${
                    st.decisionStatus === 'FULLTEXT_INCLUDED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {st.decisionStatus === 'FULLTEXT_INCLUDED'
                      ? <><CheckCircle2 size={13} /> DB에 &apos;원문 포함&apos; 상태로 저장되었습니다.</>
                      : <><AlertTriangle size={13} /> DB에 &apos;원문 제외&apos; 상태로 저장되었습니다. {st.excludeReason && `(사유: ${st.excludeReason})`}</>}
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
