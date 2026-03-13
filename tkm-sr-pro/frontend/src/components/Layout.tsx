import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Layers, FileCheck, FileText, Database, FolderOpen, LayoutDashboard } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

const NAV = [
  { to: '/',                   icon: <LayoutDashboard size={18} />, label: '대시보드' },
  { to: '/search',             icon: <Search size={18} />,          label: '실시간 통합 검색' },
  { to: '/dedup',              icon: <Layers size={18} />,          label: '중복 문헌 검토' },
  { to: '/screening-rct',      icon: <FileCheck size={18} />,       label: 'RCT 자동 선별' },
  { to: '/screening-fulltext', icon: <FileText size={18} />,        label: '원문 분석 선별' },
  { to: '/extraction',         icon: <Database size={18} />,        label: '핵심 정보 추출' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { currentProjectName } = useProjectStore();

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-tkm-dark flex items-center gap-2">
            <Layers className="text-tkm-main" />
            TKM-SR Pro
          </h1>
          <p className="text-xs text-gray-400 mt-1">AI-based SR Platform</p>
        </div>

        {/* Current project pill */}
        <NavLink to="/projects" className={({ isActive }) =>
          `mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            isActive ? 'bg-tkm-main text-white' : 'bg-blue-50 hover:bg-blue-100'
          }`
        }>
          {({ isActive }) => (
            <>
              <FolderOpen size={16} className={isActive ? 'text-white' : 'text-tkm-main'} />
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-white/70' : 'text-tkm-main/70'}`}>
                  현재 프로젝트
                </div>
                <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-gray-800'}`}>
                  {currentProjectName || '프로젝트 선택 필요'}
                </div>
              </div>
            </>
          )}
        </NavLink>

        {/* Pipeline Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-2">SR 파이프라인</p>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive ? 'bg-tkm-light text-tkm-main font-semibold' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {icon} {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">TKM-SR Pro v0.1 · Phase 1</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
