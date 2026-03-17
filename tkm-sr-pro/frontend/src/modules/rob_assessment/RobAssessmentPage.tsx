import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Loader2, ChevronDown, ChevronUp, AlertCircle, Save, FileText, Database } from 'lucide-react';
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
  rob_data?: RobData | null;
}

interface RobData {
  [domainId: string]: {
    decision: 'low' | 'high' | 'unclear' | 'na';
    comment: string;
  };
}

const ROB_DOMAINS = [
  { id: 'd1', label: 'Random sequence generation', labelKr: '무작위 순서 생성 (선택 바이어스)' },
  { id: 'd2', label: 'Allocation concealment', labelKr: '배정 은폐 (선택 바이어스)' },
  { id: 'd3', label: 'Blinding of participants and personnel', labelKr: '연구참여자/연구원의 눈가림 (실행 바이어스)' },
  { id: 'd4', label: 'Blinding of outcome assessment', labelKr: '결과 평가자의 눈가림 (결과 확인 바이어스)' },
  { id: 'd5', label: 'Incomplete outcome data', labelKr: '불충분한 결과 데이터 (탈락 바이어스)' },
  { id: 'd6', label: 'Selective reporting', labelKr: '선택적 결과 보고 (보고 바이어스)' },
  { id: 'd7', label: 'Other bias', labelKr: '기타 바이어스 (기타 가이드라인 준수 등)' },
];

const OPTIONS = [
  { value: 'low', label: 'Low Risk', labelKr: '낮음', cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'high', label: 'High Risk', labelKr: '높음', cls: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'unclear', label: 'Unclear', labelKr: '불분명', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'na', label: 'N/A', labelKr: '해당없음', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export default function RobAssessmentPage() {
  const [records, setRecords] = useState<LitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [assessments, setAssessments] = useState<Record<string, RobData>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const { currentProjectId } = useProjectStore();

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

  const handleSaveRob = async (id: string) => {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      await apiClient.post('/search/rob_save/', {
        record_id: id,
        rob_data: assessments[id]
      });
      // Update local status
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'ROB_COMPLETED' } : r));
      alert('질평가(ROB) 결과가 저장되었습니다.');
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
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'pending' 
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
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'completed' 
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
                    <p className="text-sm text-gray-500 mt-1 truncate">{rec.authors}</p>
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
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="font-bold text-gray-700 mb-2 flex items-center gap-2"><FileText size={16} /> Abstract</div>
                        <p className="text-gray-600 line-clamp-6 leading-relaxed">{rec.abstract}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center items-center text-gray-400">
                        <AlertCircle size={32} className="mb-2 opacity-20" />
                        <p className="text-center text-xs">원문 열람을 위한 원문 분석 창을 활용하세요.</p>
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
                                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        rob?.[domain.id]?.decision === opt.value
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
                        onClick={() => handleSaveRob(rec.id)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 bg-tkm-main text-white rounded-xl font-bold hover:bg-tkm-dark transition-all shadow-lg shadow-tkm-light disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        질평가 결과 저장하기
                      </button>
                    </div>
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
