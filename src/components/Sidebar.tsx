import { Home, User, Flame, Droplets } from 'lucide-react';
import { Page } from '../App';
import { useAppState } from '../lib/store';
import { getCycleDay, getPhaseInfo } from '../lib/cycleEngine';
import { useT, useLang } from '../lib/i18n';

const PHASE_BADGE: Record<string, string> = {
  RISE:  'bg-[#D85A30]/10 text-[#D85A30]',
  PEAK:  'bg-[#FF8CAF]/20 text-[#FF8CAF]',
  FOCUS: 'bg-[#534AB7]/10 text-[#534AB7]',
  RESET: 'bg-[#085041]/10 text-[#085041]',
};

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [state] = useAppState();
  const t = useT();
  const profile = state.profile;

  const cycleDay  = profile ? getCycleDay(profile.periodDate, profile.cycleLength) : null;
  const phaseInfo = profile && cycleDay ? getPhaseInfo(cycleDay, profile.cycleLength) : null;

  const items = [
    { id: 'dashboard' as Page, label: t.nav.today,   icon: Home },
    { id: 'profile'   as Page, label: t.nav.profile, icon: User },
  ];

  return (
    <aside className="hidden md:flex w-56 xl:w-64 border-r border-[#2D2D2D]/10 bg-[#F9F7F2]/72 backdrop-blur-md px-6 py-7 xl:p-8 flex-col gap-8 xl:gap-10 z-10 flex-shrink-0">
      <div className="flex items-center px-2 gap-3">
        <div className="w-8 h-8 bg-[#FF8CAF] rounded-full flex items-center justify-center">
          <Flame className="w-4 h-4 text-white" />
        </div>
        <span className="font-serif text-2xl font-bold tracking-tight">Option</span>
      </div>

      {/* Phase indicator */}
      {phaseInfo && (
        <div className="space-y-2">
          <p className="text-[10px] font-black tracking-widest text-[#2D2D2D]/30 uppercase px-2">
            {t.sidebar.currentPhase}
          </p>
          <div className={`px-3 py-2 rounded-2xl text-xs font-bold tracking-widest ${PHASE_BADGE[phaseInfo.phase]}`}>
            {phaseInfo.phase6} · D{phaseInfo.dayInPhase}/{phaseInfo.totalDaysInPhase}
          </div>
          <div className="px-2">
            <div className="h-1 bg-[#2D2D2D]/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF8CAF] rounded-full transition-all duration-1000"
                style={{ width: `${((cycleDay! - 1) / (profile!.cycleLength - 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#2D2D2D]/30 mt-1">
              <span>{t.sidebar.dayLabel}1</span>
              <span>{t.sidebar.dayLabel}{profile!.cycleLength}</span>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1.5">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 text-left
                ${isActive
                  ? 'bg-[#FF8CAF] text-white shadow-md shadow-[#FF8CAF]/18'
                  : 'hover:bg-[#FF8CAF]/10 text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Daily tip */}
      <div className="paper-card p-4 rounded-2xl border border-[#2D2D2D]/5">
        <p className="text-[9px] text-[#2D2D2D]/40 uppercase tracking-widest mb-2 font-black">
          {t.sidebar.todayEdge}
        </p>
        <p className="text-xs italic text-[#2D2D2D]/70 font-serif leading-relaxed">
          {phaseInfo
            ? t.phaseTips[phaseInfo.subPhase] ?? `"${phaseInfo.phase}."`
            : `"${t.sidebar.hormones}"`}
        </p>
      </div>
    </aside>
  );
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────

const NAV_ITEM_IDS: Page[] = ['dashboard', 'profile'];
const NAV_ICONS = [Home, User];

export function BottomNav({ currentPage, onNavigate }: SidebarProps) {
  const [state] = useAppState();
  const t = useT();
  const [lang] = useLang();
  const profile = state.profile;
  const cycleDay  = profile ? getCycleDay(profile.periodDate, profile.cycleLength) : null;
  const phaseInfo = profile && cycleDay ? getPhaseInfo(cycleDay, profile.cycleLength) : null;

  const PHASE_ACCENT: Record<string, string> = {
    RISE: '#D85A30', PEAK: '#FF8CAF', FOCUS: '#534AB7', RESET: '#085041',
  };
  const accent = phaseInfo ? PHASE_ACCENT[phaseInfo.phase] : '#FF8CAF';

  const navLabels = [t.nav.today, t.nav.profile];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F9F7F2]/95 backdrop-blur-xl border-t border-[#2D2D2D]/8">
      <div className="flex items-stretch justify-around px-2">
        {NAV_ITEM_IDS.map((id, i) => {
          const Icon = NAV_ICONS[i];
          const isActive = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-1 py-3 px-4 flex-1 transition-all duration-200"
              style={{ color: isActive ? accent : 'rgba(45,45,45,0.35)' }}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
              </div>
              <span className="text-[9px] font-black tracking-widest uppercase">{navLabels[i]}</span>
            </button>
          );
        })}
      </div>

      {/* Phase indicator strip */}
      {phaseInfo && (
        <div className="absolute bottom-full left-0 right-0 h-0.5" style={{ backgroundColor: accent, opacity: 0.4 }} />
      )}

      {/* Period quick-log FAB */}
      {profile && (
        <button
          onClick={() => {
            const msg = lang === 'zh' ? '将今天标记为月经第一天？' : 'Log today as the first day of your period?';
            if (window.confirm(msg)) {
              import('../lib/store').then(({ updateProfile }) => {
                const d = new Date();
                updateProfile({
                  periodDate: d.getFullYear() + '-' +
                    String(d.getMonth() + 1).padStart(2, '0') + '-' +
                    String(d.getDate()).padStart(2, '0'),
                });
              });
            }
          }}
          className="absolute -top-5 right-4 w-10 h-10 rounded-full bg-[#E1F5EE] border border-[#085041]/15 flex items-center justify-center shadow-md"
          title={lang === 'zh' ? '今天月经来了' : 'Period started today'}
        >
          <Droplets className="w-4 h-4 text-[#085041]" />
        </button>
      )}
    </nav>
  );
}
