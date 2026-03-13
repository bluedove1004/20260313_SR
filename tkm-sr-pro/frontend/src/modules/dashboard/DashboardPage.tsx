import { useState, useEffect } from 'react';
import { BarChart3, Users, FileText, CheckCircle2, ChevronRight, PieChart, Activity, Download } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../store/useProjectStore';

interface Stats {
  totalSearched: number;
  deduplicated: number;
  reviewNeeded: number;
  rctFiltered: number;
  extracted: number;
}

// ─── PRISMA 2020 SVG Generator ───────────────────────────────────────────────
/** Escape characters that are invalid in SVG/XML text nodes */
function xmlEsc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildPrismaSvg(s: Stats): string {
  const excluded  = s.totalSearched - s.deduplicated - s.reviewNeeded;
  const nonRct    = Math.max(0, s.deduplicated - s.rctFiltered);
  const notPico   = Math.max(0, s.rctFiltered - s.extracted);

  const W = 760;
  const boxW = 220;
  const boxH = 58;
  const cx = W / 2;  // centre-x of main column
  const ex = W - 40; // right-side exclusion box right edge
  const exW = 190;
  const exLeft = ex - exW;

  // y positions of main boxes (top-centre)
  const y1 = 40;
  const y2 = 155;
  const y3 = 270;
  const y4 = 385;
  const y5 = 500;

  const boxX = cx - boxW / 2;

  const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, text: string[], radius = 8) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
     ${text.map((t, i) => `<text x="${x + w / 2}" y="${y + h / 2 + (i - (text.length - 1) / 2) * 16}" text-anchor="middle" font-size="${i === 0 ? 12 : 11}" font-family="Inter,sans-serif" font-weight="${i === 0 ? '700' : '400'}" fill="${i === 0 ? '#1e293b' : '#64748b'}">${xmlEsc(t)}</text>`).join('')}`;

  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow)"/>`;

  const dashedArrow = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arrow)"/>`;

  const totalH = y5 + boxH + 50;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/>
    </marker>
    <style>
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${totalH}" fill="#f8fafc"/>

  <!-- Title -->
  <text x="${cx}" y="22" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a" font-family="Inter,sans-serif">PRISMA 2020 Flow Diagram — TKM-SR Pro</text>

  <!-- Phase labels (left side) -->
  <text x="18" y="${y1 + boxH / 2 + 5}" font-size="10" fill="#94a3b8" writing-mode="horizontal-tb" font-family="Inter,sans-serif" font-weight="600">IDENTIFICATION</text>
  <text x="18" y="${y2 + boxH / 2 + 5}" font-size="10" fill="#94a3b8" font-family="Inter,sans-serif" font-weight="600">DEDUP</text>
  <text x="18" y="${y3 + boxH / 2 + 5}" font-size="10" fill="#94a3b8" font-family="Inter,sans-serif" font-weight="600">RCT</text>
  <text x="18" y="${y4 + boxH / 2 + 5}" font-size="10" fill="#94a3b8" font-family="Inter,sans-serif" font-weight="600">FULL-TEXT</text>
  <text x="18" y="${y5 + boxH / 2 + 5}" font-size="10" fill="#94a3b8" font-family="Inter,sans-serif" font-weight="600">INCLUDED</text>

  <!-- Main boxes -->
  ${box(boxX, y1, boxW, boxH, '#eff6ff', '#3b82f6',
    [`Records identified from databases`, `(n = ${s.totalSearched.toLocaleString()})`])}

  ${box(boxX, y2, boxW, boxH, '#fefce8', '#eab308',
    [`Records after deduplication`, `(n = ${s.deduplicated.toLocaleString()})`])}

  ${box(boxX, y3, boxW, boxH, '#faf5ff', '#a855f7',
    [`RCT Screened and Included`, `(n = ${s.rctFiltered.toLocaleString()})`])}

  ${box(boxX, y4, boxW, boxH, '#f0fdf4', '#22c55e',
    [`Full-text eligibility assessed`, `(n = ${s.rctFiltered.toLocaleString()})`])}

  ${box(boxX, y5, boxW, boxH, '#0f4c81', '#0f4c81',
    [`Studies included (PICO Extracted)`, `(n = ${s.extracted.toLocaleString()})`])}

  <!-- Main vertical arrows -->
  ${arrow(cx, y1 + boxH, cx, y2)}
  ${arrow(cx, y2 + boxH, cx, y3)}
  ${arrow(cx, y3 + boxH, cx, y4)}
  ${arrow(cx, y4 + boxH, cx, y5)}

  <!-- Exclusion boxes (right side) -->
  ${box(exLeft, y2 + 4, exW, 50, '#fff7ed', '#f97316',
    [`Duplicates removed`, `(n = ${excluded.toLocaleString()})`])}
  ${dashedArrow(boxX + boxW, y1 + boxH / 2, exLeft, y2 + 29)}

  ${box(exLeft, y3 + 4, exW, 50, '#fef2f2', '#ef4444',
    [`Non-RCT excluded`, `(n = ${nonRct.toLocaleString()})`])}
  ${dashedArrow(boxX + boxW, y2 + boxH / 2, exLeft, y3 + 29)}

  ${box(exLeft, y4 + 4, exW, 50, '#fef2f2', '#ef4444',
    [`Full-text excluded`, `(n = ${notPico.toLocaleString()})`])}
  ${dashedArrow(boxX + boxW, y3 + boxH / 2, exLeft, y4 + 29)}

  <!-- Legend -->
  <rect x="${boxX}" y="${y5 + boxH + 18}" width="8" height="8" fill="#3b82f6" rx="2"/>
  <text x="${boxX + 12}" y="${y5 + boxH + 26}" font-size="9" fill="#64748b" font-family="Inter,sans-serif">Study flow</text>
  <rect x="${boxX + 80}" y="${y5 + boxH + 18}" width="8" height="8" fill="#ef4444" rx="2"/>
  <text x="${boxX + 94}" y="${y5 + boxH + 26}" font-size="9" fill="#64748b" font-family="Inter,sans-serif">Excluded</text>
  <text x="${cx}" y="${y5 + boxH + 44}" font-size="9" fill="#94a3b8" text-anchor="middle" font-family="Inter,sans-serif">Generated by TKM-SR Pro · ${new Date().toLocaleDateString('ko-KR')}</text>
</svg>`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSearched: 0,
    deduplicated: 0,
    reviewNeeded: 0,
    rctFiltered: 0,
    extracted: 0
  });

  const { currentProjectId } = useProjectStore();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = currentProjectId ? `?project_id=${currentProjectId}` : '';
        const response = await apiClient.get(`/search/dashboard_stats/${params}`);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      }
    };
    fetchStats();
  }, [currentProjectId]);

  const calculatePercentage = (value: number, total: number) => {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  };

  const handleExportPrisma = () => {
    const svg = buildPrismaSvg(stats);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRISMA_Flow_${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const recentActivities = [
    { id: 1, action: "Deduplication Completed", source: "PubMed, CNKI, Cochrane", count: 832, time: "2 hours ago" },
    { id: 2, action: "RCT Screening Batch #4", source: "AI Auto-predicted", count: 120, time: "5 hours ago" },
    { id: 3, action: "PICO Extraction Updated", source: "User 'Dr. Kim'", count: 12, time: "1 day ago" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <PieChart className="text-tkm-main" size={32} />
            Project Overview
          </h1>
          <p className="mt-2 text-gray-500 text-lg">
            '아토피 피부염 무작위 대조군 연구' 체계적 문헌고찰 프로젝트 파이프라인 진행 상태
          </p>
        </div>
        <button
          onClick={handleExportPrisma}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 shadow-sm transition-colors"
        >
          <Download size={16} />
          Export PRISMA Diagram (SVG)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Searched */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">1. Integrated Search</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-gray-900">{stats.totalSearched.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1 font-medium">Raw records from 6 DBs</p>
          </div>
        </div>

        {/* Deduplicated */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">2. Unique Records</h3>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Users size={20} /></div>
          </div>
          <div className="mt-4">
             <div className="text-3xl font-black text-gray-900">{stats.deduplicated.toLocaleString()}</div>
             <p className="text-sm text-gray-500 mt-1 font-medium flex flex-col gap-1">
               <span className="flex items-center gap-1">
                 <span className="text-green-600 font-bold">-{stats.totalSearched - stats.deduplicated - stats.reviewNeeded}</span> via AI Deduplication
               </span>
               {stats.reviewNeeded > 0 && (
                 <span className="text-yellow-600 font-bold text-xs bg-yellow-50 px-2 py-1 rounded inline-flex w-fit items-center mt-1">
                   + {stats.reviewNeeded} review pending
                 </span>
               )}
            </p>
          </div>
        </div>

        {/* RCT Filtered */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">3. RCT Classified</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileText size={20} /></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-gray-900">{stats.rctFiltered.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-1">
               <span className="text-green-600 font-bold">-{calculatePercentage(stats.deduplicated - stats.rctFiltered, stats.deduplicated)}%</span> Non-RCT Excluded
            </p>
          </div>
        </div>

        {/* Extracted */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-tkm-main ring-1 ring-tkm-main flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tkm-main opacity-5 rounded-bl-full -mr-8 -mt-8"></div>
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-bold text-tkm-main uppercase tracking-wider">4. PICO Extracted</h3>
            <div className="p-2 bg-tkm-main text-white rounded-lg"><CheckCircle2 size={20} /></div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-3xl font-black text-gray-900">{stats.extracted.toLocaleString()}</div>
            <p className="text-sm text-tkm-main mt-1 font-bold">Ready for Meta-Analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions / Pipeline Flow */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4">Pipeline Status &amp; Quick Actions</h2>
          <div className="space-y-4">
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-tkm-main transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-gray-900">Search Databases</h4>
                  <p className="text-sm text-gray-500">Run federated search across multiple registries</p>
                </div>
              </div>
              <NavLink to="/search" className="flex items-center gap-1 text-sm font-bold text-tkm-main opacity-0 group-hover:opacity-100 transition-opacity">
                Go to Module <ChevronRight size={16} />
              </NavLink>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-tkm-main transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-gray-900">Review Deduplication Queue</h4>
                  <p className="text-sm text-gray-500">240 records require human review</p>
                </div>
              </div>
              <NavLink to="/dedup" className="flex items-center gap-1 text-sm font-bold text-tkm-main opacity-0 group-hover:opacity-100 transition-opacity">
                Go to Module <ChevronRight size={16} />
              </NavLink>
            </div>

            <div className="flex items-center justify-between p-4 border border-tkm-light bg-tkm-light/30 rounded-xl hover:border-tkm-main transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold animate-pulse">3</div>
                <div>
                  <h4 className="font-bold text-gray-900">Pending RCT Screening</h4>
                  <p className="text-sm text-gray-500">AI has classified 120 new records to screen</p>
                </div>
              </div>
              <NavLink to="/screening-rct" className="flex items-center gap-1 text-sm font-bold text-tkm-main">
                Review Now <ChevronRight size={16} />
              </NavLink>
            </div>
            
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
           <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activities</h2>
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
             {recentActivities.map((act) => (
               <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-200 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <Activity size={16} />
                 </div>
                 <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow-sm bg-white border border-gray-100">
                   <div className="flex items-center justify-between mb-1">
                     <div className="font-bold text-gray-900 text-sm">{act.action}</div>
                     <time className="text-xs font-medium text-gray-500">{act.time}</time>
                   </div>
                   <div className="text-xs text-gray-600">
                     {act.source} • <span className="font-medium text-tkm-main">{act.count} items</span>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
