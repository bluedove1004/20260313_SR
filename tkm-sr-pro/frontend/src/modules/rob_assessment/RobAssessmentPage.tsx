import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Loader2, ChevronDown, ChevronUp, Save, FileText, Database, Sparkles, X, Maximize2, Clock, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../store/useProjectStore';
import { useSettingsStore } from '../../store/useSettingsStore';

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
  rob_data?: RobData | null;
  rob_last_saved_at?: string | null;
  rob_completed_at?: string | null;
}

interface RobData {
  [domainId: string]: {
    decision: 'low' | 'high' | 'unclear' | 'na';
    comment: string;
  };
}

const ROB_DOMAINS = [
  { id: 'd1', label: 'Random sequence generation', labelKr: '무작위 배정순서 생성 (선택 바이어스)' },
  { id: 'd2', label: 'Allocation concealment', labelKr: '배정순서 은폐 (선택 바이어스)' },
  { id: 'd3', label: 'Blinding of participants and personnel', labelKr: '연구대상자와 연구자에 대한 눈가림 (실행 바이어스)' },
  { id: 'd4', label: 'Blinding of outcome assessment', labelKr: '결과평가 눈가림 (결과 확인 바이어스)' },
  { id: 'd5', label: 'Incomplete outcome data', labelKr: '불충분한 결과 자료(탈락 바이어스)' },
  { id: 'd6', label: 'Selective reporting', labelKr: '선택적 결과 보고 (보고 바이어스)' },
  { id: 'd7', label: 'Other bias', labelKr: '기타 삐뚤림 (기타 가이드라인 준수 등)' },
];

const OPTIONS = [
  { value: 'high', label: 'High Risk', labelKr: '높음', cls: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'low', label: 'Low Risk', labelKr: '낮음', cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'unclear', label: 'Unclear', labelKr: '불분명', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

function FullTextModal({ isOpen, onClose, title, abstract, fullText, highlights }: { isOpen: boolean; onClose: () => void; title: string; abstract: string; fullText: string; highlights: string[] }) {
  if (!isOpen) return null;

  const renderContent = (content: string, label: string) => {
    if (!content) return null;
    let result = content;
    
    highlights.filter(h => h && h.length > 10).forEach(h => {
      try {
        // Clean up the match string: escape regex special chars and normalize spaces
        const escaped = h.trim()
                         .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                         .replace(/\s+/g, '[\\s\\n\\r]+')
                         .replace(/\\\.\.\.$/, ''); // remove trailing ellipsis
        const regex = new RegExp(`(${escaped})`, 'gi');
        result = result.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded text-gray-900">$1</mark>');
      } catch (e) {}
    });

    return (
      <div className="mb-8 last:mb-0">
        <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase text-gray-400">
          <span>{label}</span>
          <div className="h-px bg-gray-100 flex-1"></div>
        </div>
        <div className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: result }} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 line-clamp-1 flex items-center gap-2">
            <FileText className="text-tkm-main" size={20} /> {title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent(abstract, 'Abstract')}
          {renderContent(fullText, 'Full-text')}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold">닫기</button>
        </div>
      </div>
    </div>
  );
}

export default function RobAssessmentPage() {
  const [records, setRecords] = useState<LitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [assessments, setAssessments] = useState<Record<string, RobData>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [predicting, setPredicting] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [modalData, setModalData] = useState<{ isOpen: boolean; title: string; abstract: string; fullText: string; highlights: string[] }>({
    isOpen: false, title: '', abstract: '', fullText: '', highlights: []
  });
  const [predictingGpt, setPredictingGpt] = useState<Record<string, boolean>>({});
  const { currentProjectId } = useProjectStore();
  const { openAiApiKey } = useSettingsStore();

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
      const res = await apiClient.get(`/search/rob_list/${params}`);
      const recs: LitRecord[] = res.data.records;
      setRecords(recs);

      const initRob: Record<string, RobData> = {};
      recs.forEach(r => {
        if (r.rob_data) {
          initRob[r.id] = r.rob_data;
        } else {
          // Initialize empty
          const empty: RobData = {};
          ROB_DOMAINS.forEach(d => {
            empty[d.id] = { decision: 'unclear', comment: '' };
          });
          initRob[r.id] = empty;
        }
      });
      setAssessments(initRob);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleValueChange = (recordId: string, domainId: string, value: any) => {
    setAssessments(prev => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [domainId]: { ...prev[recordId][domainId], ...value }
      }
    }));
  };

  const handlePredictRob = async (rec: LitRecord) => {
    setPredicting(prev => ({ ...prev, [rec.id]: true }));
    try {
      const res = await apiClient.post('/search/rob_predict/', {
        title: rec.title,
        abstract: rec.abstract,
        full_text: rec.full_text || '',
      });

      const aiDomains = res.data.domains;
      const newRob: RobData = { ...assessments[rec.id] };

      const highlights: string[] = [];
      Object.keys(aiDomains).forEach(domId => {
        if (aiDomains[domId]) {
          newRob[domId] = {
            decision: aiDomains[domId].decision,
            comment: aiDomains[domId].evidence
          };
          if (aiDomains[domId].evidence) {
            highlights.push(aiDomains[domId].evidence);
          }
        }
      });

      setAssessments(prev => ({ ...prev, [rec.id]: newRob }));
      setModalData(prev => ({ ...prev, highlights }));
      setExpanded(prev => ({ ...prev, [rec.id]: true }));
      
      // Auto-save temporary
      handleSaveRob(rec.id, false, newRob);
      
      alert('AI가 질평가 항목을 분석하여 임시 저장했습니다. 도메인별 판단 결과와 근거를 검토해 주세요.');
    } catch (e) {
      console.error(e);
      alert('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setPredicting(prev => ({ ...prev, [rec.id]: false }));
    }
  };

  const handlePredictRobGpt = async (rec: LitRecord) => {
    if (!openAiApiKey) {
      alert('설정 메뉴에서 OpenAI API Key를 먼저 입력해주세요.');
      return;
    }
    setPredictingGpt(prev => ({ ...prev, [rec.id]: true }));
    try {
      const res = await apiClient.post('/search/rob_predict_gpt/', {
        api_key: openAiApiKey,
        title: rec.title,
        abstract: rec.abstract,
        full_text: rec.full_text || '',
      });

      const aiDomains = res.data.domains;
      const newRob: RobData = { ...assessments[rec.id] };
      const highlights: string[] = [];

      Object.keys(aiDomains).forEach(domId => {
        if (aiDomains[domId]) {
          newRob[domId] = {
            decision: aiDomains[domId].decision,
            comment: aiDomains[domId].evidence
          };
          if (aiDomains[domId].evidence) highlights.push(aiDomains[domId].evidence);
        }
      });

      setAssessments(prev => ({ ...prev, [rec.id]: newRob }));
      setModalData(prev => ({ ...prev, highlights }));
      setExpanded(prev => ({ ...prev, [rec.id]: true }));

      // Auto-save temporary
      handleSaveRob(rec.id, false, newRob);

      alert('GPT-4o가 질평가 항목을 분석하여 임시 저장했습니다. 내용을 검토해 주세요.');
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.error || 'AI 강화 분석 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setPredictingGpt(prev => ({ ...prev, [rec.id]: false }));
    }
  };

  const handleSaveRob = async (id: string, complete: boolean = true, customData?: RobData) => {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const res = await apiClient.post('/search/rob_save/', {
        record_id: id,
        rob_data: customData || assessments[id],
        complete: complete
      });
      // Update local record data (timestamps and status)
      setRecords(prev => prev.map(r => r.id === id ? { 
        ...r, 
        status: res.data.status,
        rob_last_saved_at: res.data.rob_last_saved_at,
        rob_completed_at: res.data.rob_completed_at
      } : r));
      
      if (complete) {
        alert('질평가(ROB)가 완료되었습니다. 평가 완료 탭으로 이동합니다.');
      } else if (!customData) {
        alert('내용이 임시 저장되었습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
      const response = await apiClient.get(`/search/export_rob/${params}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ROB_Assessment_Results_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('엑셀 내보내기 중 오류가 발생했습니다.');
    }
  };

  const filteredRecords = records.filter(r =>
    activeTab === 'completed' ? r.status === 'ROB_COMPLETED' : r.status === 'EXTRACTED'
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-tkm-main" size={32} />
            문헌 질평가 (Risk of Bias Assessment)
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            Cochrane ROB 1.0 가이드라인에 따라 포함 문헌의 비뚤림 위험을 평가합니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadRecords} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-all">
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'pending'
            ? 'border-tkm-main text-tkm-main'
            : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
        >
          평가 대기 (Pending)
          <span className="ml-2 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
            {records.filter(r => r.status === 'EXTRACTED').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'completed'
            ? 'border-tkm-main text-tkm-main'
            : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
        >
          평가 완료 (Completed)
          <span className="ml-2 bg-tkm-light text-tkm-main px-2 py-0.5 rounded-full text-xs">
            {records.filter(r => r.status === 'ROB_COMPLETED').length}
          </span>
        </button>
      </div>

      {isLoading && records.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" />
          <p>문헌 목록을 불러오는 중...</p>
        </div>
      )}

      {!isLoading && filteredRecords.length === 0 && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
          <ShieldCheck size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">평가할 문헌이 없습니다.</p>
          <p className="text-sm mt-2">PICO 추출이 완료된 논문이 여기에 표시됩니다.</p>
        </div>
      )}

      <div className="space-y-6">
        {filteredRecords.map((rec) => {
          const isOpen = expanded[rec.id];
          const rob = assessments[rec.id];
          const isSaving = saving[rec.id];

          return (
            <div key={rec.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-700">{rec.source_db}</span>
                      <span className="text-xs text-gray-400">{rec.year}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-snug truncate">{rec.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-gray-500 truncate">{rec.authors}</p>
                      {rec.rob_last_saved_at && (
                        <div className="flex items-center gap-1.5 text-[11px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <Clock size={12} /> 임시저장: {new Date(rec.rob_last_saved_at).toLocaleString()}
                        </div>
                      )}
                      {rec.rob_completed_at && (
                        <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          <CheckCircle size={12} /> 평가완료: {new Date(rec.rob_completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [rec.id]: !isOpen }))}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-8 animate-in slide-in-from-top-2 duration-200">
                    {/* Basic Info */}
                    <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">AI 자동 분석 및 제안</p>
                          <p className="text-xs text-gray-500">AI가 문헌 본문을 분석하여 7가지 도메인의 위험도와 근거를 제안합니다.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePredictRob(rec)}
                          disabled={predicting[rec.id] || predictingGpt[rec.id]}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50"
                        >
                          {predicting[rec.id] ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          AI 자동 제안
                        </button>
                        <button
                          onClick={() => handlePredictRobGpt(rec)}
                          disabled={predicting[rec.id] || predictingGpt[rec.id]}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                        >
                          {predictingGpt[rec.id] ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          AI 강화 추출 (GPT-4o)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative group">
                        <div className="font-bold text-gray-700 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2"><FileText size={16} className="text-green-600" /> Abstract (초록)</div>
                          <button 
                            onClick={() => {
                              const evs = Object.values(assessments[rec.id] || {}).map(v => v.comment).filter(c => c && c.length > 10);
                              setModalData({
                                isOpen: true, title: rec.title, abstract: rec.abstract, fullText: rec.full_text || '', highlights: evs
                              });
                            }}
                            className="bg-white p-1.5 rounded-lg border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title="확대해서 보기">
                            <Maximize2 size={14} className="text-gray-600" />
                          </button>
                        </div>
                        <p className="text-gray-600 line-clamp-6 leading-relaxed text-xs">
                          {rec.abstract || <span className="text-gray-300 italic">내용이 없습니다.</span>}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative group">
                        <div className="font-bold text-gray-700 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2"><FileText size={16} className="text-blue-600" /> Full-text (원문)</div>
                          <button 
                            onClick={() => {
                              const evs = Object.values(assessments[rec.id] || {}).map(v => v.comment).filter(c => c && c.length > 10);
                              setModalData({
                                isOpen: true, title: rec.title, abstract: rec.abstract, fullText: rec.full_text || '', highlights: evs
                              });
                            }}
                            className="bg-white p-1.5 rounded-lg border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" title="확대해서 보기">
                            <Maximize2 size={14} className="text-gray-600" />
                          </button>
                        </div>
                        <p className="text-gray-600 line-clamp-6 leading-relaxed text-xs">
                          {rec.full_text || <span className="text-gray-300 italic">원문 텍스트 데이터가 없습니다. 원문 관리창에서 먼저 텍스트를 추출해 주세요.</span>}
                        </p>
                      </div>
                    </div>

                    {/* ROB Form */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
                        <ShieldCheck size={14} /> Risk of Bias Domains
                      </div>
                      <div className="space-y-4">
                        {ROB_DOMAINS.map((domain) => (
                          <div key={domain.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-bold text-gray-800 mb-1">{domain.labelKr}</h4>
                                <p className="text-xs text-gray-400 font-mono mb-4">{domain.label}</p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      onClick={() => handleValueChange(rec.id, domain.id, { decision: opt.value })}
                                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${rob?.[domain.id]?.decision === opt.value
                                        ? opt.cls + ' ring-2 ring-offset-1 ring-current shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                      {opt.labelKr}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-400 block mb-2">판단 근거 / 메모 (Supporting highlight or comment)</label>
                                <textarea
                                  value={rob?.[domain.id]?.comment || ''}
                                  onChange={(e) => handleValueChange(rec.id, domain.id, { comment: e.target.value })}
                                  rows={3}
                                  className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-tkm-main outline-none bg-white transition-all shadow-inner"
                                  placeholder="예: 'Random allocation was done by computer-generated list...'"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleSaveRob(rec.id, false)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        임시저장
                      </button>
                      <button
                        onClick={() => handleSaveRob(rec.id, true)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 bg-tkm-main text-white rounded-xl font-bold hover:bg-tkm-dark transition-all shadow-lg shadow-tkm-light disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        질 평가 완료 (확정)
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
