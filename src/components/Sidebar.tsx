import { Home, User, CalendarDays, Sparkles } from 'lucide-react';
import { Page } from '../App';
import { useAppState } from '../lib/store';
import { getCycleDay, getPhaseInfo } from '../lib/cycleEngine';
import { useT } from '../lib/i18n';
import logoMark from '../assets/option-logo-mark.svg';

const PHASE_BADGE: Record<string, string> = {
  RISE:  'bg-[#D85A30]/10 text-[#D85A30]',
  PEAK:  'bg-[#FF8CAF]/20 text-[#FF8CAF]',
  FOCUS: 'bg-[#534AB7]/10 text-[#534AB7]',
  RESET: 'bg-[#085041]/10 text-[#085041]',
};

const PHASE_DOT_COLORS: Record<string, string> = {
  RISE: '#B8632A',
  PEAK: '#A8344A',
  FOCUS: '#5B4B8A',
  RESET: '#2D7A52',
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
  const ovulationDay = profile ? Math.max(1, profile.cycleLength - 14) : null;
  const cycleDots = profile
    ? Array.from({ length: profile.cycleLength }, (_, i) => {
        const day = i + 1;
        const info = getPhaseInfo(day, profile.cycleLength);
        return {
          day,
          phase: info.phase,
          phase6: info.phase6,
          isPast: cycleDay ? day < cycleDay : false,
          isToday: cycleDay === day,
        };
      })
    : [];

  const items = [
    { id: 'dashboard' as Page, label: t.nav.today,   icon: Home },
    { id: 'plan'      as Page, label: t.nav.plan,    icon: CalendarDays },
    { id: 'profile'   as Page, label: t.nav.profile, icon: User },
  ];

  return (
    <aside className="hidden md:flex w-[220px] border-r border-[#2D2D2D]/10 bg-[#F9F7F2]/72 backdrop-blur-md px-6 py-7 flex-col gap-8 z-10 flex-shrink-0">
      <div className="flex items-center px-2 gap-3">
        <div className="w-9 h-9 rounded-2xl border border-white/70 bg-white/45 shadow-[0_8px_22px_rgba(45,45,45,0.08)] backdrop-blur flex items-center justify-center">
          <img src={logoMark} alt="Option" className="w-6 h-6" />
        </div>
        <span className="font-serif text-2xl font-bold tracking-tight">Option</span>
      </div>

      {/* Phase indicator */}
      {phaseInfo && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-black tracking-widest text-[#2D2D2D]/30 uppercase px-2">
            {t.sidebar.currentPhase}
          </p>
          <div className={`px-3 py-2 rounded-2xl text-xs font-bold tracking-widest ${PHASE_BADGE[phaseInfo.phase]}`}>
            <div className="flex items-center justify-between gap-2">
              <span>{phaseInfo.phase6} · D{phaseInfo.dayInPhase}/{phaseInfo.totalDaysInPhase}</span>
              <span className="text-[10px] opacity-70">D{phaseInfo.cycleDay} / {profile!.cycleLength}</span>
            </div>
          </div>
          <div className="mx-2 rounded-xl border border-[#2D2D2D]/6 bg-white/45 px-2.5 py-2 text-[10px] leading-relaxed text-[#2D2D2D]/42">
            <p className="font-bold text-[#2D2D2D]/55">{t.sidebar.cycleLength(profile!.cycleLength)}</p>
            <p>{t.sidebar.estimatedOvulation(ovulationDay!)}</p>
            <p>{t.sidebar.dailyCalculation}</p>
          </div>
          <div className="cycle-dot-grid px-2">
            {cycleDots.map(dot => {
              const color = PHASE_DOT_COLORS[dot.phase];
              return (
                <span
                  key={dot.day}
                  title={`D${dot.day} · ${dot.phase6}`}
                  className={`cycle-dot ${dot.isToday ? 'cycle-dot-today' : dot.isPast ? 'cycle-dot-past' : 'cycle-dot-future'}`}
                  style={{
                    backgroundColor: color,
                    boxShadow: dot.isToday ? `0 0 0 2px ${color}33` : undefined,
                  }}
                />
              );
            })}
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
      <div className="sidebar-edge-card">
        <p className="sidebar-edge-label">
          {t.sidebar.todayEdge}
        </p>
        <Sparkles className="sidebar-edge-icon" />
        <p className="sidebar-edge-quote font-serif">
          {phaseInfo
            ? t.phaseTips[phaseInfo.subPhase] ?? `"${phaseInfo.phase}."`
            : `"${t.sidebar.hormones}"`}
        </p>
      </div>
    </aside>
  );
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────

const NAV_ITEM_IDS: Page[] = ['dashboard', 'plan', 'profile'];
const NAV_ICONS = [Home, CalendarDays, User];

export function BottomNav({ currentPage, onNavigate }: SidebarProps) {
  const [state] = useAppState();
  const t = useT();
  const profile = state.profile;
  const cycleDay  = profile ? getCycleDay(profile.periodDate, profile.cycleLength) : null;
  const phaseInfo = profile && cycleDay ? getPhaseInfo(cycleDay, profile.cycleLength) : null;

  const PHASE_ACCENT: Record<string, string> = {
    RISE: '#D85A30', PEAK: '#FF8CAF', FOCUS: '#534AB7', RESET: '#085041',
  };
  const accent = phaseInfo ? PHASE_ACCENT[phaseInfo.phase] : '#FF8CAF';

  const navLabels = [t.nav.today, t.nav.plan, t.nav.profile];

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

    </nav>
  );
}

