import { useState, useEffect, useCallback } from 'react';
import { Database, FileText, Activity, Loader2, ChevronDown, ChevronUp, Sparkles, CheckCircle2, RefreshCw, User, Zap, BarChart2, ClipboardList, Upload, Maximize2, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../store/useProjectStore';

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
  full_text: string | null;
  pico_data?: PicoData | null;
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

function FullTextModal({ isOpen, onClose, title, abstract, fullText, highlights }: { isOpen: boolean; onClose: () => void; title: string; abstract: string; fullText: string; highlights: string[] }) {
  if (!isOpen) return null;

  const renderContent = (content: string, label: string) => {
    if (!content) return null;
    
    let result = content;
    const cleanHighlights = highlights
      .map(h => {
        // Strip [Category] and optionally [Source] tags
        let cleaned = h.replace(/^\[.*?\]\s*(\[.*?\]\s*)?/, '').trim(); 
        cleaned = cleaned.replace(/\.\.\.$/, '');
        return cleaned;
      })
      .filter(h => h.length > 5)
      .sort((a, b) => b.length - a.length);

    cleanHighlights.forEach(h => {
      try {
        const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                         .replace(/\s+/g, '[\\s\\n\\r]+')
                         .replace(/-/g, '[\\s\\n\\r-–—]*'); 
        
        const regex = new RegExp(`(${escaped})`, 'gi');
        result = result.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded text-gray-900 shadow-sm">$1</mark>');
      } catch (e) {
        console.error("Highlighting error:", e);
      }
    });

    return (
      <div className="mb-8 last:mb-0">
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
            label === 'Abstract (초록)' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>{label}</span>
          <div className="h-px bg-gray-100 flex-1"></div>
        </div>
        <div className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap selection:bg-tkm-main selection:text-white" dangerouslySetInnerHTML={{ __html: result }} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 line-clamp-1 flex items-center gap-2">
            <FileText className="text-tkm-main" size={20} />
            {title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent(abstract, 'Abstract (초록)')}
          {renderContent(fullText, 'Full-text (원문 본문)')}
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-400">
          <span>AI가 탐지한 근거 문장이 <span className="bg-yellow-200 text-gray-800 px-1 rounded">노란색</span>으로 하이라이팅되어 있습니다.</span>
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-black transition-colors">닫기</button>
        </div>
      </div>
    </div>
  );
}

export default function ExtractionPage() {
  const [records, setRecords] = useState<LitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [picoResults, setPicoResults] = useState<Record<string, PicoData | null>>({});
  const [extracting, setExtracting] = useState<Record<string, boolean>>({});
  const [fetching, setFetching] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [manualTexts, setManualTexts] = useState<Record<string, string>>({});
  const [modalData, setModalData] = useState<{ isOpen: boolean; title: string; abstract: string; fullText: string; highlights: string[] }>({
    isOpen: false, title: '', abstract: '', fullText: '', highlights: []
  });
  const { currentProjectId } = useProjectStore();

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
      const res = await apiClient.get(`/search/rct_included/${params}`);
      const recs: LitRecord[] = res.data.records;
      setRecords(recs);
      
      const initTexts: Record<string, string> = {};
      const initPico: Record<string, PicoData | null> = {};
      recs.forEach(r => {
        if (r.full_text) initTexts[r.id] = r.full_text;
        if (r.pico_data) initPico[r.id] = r.pico_data;
      });
      setManualTexts(initTexts);
      setPicoResults(initPico);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleExtract = async (rec: LitRecord) => {
    setExtracting(prev => ({ ...prev, [rec.id]: true }));
    try {
      const full_text = manualTexts[rec.id] || rec.full_text || '';
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

  const handleFetchFullText = async (id: string) => {
    setFetching(prev => ({ ...prev, [id]: true }));
    try {
      const res = await apiClient.post('/search/fetch_fulltext/', { record_id: id });
      if (res.data.ok) {
        setManualTexts(prev => ({ ...prev, [id]: res.data.full_text }));
        setRecords(prev => prev.map(r => r.id === id ? { ...r, full_text: res.data.full_text } : r));
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || '원문을 가져오는 데 실패했습니다.';
      alert(msg);
    } finally {
      setFetching(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleFileUpload = async (id: string, file: File) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [id]: true }));
    const formData = new FormData();
    formData.append('record_id', id);
    formData.append('pdf_file', file);

    try {
      const res = await apiClient.post('/search/upload_fulltext_pdf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.ok) {
        setManualTexts(prev => ({ ...prev, [id]: res.data.full_text }));
        setRecords(prev => prev.map(r => r.id === id ? { ...r, full_text: res.data.full_text } : r));
        alert('PDF 원문 텍스트 추출에 성공했습니다.');
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'PDF 파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
      const response = await apiClient.get(`/search/export_excel/${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RCT_PICO_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Excel export error:", e);
      alert("엑셀 내보내기 중 오류가 발생했습니다.");
    }
  };

  const extractedCount = records.filter(r => r.status === 'EXTRACTED').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Sparkles className="text-tkm-main" />
            핵심 정보 추출 <span className="text-tkm-main">(PICO)</span>
          </h1>
          <p className="text-gray-500 mt-1">RCT 확정 논문의 제목·초록·원문에서 PICO 정보를 자동 추출하고 구조화합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadRecords} 
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> 새로고침
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

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {rec.abstract && (
                  <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 line-clamp-2 leading-relaxed">{rec.abstract}</div>
                )}

                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText size={14} /> 분석용 원문 본문 (Methods/Results 등)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalData({
                          isOpen: true,
                          title: rec.title,
                          abstract: rec.abstract,
                          fullText: manualTexts[rec.id] || rec.full_text || '',
                          highlights: pico?.raw_evidence || []
                        })}
                        className="text-[10px] bg-white text-gray-700 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-1.5 shadow-sm font-bold"
                      >
                        <Maximize2 size={12} /> 크게 보기 & 근거 확인
                      </button>
                      
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => e.target.files && handleFileUpload(rec.id, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          title="PDF 업로드"
                        />
                        <button
                          disabled={uploading[rec.id]}
                          className="text-[10px] bg-white text-blue-600 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-1.5 shadow-sm font-bold disabled:opacity-50"
                        >
                          {uploading[rec.id] ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          PDF 업로드
                        </button>
                      </div>

                      {(rec.pmid || rec.source_db === 'PubMed') && (
                        <button
                          onClick={() => handleFetchFullText(rec.id)}
                          disabled={fetching[rec.id]}
                          className="text-[10px] bg-tkm-light text-tkm-main px-3 py-1 rounded-lg border border-tkm-main/30 hover:bg-tkm-main hover:text-white transition-all flex items-center gap-1.5 shadow-sm font-bold disabled:opacity-50"
                        >
                          {fetching[rec.id] ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          PMC 자동 가져오기
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={manualTexts[rec.id] || ''}
                    onChange={e => setManualTexts(prev => ({ ...prev, [rec.id]: e.target.value }))}
                    placeholder="원문 텍스트를 이곳에 붙여넣거나 PDF 업로드 / PMC 자동 가져오기 버튼을 활용하세요..."
                    rows={manualTexts[rec.id] ? 5 : 2}
                    className="w-full text-xs font-mono border border-gray-200 rounded-lg p-3 resize-none focus:ring-2 focus:ring-tkm-main outline-none bg-white transition-all shadow-inner leading-relaxed"
                  />
                </div>
              </div>

              {pico && (
                <div className="border-t border-gray-100">
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

                      {pico.raw_evidence?.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="font-bold text-sm text-gray-700 mb-2">📎 AI 근거 문장 (Raw Evidence)</div>
                          <div className="space-y-1">
                            {pico.raw_evidence.map((ev, i) => {
                              const bits = ev.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
                              const bitsLegacy = !bits ? ev.match(/^\[(.*?)\]\s*(.*)$/) : null;
                              
                              const label = bits ? bits[1] : (bitsLegacy ? bitsLegacy[1] : 'INFO');
                              const src = bits ? bits[2] : 'Extract';
                              const sentence = bits ? bits[3] : (bitsLegacy ? bitsLegacy[2] : ev);
                              
                              return (
                                <div key={i} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 p-2.5 rounded-lg flex gap-3 items-start hover:bg-gray-100 transition-colors">
                                  <div className="flex flex-col gap-1 items-end pt-0.5 shrink-0">
                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{label}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black whitespace-nowrap border ${
                                      src === 'Abstract' ? 'bg-green-50 text-green-700 border-green-200' : 
                                      src === 'Full-text' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      'bg-gray-50 text-gray-500 border-gray-200'
                                    }`}>{src}</span>
                                  </div>
                                  <div className="font-sans leading-relaxed flex-1 italic">"{sentence}"</div>
                                </div>
                              );
                            })}
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

      <FullTextModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
        title={modalData.title}
        abstract={modalData.abstract}
        fullText={modalData.fullText}
        highlights={modalData.highlights}
      />
    </div>
  );
}
