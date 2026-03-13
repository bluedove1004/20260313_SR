import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, Trash2, Check, RefreshCw, Loader2,
  BarChart3, FileText, CheckCircle2, Calendar, BookOpen, ArrowRight
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../store/useProjectStore';
import { useNavigate } from 'react-router-dom';

interface ProjectStats {
  total: number;
  dedup_rejected: number;
  rct_included: number;
  extracted: number;
}

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
  stats: ProjectStats;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { currentProjectId, currentProjectName, setCurrentProject } = useProjectStore();
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/search/projects/');
      const list: Project[] = res.data.projects;
      setProjects(list);
      // If no active project is set yet, auto-select the first one
      if (!currentProjectId && list.length > 0) {
        setCurrentProject(list[0].id, list[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentProjectId, setCurrentProject]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async () => {
    setError('');
    if (!newName.trim()) { setError('프로젝트 이름을 입력해주세요.'); return; }
    setIsCreating(true);
    try {
      const res = await apiClient.post('/search/projects/', { name: newName.trim(), description: newDesc.trim() });
      const created: Project = res.data;
      setProjects(prev => [created, ...prev]);
      setCurrentProject(created.id, created.name);
      setShowForm(false);
      setNewName('');
      setNewDesc('');
    } catch (e: any) {
      setError(e?.response?.data?.error || '생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (proj: Project) => {
    if (!window.confirm(`"${proj.name}" 프로젝트와 포함된 모든 문헌 데이터를 삭제합니다. 계속하시겠습니까?`)) return;
    setDeletingId(proj.id);
    try {
      await apiClient.delete(`/search/projects/${proj.id}/`);
      const remaining = projects.filter(p => p.id !== proj.id);
      setProjects(remaining);
      if (currentProjectId === proj.id) {
        if (remaining.length > 0) setCurrentProject(remaining[0].id, remaining[0].name);
        else useProjectStore.getState().clearCurrentProject();
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleActivate = (proj: Project) => {
    setCurrentProject(proj.id, proj.name);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <FolderOpen className="text-tkm-main" size={32} />
            SR 프로젝트 관리
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            새로운 주제로 체계적 문헌고찰을 시작하거나 기존 프로젝트로 전환합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadProjects} disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setShowForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-tkm-main hover:bg-tkm-dark text-white rounded-xl font-bold text-sm shadow-sm transition-colors">
            <Plus size={16} /> 새 프로젝트 시작
          </button>
        </div>
      </div>

      {/* Active Project Banner */}
      {currentProjectName && (
        <div className="flex items-center justify-between bg-gradient-to-r from-tkm-main to-blue-700 text-white rounded-2xl px-6 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="opacity-90" />
            <div>
              <div className="text-xs font-semibold opacity-75 uppercase tracking-wide">현재 활성 프로젝트</div>
              <div className="text-xl font-black">{currentProjectName}</div>
            </div>
          </div>
          <button onClick={() => navigate('/search')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">
            검색 시작 <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* New Project Form */}
      {showForm && (
        <div className="bg-white border-2 border-tkm-main rounded-2xl p-6 shadow-lg space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus size={18} className="text-tkm-main" /> 새 SR 프로젝트 생성
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">프로젝트 이름 *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="예: 아토피 피부염 침치료 RCT 고찰"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tkm-main outline-none"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">연구 주제 설명 (선택)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="연구 배경, PICO 등 간략한 설명을 입력하세요..."
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tkm-main outline-none resize-none"
              />
            </div>
            {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={isCreating}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-tkm-main hover:bg-tkm-dark text-white rounded-xl font-bold transition-colors disabled:opacity-50">
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {isCreating ? '생성 중...' : '프로젝트 생성 및 활성화'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); setNewName(''); setNewDesc(''); }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {/* Project List */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" />
          <p>프로젝트 목록을 불러오는 중...</p>
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">아직 프로젝트가 없습니다.</p>
          <p className="text-sm mt-2">"새 프로젝트 시작" 버튼을 눌러 첫 SR 프로젝트를 만들어보세요.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map(proj => {
          const isActive = proj.id === currentProjectId;
          const date = new Date(proj.created_at).toLocaleDateString('ko-KR');
          return (
            <div key={proj.id} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
              isActive ? 'border-tkm-main ring-2 ring-tkm-light' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="p-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-black text-gray-900 text-base leading-snug flex-1">{proj.name}</h3>
                  {isActive && (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-tkm-main bg-tkm-light px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> 활성
                    </span>
                  )}
                </div>
                {proj.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{proj.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                  <Calendar size={12} /> 생성일: {date}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: <BookOpen size={13} />, label: '총 문헌', value: proj.stats.total, color: 'text-blue-600 bg-blue-50' },
                    { icon: <FileText size={13} />, label: 'RCT 포함', value: proj.stats.rct_included, color: 'text-purple-600 bg-purple-50' },
                    { icon: <BarChart3 size={13} />, label: 'PICO 추출', value: proj.stats.extracted, color: 'text-green-600 bg-green-50' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-2 text-center ${s.color}`}>
                      <div className="flex items-center justify-center gap-1 text-xs font-semibold mb-0.5">{s.icon} {s.label}</div>
                      <div className="font-black text-lg">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!isActive ? (
                    <button onClick={() => handleActivate(proj)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-tkm-main hover:bg-tkm-dark text-white rounded-xl font-bold text-sm transition-colors">
                      <Check size={15} /> 이 프로젝트로 전환
                    </button>
                  ) : (
                    <button onClick={() => navigate('/search')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors">
                      <ArrowRight size={15} /> 검색 이어서 진행
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(proj)}
                    disabled={deletingId === proj.id}
                    className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                    title="프로젝트 삭제"
                  >
                    {deletingId === proj.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
