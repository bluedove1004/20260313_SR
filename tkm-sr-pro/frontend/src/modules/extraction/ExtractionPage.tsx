import { useState, useEffect, useCallback } from 'react';
import { Database, FileText, Activity, Loader2, ChevronDown, ChevronUp, Sparkles, CheckCircle2, RefreshCw, User, Zap, BarChart2, ClipboardList } from 'lucide-react';
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
}

interface PicoData {
  population: { sample_size: number | null; diagnosis: string | null; age_range: string | null; extracted_from: string | null };
  intervention: { name: string | null; frequency: string | null; duration: string | null; extracted_from: string | null };
  comparison: { type: string | null; extracted_from: string | null };
  outcome: { primary_outcome: string | null; measurement_scales: string[]; extracted_from: string | null };
  study_design: { blinding: string | null; allocation: string | null; design_type: string | null };
  statistical_summary: { p_values: string[]; confidence_intervals: string[]; effect_sizes: string[] };
  extraction_confidence: number;
  raw_evidence: string[];
  saved_to_db?: boolean;
}

const PICO_COLORS: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  population: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: <User size={16} /> },
  intervention: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: <Zap size={16} /> },
  comparison: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: <BarChart2 size={16} /> },
  outcome: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: <ClipboardList size={16} /> },
};

function PicoCard({ label, color, children }: { label: string; color: keyof typeof PICO_COLORS; children: React.ReactNode }) {
  const c = PICO_COLORS[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className={`flex items-center gap-2 font-bold text-sm mb-2 ${c.text}`}>
        {c.icon} {label}
      </div>
      <div className="text-gray-700 text-sm space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-[80px]">{label}:</span>
      <span className="font-semibold break-words">{String(value)}</span>
    </div>
  );
}

export default function ExtractionPage() {
  const [records, setRecords] = useState<LitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [picoResults, setPicoResults] = useState<Record<string, PicoData | null>>({});
  const [extracting, setExtracting] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [manualTexts, setManualTexts] = useState<Record<string, string>>({});

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/search/rct_included/');
      setRecords(res.data.records);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleExtract = async (rec: LitRecord) => {
    setExtracting(prev => ({ ...prev, [rec.id]: true }));
    try {
      const full_text = manualTexts[rec.id] || '';
      const res = await apiClient.post('/search/pico_extract/', {
        record_id: rec.id,
        title: rec.title,
        abstract: rec.abstract || '',
        full_text,
      });
      setPicoResults(prev => ({ ...prev, [rec.id]: res.data }));
      setExpanded(prev => ({ ...prev, [rec.id]: true }));
      if (res.data.saved_to_db) {
        setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'EXTRACTED' } : r));
      }
    } catch (e) {
      console.error(e);
      alert('PICO 추출 중 오류가 발생했습니다.');
    } finally {
      setExtracting(prev => ({ ...prev, [rec.id]: false }));
    }
  };

  const extractedCount = records.filter(r => r.status === 'EXTRACTED').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Database className="text-tkm-main" size={32} />
            원문 분석 · PICO 추출 보조
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            RCT 확정 논문의 제목·초록·원문에서 Population·Intervention·Comparison·Outcome 정보를 자동 추출합니다.
          </p>
        </div>
        <button onClick={loadRecords} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50">
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-purple-700">{records.length}</div>
          <div className="text-xs text-purple-600 font-semibold mt-1">RCT 확정 논문</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-yellow-700">{records.length - extractedCount}</div>
          <div className="text-xs text-yellow-600 font-semibold mt-1">추출 대기</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-green-700">{extractedCount}</div>
          <div className="text-xs text-green-600 font-semibold mt-1">PICO 추출 완료</div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" />
          <p>RCT 확정 논문 목록을 불러오는 중...</p>
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">추출 가능한 논문이 없습니다.</p>
          <p className="text-sm mt-2">RCT Screening 페이지에서 논문에 Include 판정을 먼저 내려주세요.</p>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-6">
        {records.map((rec) => {
          const pico = picoResults[rec.id];
          const isExtracting = extracting[rec.id];
          const isOpen = expanded[rec.id];
          const isDone = rec.status === 'EXTRACTED';

          return (
            <div key={rec.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${isDone ? 'border-green-300 ring-1 ring-green-100' : 'border-gray-200'}`}>
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        rec.source_db === 'PubMed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{rec.source_db}</span>
                      <span className="text-xs text-gray-400">{rec.year}</span>
                      {rec.pmid && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">PMID: {rec.pmid}</span>}
                      {isDone && <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} /> PICO 추출 완료</span>}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{rec.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{rec.authors}</p>
                  </div>

                  {/* Extract Button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => handleExtract(rec)}
                      disabled={isExtracting}
                      className="flex items-center gap-2 px-4 py-2.5 bg-tkm-main hover:bg-tkm-dark text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {isExtracting ? 'AI 분석 중...' : isDone ? '재추출' : 'PICO 자동 추출'}
                    </button>
                  </div>
                </div>

                {/* Abstract Preview */}
                {rec.abstract && (
                  <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 line-clamp-2 leading-relaxed">{rec.abstract}</div>
                )}

                {/* Optional Full Text Input */}
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    원문 추가 본문 (선택사항 — 복사 붙여넣기 시 추출 정확도 향상)
                  </label>
                  <textarea
                    value={manualTexts[rec.id] || ''}
                    onChange={e => setManualTexts(prev => ({ ...prev, [rec.id]: e.target.value }))}
                    placeholder="원문 Methods / Results 섹션 텍스트를 여기에 붙여넣으세요..."
                    rows={2}
                    className="w-full text-xs font-mono border border-gray-200 rounded-lg p-2 resize-none focus:ring-2 focus:ring-tkm-main outline-none bg-white"
                  />
                </div>
              </div>

              {/* PICO Results Panel */}
              {pico && (
                <div className="border-t border-gray-100">
                  {/* Confidence + Toggle */}
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [rec.id]: !isOpen }))}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Activity size={16} className="text-tkm-main" />
                      <span>AI 추출 결과 보기</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        pico.extraction_confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                        pico.extraction_confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        신뢰도 {(pico.extraction_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4">
                      {/* PICO Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PicoCard label="P — Population (대상군)" color="population">
                          <Field label="표본 수" value={pico.population.sample_size ? `N = ${pico.population.sample_size}` : null} />
                          <Field label="진단명" value={pico.population.diagnosis} />
                          <Field label="연령" value={pico.population.age_range} />
                          {pico.population.extracted_from && (
                            <div className="mt-2 text-xs text-gray-400 italic border-t border-blue-100 pt-2">근거: "{pico.population.extracted_from}"</div>
                          )}
                        </PicoCard>

                        <PicoCard label="I — Intervention (중재법)" color="intervention">
                          <Field label="처방/치료" value={pico.intervention.name} />
                          <Field label="빈도" value={pico.intervention.frequency} />
                          <Field label="기간" value={pico.intervention.duration} />
                          {pico.intervention.extracted_from && (
                            <div className="mt-2 text-xs text-gray-400 italic border-t border-purple-100 pt-2">근거: "{pico.intervention.extracted_from}"</div>
                          )}
                        </PicoCard>

                        <PicoCard label="C — Comparison (비교군)" color="comparison">
                          <Field label="대조군 유형" value={pico.comparison.type} />
                          {pico.comparison.extracted_from && (
                            <div className="mt-2 text-xs text-gray-400 italic border-t border-orange-100 pt-2">근거: "{pico.comparison.extracted_from}"</div>
                          )}
                        </PicoCard>

                        <PicoCard label="O — Outcome (결과 지표)" color="outcome">
                          <Field label="1차 결과변수" value={pico.outcome.primary_outcome} />
                          {pico.outcome.measurement_scales?.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {pico.outcome.measurement_scales.map((scale, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-mono">{scale}</span>
                              ))}
                            </div>
                          )}
                          {pico.outcome.extracted_from && (
                            <div className="mt-2 text-xs text-gray-400 italic border-t border-green-100 pt-2">근거: "{pico.outcome.extracted_from}"</div>
                          )}
                        </PicoCard>
                      </div>

                      {/* Study Design + Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center gap-2 font-bold text-sm text-gray-700 mb-2">
                            <FileText size={15} /> 연구 설계
                          </div>
                          <div className="text-sm space-y-1 text-gray-600">
                            <Field label="설계 유형" value={pico.study_design.design_type} />
                            <Field label="눈가림" value={pico.study_design.blinding} />
                            <Field label="배정 방법" value={pico.study_design.allocation} />
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center gap-2 font-bold text-sm text-gray-700 mb-2">
                            <BarChart2 size={15} /> 통계 결과
                          </div>
                          <div className="text-sm space-y-2 text-gray-600">
                            {pico.statistical_summary.p_values?.length > 0 && (
                              <div>
                                <span className="text-gray-400 text-xs">p-values: </span>
                                <div className="flex gap-1 flex-wrap mt-1">
                                  {pico.statistical_summary.p_values.map((p, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded font-bold">{p}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {pico.statistical_summary.effect_sizes?.length > 0 && (
                              <div>
                                <span className="text-gray-400 text-xs">Effect sizes: </span>
                                <div className="flex gap-1 flex-wrap mt-1">
                                  {pico.statistical_summary.effect_sizes.map((es, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-mono rounded font-bold">{es}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {pico.statistical_summary.p_values?.length === 0 && pico.statistical_summary.effect_sizes?.length === 0 && (
                              <span className="text-gray-400 italic text-xs">통계수치를 자동 감지하지 못했습니다. 원문을 추가해주세요.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Raw Evidence */}
                      {pico.raw_evidence?.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="font-bold text-sm text-gray-700 mb-2">📎 AI 근거 문장 (Raw Evidence)</div>
                          <div className="space-y-1">
                            {pico.raw_evidence.map((ev, i) => (
                              <div key={i} className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">{ev}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
