import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2, Zap, Activity, Smile, Wind, ChevronDown, ChevronUp,
  Check, CloudSun, Droplets, MapPin,
} from 'lucide-react';
import { useAppState, setTodayLog, getTodayLog, getYesterdayLog, updateLogDebrief, updateProfile } from '../lib/store';
import { getCycleDay, getPhaseInfo, getAgeBracket, getTodayStr, getYesterdayStr } from '../lib/cycleEngine';
import { ShareModal } from '../components/ShareModal';
import { getReportContent } from '../lib/contentLibrary';
import { useT, useLang } from '../lib/i18n';
import { fetchCurrentWeather, getWeatherLabel } from '../lib/weather';
import type { ReportContent, PhaseInfo } from '../lib/types';
import type { CurrentWeather } from '../lib/weather';

const PHASE_COLORS: Record<string, { bg: string; text: string; sub: string; badge: string }> = {
  RISE:  { bg: '#FAECE7', text: '#712B13', sub: '#993C1D', badge: 'bg-[#D85A30] text-white' },
  PEAK:  { bg: '#FAEEDA', text: '#633806', sub: '#854F0B', badge: 'bg-[#FF8CAF] text-white' },
  FOCUS: { bg: '#EEEDFE', text: '#3C3489', sub: '#534AB7', badge: 'bg-[#534AB7] text-white' },
  RESET: { bg: '#E1F5EE', text: '#085041', sub: '#0F6E56', badge: 'bg-[#085041] text-white' },
};

const PHASE_ACCENT: Record<string, string> = {
  RISE: '#D85A30', PEAK: '#FF8CAF', FOCUS: '#534AB7', RESET: '#085041',
};

export function Dashboard() {
  const [state] = useAppState();
  const t = useT();
  const [lang] = useLang();
  const profile = state.profile!;
  const d = t.dashboard;
  const profileT = t.profile;

  const [sleepInput, setSleepInput] = useState(7);
  const [showSleepGate, setShowSleepGate] = useState(true);
  const [report, setReport] = useState<ReportContent | null>(null);
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);
  const [openPillar, setOpenPillar] = useState<number | null>(null);
  const [openWhy, setOpenWhy] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [periodLogged, setPeriodLogged] = useState(false);

  // Yesterday's debrief state
  const [yesterdayLog, setYesterdayLog] = useState(() => getYesterdayLog());
  const [yesterdayDebriefDone, setYesterdayDebriefDone] = useState(
    () => !!getYesterdayLog()?.debriefRating
  );

  // Check if today already has a log
  useEffect(() => {
    const existing = getTodayLog();
    if (existing) {
      const day = getCycleDay(profile.periodDate, profile.cycleLength);
      const info = getPhaseInfo(day, profile.cycleLength);
      setPhaseInfo(info);
      const content = getReportContent(info.subPhase, info.phase6, day, info.dayInPhase, info.totalDaysInPhase, info.progress, existing.sleepHours, profile.fitness, profile.diet, lang);
      setReport(content);
      setSleepInput(existing.sleepHours);
      setShowSleepGate(false);
    }
    // Refresh yesterday's log on profile/lang change
    const yLog = getYesterdayLog();
    setYesterdayLog(yLog);
    setYesterdayDebriefDone(!!yLog?.debriefRating);
  }, [profile, lang]);

  useEffect(() => {
    const city = profile.city.trim();
    if (!city) return;

    const controller = new AbortController();
    fetchCurrentWeather(city, lang, controller.signal)
      .then(setWeather)
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') setWeather(null);
      });

    return () => controller.abort();
  }, [profile.city, lang]);

  const generateReport = () => {
    const day = getCycleDay(profile.periodDate, profile.cycleLength);
    const info = getPhaseInfo(day, profile.cycleLength);
    const content = getReportContent(info.subPhase, info.phase6, day, info.dayInPhase, info.totalDaysInPhase, info.progress, sleepInput, profile.fitness, profile.diet, lang);
    setPhaseInfo(info);
    setReport(content);
    setShowSleepGate(false);
    setTodayLog({ date: getTodayStr(), sleepHours: sleepInput });
  };

  const handleYesterdayDebrief = (rating: 'good' | 'bad') => {
    const yDate = getYesterdayStr();
    updateLogDebrief(yDate, rating);
    setYesterdayDebriefDone(true);
    setYesterdayLog(prev => prev ? { ...prev, debriefRating: rating } : prev);
  };

  const handlePeriodToday = () => {
    if (window.confirm(profileT.periodConfirm)) {
      updateProfile({ periodDate: getTodayStr() });
      setPeriodLogged(true);
      setTimeout(() => setPeriodLogged(false), 3000);
    }
  };

  const today = new Date();
  const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS_EN   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WEEKDAYS_ZH = ['周日','周一','周二','周三','周四','周五','周六'];
  const dateStr = lang === 'zh'
    ? `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${WEEKDAYS_ZH[today.getDay()]}`
    : `${WEEKDAYS_EN[today.getDay()]}, ${MONTHS_EN[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  const col = phaseInfo ? PHASE_COLORS[phaseInfo.phase] : PHASE_COLORS.RISE;
  const accent = phaseInfo ? PHASE_ACCENT[phaseInfo.phase] : '#D85A30';

  const pillars = report ? [
    { label: d.pillars.energy, code: report.energy.headline.split('.')[0], icon: Zap,      color: '#FAEEDA', text: '#633806', sub: '#854F0B', content: report.energy },
    { label: d.pillars.body,   code: report.body.headline.split('.')[0],   icon: Activity, color: '#FAECE7', text: '#712B13', sub: '#993C1D', content: report.body },
    { label: d.pillars.skin,   code: report.skin.headline.split('.')[0],   icon: Smile,    color: '#EEEDFE', text: '#3C3489', sub: '#534AB7', content: report.skin },
    { label: d.pillars.mood,   code: report.mood.headline.split('.')[0],   icon: Wind,     color: '#E1F5EE', text: '#085041', sub: '#0F6E56', content: report.mood },
  ] : [];

  // Reorder by objective — put selected pillars first
  if (!profile.objective.includes('all') && profile.objective.length > 0 && pillars.length) {
    const orderMap: Record<string, number> = { career: 0, body: 1, skin: 2, mood: 3 };
    const selectedIndices = new Set(profile.objective.map(o => orderMap[o]).filter((i): i is number => i !== undefined));
    const reordered = [
      ...pillars.filter((_, i) => selectedIndices.has(i)),
      ...pillars.filter((_, i) => !selectedIndices.has(i)),
    ];
    pillars.splice(0, pillars.length, ...reordered);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
      <header className="dashboard-header">
        <div className="dashboard-header-main">
          <div className="dashboard-title-block">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="dashboard-day-title font-serif text-[#2D2D2D]">
                {phaseInfo ? `D${phaseInfo.cycleDay}` : d.option}
              </span>
              {phaseInfo && (
                <span className={`dashboard-phase-badge rounded-full font-bold tracking-widest uppercase ${col.badge}`}>
                  {phaseInfo.phase6} · {phaseInfo.dayInPhase}/{phaseInfo.totalDaysInPhase}
                </span>
              )}
            </div>
            <p className="dashboard-body-text text-[#2D2D2D]/40 font-mono tracking-widest uppercase">{dateStr}</p>
          </div>

          {report && phaseInfo && !showSleepGate && (
            <div className="dashboard-header-meta">
              <Stat label={d.stats.sleep} value={`${sleepInput}h${sleepInput < 6 ? ` ${d.stats.low}` : sleepInput > 9 ? ` ${d.stats.high}` : ''}`} accent={sleepInput < 6} />
              <Stat label={d.stats.cycleDay} value={`D${phaseInfo.cycleDay} / ${profile.cycleLength}`} />
              <Stat label={d.stats.ageBracket} value={getAgeBracket(profile.age)} />
              <Stat label={d.stats.nextPhase} value={`${phaseInfo.nextPhase} ${d.stats.in} ${phaseInfo.daysUntilNextPhase}d`} />
            </div>
          )}

          <div className="dashboard-header-actions">
            {weather && (
              <div className="dashboard-weather-card flex items-center gap-3 rounded-2xl bg-white/90 border border-[#2D2D2D]/8 shadow-sm">
                <CloudSun className="w-5 h-5 text-[#D85A30]" />
                <div>
                  <div className="flex items-center gap-2 dashboard-body-text font-bold">
                    <span>{Math.round(weather.temperature)}°C</span>
                    <span className="text-[#2D2D2D]/45 font-medium">
                      {getWeatherLabel(weather.weatherCode, lang)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#2D2D2D]/40 mt-0.5">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {weather.city}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Droplets className="w-3 h-3" /> {weather.humidity}%
                    </span>
                    <span>
                      {lang === 'zh' ? '体感' : 'Feels'} {Math.round(weather.apparentTemperature)}°
                    </span>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {periodLogged ? (
                <motion.div
                  key="period-logged"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="dashboard-action-pill flex items-center gap-2 bg-[#E1F5EE] text-[#085041] rounded-full font-bold"
                >
                  <Check className="w-4 h-4" /> {profileT.cycleUpdated}
                </motion.div>
              ) : (
                <motion.button
                  key="period-button"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={handlePeriodToday}
                  className="dashboard-action-pill flex items-center gap-2 bg-[#E1F5EE] text-[#085041] rounded-full font-bold hover:shadow-md transition-all border border-[#085041]/10"
                >
                  <Droplets className="w-4 h-4" />
                  {profileT.periodToday}
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={() => report && setShowShare(true)}
              className={`dashboard-body-text flex items-center gap-2 transition-colors font-semibold ${report ? 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]' : 'text-[#2D2D2D]/20 cursor-default'}`}
            >
              <Share2 className="w-4 h-4" /> {d.share.label}
            </button>
          </div>
        </div>
      </header>

      {/* Yesterday's debrief — shown if yesterday's log exists and not yet debriefed */}
      <AnimatePresence>
        {yesterdayLog && !yesterdayDebriefDone && (() => {
          const yDay = getCycleDay(profile.periodDate, profile.cycleLength);
          // approximate yesterday's cycle day (subtract 1, wrap)
          const yCycleDay = ((yDay - 2 + profile.cycleLength) % profile.cycleLength) + 1;
          const yInfo = getPhaseInfo(yCycleDay, profile.cycleLength);
          const PHASE_BG: Record<string, string> = {
            RISE: '#FAECE7', PEAK: '#FAEEDA', FOCUS: '#EEEDFE', RESET: '#E1F5EE',
          };
          const yAccent = PHASE_ACCENT[yInfo.phase];
          return (
            <motion.div
              key="yesterday-debrief"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="paper-card rounded-[32px] px-10 py-8 border border-[#2D2D2D]/5 flex items-center justify-between gap-8 flex-wrap"
              style={{ backgroundColor: PHASE_BG[yInfo.phase] }}
            >
              <div className="space-y-2">
                <p className="text-xs font-black tracking-[0.2em] uppercase" style={{ color: yAccent }}>
                  {d.debrief.label}
                </p>
                <p className="font-serif text-xl sm:text-2xl" style={{ color: yAccent }}>
                  {d.debrief.wasPhase} <strong>{yInfo.subPhase}</strong> · {d.debrief.question}
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => handleYesterdayDebrief('good')}
                  className="px-6 py-3 bg-white/70 border border-black/8 rounded-full text-base font-bold hover:bg-white transition-all"
                  style={{ color: yAccent }}
                >{d.debrief.accurate}</button>
                <button
                  onClick={() => handleYesterdayDebrief('bad')}
                  className="px-6 py-3 bg-white/70 border border-black/8 rounded-full text-base font-bold hover:bg-white transition-all"
                  style={{ color: yAccent }}
                >{d.debrief.offToday}</button>
              </div>
            </motion.div>
          );
        })()}
        {yesterdayLog && yesterdayDebriefDone && (
          <motion.div
            key="yesterday-done"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-sm text-[#2D2D2D]/40 italic font-serif px-2"
          >
            {d.debrief.loggedGood}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleep gate */}
      <AnimatePresence>
        {showSleepGate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="paper-card rounded-[40px] p-12 sm:p-14 border border-[#2D2D2D]/5 bg-white space-y-10 max-w-2xl"
          >
            <div className="space-y-3">
              <p className="text-sm font-bold tracking-[0.2em] text-[#2D2D2D]/40 uppercase">{d.sleepGate.sectionLabel}</p>
              <h3 className="text-4xl sm:text-5xl font-serif leading-tight">{d.sleepGate.question}</h3>
              <p className="text-[#2D2D2D]/60 text-base">{d.sleepGate.sub}</p>
            </div>
            <div className="space-y-5">
              <div className="flex items-center gap-6">
                <span className="text-7xl sm:text-8xl font-serif font-bold">{sleepInput}</span>
                <span className="text-3xl text-[#2D2D2D]/40 font-serif">{d.sleepGate.hours}</span>
              </div>
              <input
                type="range" min={3} max={12} step={0.5} value={sleepInput}
                onChange={e => setSleepInput(+e.target.value)}
                className="w-full accent-[#FF8CAF] h-2"
              />
              <div className="flex justify-between text-sm text-[#2D2D2D]/30 font-mono">
                <span>3h</span><span>6h</span><span>9h</span><span>12h</span>
              </div>
            </div>
            <button
              onClick={generateReport}
              className="w-full py-5 bg-[#2D2D2D] text-white rounded-full font-bold text-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
            >
              {d.sleepGate.cta}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share modal */}
      {showShare && report && phaseInfo && (
        <ShareModal
          phaseInfo={phaseInfo}
          cycleLength={profile.cycleLength}
          edgePct={report.edge.pct}
          sleepHours={sleepInput}
          report={report}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Report */}
      <AnimatePresence>
        {report && phaseInfo && !showSleepGate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-report">

            {/* Primary briefing + current-state index */}
            <div className="dashboard-primary-grid">

              {/* Curve card */}
              <div className="dashboard-curve-card min-w-0 bg-white rounded-[32px] border border-[#2D2D2D]/5 relative overflow-hidden shadow-[0_18px_50px_rgba(45,45,45,0.06)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#ADCBE3] rounded-full blur-3xl opacity-20 -mr-32 -mt-32" />

                {/* Status + edge */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-5 relative z-10">
                  <div className="space-y-2 flex-1 min-w-0">
                    <h3 className="text-xs font-black tracking-[0.3em] text-[#2D2D2D]/40 uppercase">{d.hormones}</h3>
                    <p className="dashboard-status-line font-medium leading-snug text-[#2D2D2D]/85">{report.statusLine}</p>
                    <p className="dashboard-body-text text-[#2D2D2D]/50 leading-relaxed">{report.continuityNote}</p>
                    {report.hormones && (
                      <div className="flex gap-2.5 flex-wrap pt-1">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF8CAF]/15 text-[#FF8CAF]">E {report.hormones.e}</span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#534AB7]/15 text-[#534AB7]">P {report.hormones.p}</span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D85A30]/15 text-[#D85A30]">T {report.hormones.t}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full sm:w-auto text-left sm:text-right flex-shrink-0">
                    <div className="flex items-end justify-between gap-4 sm:block">
                      <p className="text-xs font-black tracking-widest uppercase mb-1.5" style={{ color: accent }}>{report.edge.name}</p>
                      <p className="dashboard-edge-value font-serif">{report.edge.pct}%</p>
                    </div>
                    <div className="mt-3 w-full sm:w-28 h-2 bg-[#2D2D2D]/5 rounded-full overflow-hidden sm:ml-auto">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${report.edge.pct}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ backgroundColor: accent }}
                      />
                    </div>
                  </div>
                </div>

                {/* Hormone curve (now with T) */}
                <HormoneCurve cycleDay={phaseInfo.cycleDay} cycleLength={profile.cycleLength} />
              </div>

              {/* Snapshot card */}
              {report.snapshot && (
                <aside className="dashboard-snapshot-card bg-white/92 rounded-[32px] border border-[#2D2D2D]/7 shadow-[0_18px_50px_rgba(45,45,45,0.05)]">
                  <div className="flex items-end justify-between gap-4 pb-5 border-b border-[#2D2D2D]/7">
                    <div>
                      <p className="text-xs font-black tracking-[0.2em] text-[#2D2D2D]/40 uppercase">
                        {lang === 'zh' ? '今日状态' : "Today's State"}
                      </p>
                      <p className="mt-2 font-serif dashboard-snapshot-title text-[#2D2D2D]/85">
                        {lang === 'zh' ? '身体信号索引' : 'Body signal index'}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[#2D2D2D]/30">05</span>
                  </div>
                  <div className="dashboard-snapshot-grid">
                    {(lang === 'zh' ? [
                      { key: '精力', value: report.snapshot.energy, accent: '#B8722A', bg: '#FDF4E8' },
                      { key: '体温', value: report.snapshot.temp,   accent: '#5B4B8A', bg: '#EFEAF7' },
                      { key: '体重', value: report.snapshot.weight, accent: '#2D7A52', bg: '#E8F5EE' },
                      { key: '皮肤', value: report.snapshot.skin,   accent: '#A8344A', bg: '#FCE8EC' },
                      { key: '情绪', value: report.snapshot.mood,   accent: '#B8542A', bg: '#FCEBE3' },
                    ] : [
                      { key: 'Energy', value: report.snapshot.energy, accent: '#B8722A', bg: '#FDF4E8' },
                      { key: 'Temp',   value: report.snapshot.temp,   accent: '#5B4B8A', bg: '#EFEAF7' },
                      { key: 'Weight', value: report.snapshot.weight, accent: '#2D7A52', bg: '#E8F5EE' },
                      { key: 'Skin',   value: report.snapshot.skin,   accent: '#A8344A', bg: '#FCE8EC' },
                      { key: 'Mood',   value: report.snapshot.mood,   accent: '#B8542A', bg: '#FCEBE3' },
                    ]).map((row, idx) => (
                      <motion.div
                        key={row.key}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="dashboard-snapshot-item"
                        style={{ backgroundColor: row.bg }}
                      >
                        <p className="dashboard-snapshot-item-label" style={{ color: row.accent }}>{row.key}</p>
                        <p className="dashboard-snapshot-item-copy">{row.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </aside>
              )}
            </div>

            <div className="dashboard-below-fold">
              <SynergyCard currentPhase={phaseInfo.phase} lang={lang} />
            </div>

            {/* 4 pillar cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pillars.map((p, i) => {
                const Icon = p.icon;
                const isOpen = openPillar === i;
                const isWhyOpen = openWhy === i;
                const desc = p.content.bioDesc ?? p.content.body ?? '';
                return (
                  <motion.div key={p.label}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-[32px] border border-[#2D2D2D]/8 overflow-hidden"
                  >
                    <div className="h-[4px]" style={{ backgroundColor: p.sub }} />

                    {/* Clickable header */}
                    <button
                      className="w-full px-9 pt-8 pb-8 text-left"
                      onClick={() => { setOpenPillar(isOpen ? null : i); setOpenWhy(null); }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color }}>
                            <Icon className="w-4.5 h-4.5" style={{ color: p.sub }} />
                          </div>
                          <span className="text-xs font-black tracking-[0.18em] uppercase" style={{ color: p.sub, opacity: 0.7 }}>{p.label}</span>
                        </div>
                        <div className="opacity-25">
                          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                      <h4 className="text-2xl font-serif leading-snug" style={{ color: p.text }}>{p.content.headline}</h4>
                    </button>

                    {/* Collapsible: bioDesc + actions + avoid + science */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mx-9 border-t border-[#2D2D2D]/6" />
                          <div className="px-9 pb-9 pt-7 space-y-6">
                            {desc && (
                              <p className="text-[15px] leading-[1.8] text-[#2D2D2D]/55">{desc}</p>
                            )}
                            {p.content.actions && p.content.actions.length > 0 && (
                              <div className="space-y-6">
                                {p.content.actions.map(group => (
                                  <div key={group.title}>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] mb-3" style={{ color: p.sub, opacity: 0.6 }}>{group.title}</p>
                                    <ul className="space-y-2.5">
                                      {group.items.map(item => (
                                        <li key={item} className="flex gap-3 text-[15px] leading-snug text-[#2D2D2D]/70">
                                          <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.sub, opacity: 0.5 }} />
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!p.content.actions?.length && p.content.body && (
                              <p className="text-[15px] leading-[1.8] text-[#2D2D2D]/65">{p.content.body}</p>
                            )}
                            {p.content.avoid && (
                              <div className="flex gap-4 rounded-2xl px-6 py-5 text-[15px] leading-relaxed" style={{ backgroundColor: p.color }}>
                                <span className="font-bold flex-shrink-0" style={{ color: p.sub, opacity: 0.7 }}>{lang === 'zh' ? '避免' : 'Avoid'}</span>
                                <span className="text-[#2D2D2D]/60">{p.content.avoid}</span>
                              </div>
                            )}
                            <div>
                              <button
                                className="flex items-center gap-2.5 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-100"
                                style={{ color: p.sub, opacity: 0.45 }}
                                onClick={e => { e.stopPropagation(); setOpenWhy(isWhyOpen ? null : i); }}
                              >
                                {isWhyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {isWhyOpen ? d.whyHide : d.whyShow}
                              </button>
                              <AnimatePresence>
                                {isWhyOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                    className="mt-4 rounded-2xl p-6 space-y-4"
                                    style={{ backgroundColor: p.color }}
                                  >
                                    <p className="text-[15px] leading-[1.8] text-[#2D2D2D]/60">{p.content.mechanism ?? p.content.why}</p>
                                    {p.content.papers && p.content.papers.length > 0 && (
                                      <ul className="space-y-1.5 pt-4 border-t border-[#2D2D2D]/8">
                                        {p.content.papers.map(paper => (
                                          <li key={paper} className="text-xs font-mono text-[#2D2D2D]/35">{paper}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-[#2D2D2D]/40 font-bold uppercase tracking-widest">{label}</p>
      <p className={`dashboard-body-text font-medium ${accent ? 'text-[#FF8CAF]' : ''}`}>{value}</p>
    </div>
  );
}

function HormoneCurve({ cycleDay, cycleLength }: { cycleDay: number; cycleLength: number }) {
  const { dashboard: d } = useT();
  const W = 400, H = 100;
  const pct = (cycleDay - 1) / (cycleLength - 1);
  const tx = pct * W;

  const estrogenY = (x: number) => {
    const t = x / W;
    if (t < 0.18) return 80 - t * 55;
    if (t < 0.52) return 80 - 10 - Math.sin(((t - 0.18) / 0.34) * Math.PI) * 62;
    return 80 - 10 + (t - 0.52) * 70;
  };
  const progesteroneY = (x: number) => {
    const t = x / W;
    if (t < 0.5) return 85;
    if (t < 0.8) return 85 - Math.sin(((t - 0.5) / 0.3) * Math.PI) * 52;
    return 85 + (t - 0.8) * 20;
  };
  // Testosterone: rises through follicular, peaks near ovulation, moderate decline through luteal
  const testosteroneY = (x: number) => {
    const t = x / W;
    if (t < 0.13) return 76;
    if (t < 0.55) return 76 - (1 - Math.cos(((t - 0.13) / 0.42) * Math.PI)) * 22;
    return 54 + (1 - Math.cos(((t - 0.55) / 0.45) * Math.PI)) * 11;
  };

  const buildPath = (fn: (x: number) => number) => {
    let d = '';
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * W;
      const y = Math.max(4, Math.min(96, fn(x)));
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    return d;
  };

  const ey = Math.max(4, Math.min(96, estrogenY(tx)));
  const py = Math.max(4, Math.min(96, progesteroneY(tx)));
  const ty = Math.max(4, Math.min(96, testosteroneY(tx)));
  const phaseMarkers = [
    { label: 'RESET', x: W * 0.1 },
    { label: 'RISE', x: W * 0.3 },
    { label: 'PEAK', x: W * 0.5 },
    { label: 'FOCUS', x: W * 0.7 },
    { label: 'RESET', x: W * 0.9 },
  ];

  return (
    <div className="hormone-curve-panel w-full relative bg-[#F9F7F2]/50 rounded-[24px] sm:rounded-[32px] p-5 sm:p-7 border border-[#2D2D2D]/5 overflow-hidden">
      {/* Phase band labels */}
      <div className="absolute inset-x-0 bottom-3 flex px-7 text-[10px] font-semibold tracking-[0.1em] text-[#4A4A4A]">
        {phaseMarkers.map((marker, i) => (
          <span key={`${marker.label}-${i}`} className="flex-1 text-center">{marker.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full fill-none overflow-visible">
        {phaseMarkers.map((marker, i) => (
          <line
            key={`${marker.label}-line-${i}`}
            x1={marker.x}
            y1="2"
            x2={marker.x}
            y2="86"
            stroke="#2D2D2D"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.25"
          />
        ))}
        <path d={buildPath(estrogenY)}     stroke="#E84A7C" strokeWidth="3.5" />
        <path d={buildPath(progesteroneY)} stroke="#D87838" strokeWidth="3.2" strokeDasharray="4 3" />
        <path d={buildPath(testosteroneY)} stroke="#6B5DB0" strokeWidth="3" strokeDasharray="3 3" />
        <line x1={tx} y1="0" x2={tx} y2={H} stroke="#2D2D2D" strokeWidth="1" strokeDasharray="4 2" opacity="0.2" />
        <circle cx={tx} cy={ey} r="5" fill="#E84A7C" className="animate-pulse" />
        <circle cx={tx} cy={py} r="4" fill="#D87838" />
        <circle cx={tx} cy={ty} r="3.5" fill="#6B5DB0" />
      </svg>
      {/* Legend */}
      <div className="absolute top-4 right-5 flex gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium text-[#4A4A4A]">
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] bg-[#E84A7C] inline-block rounded" />{d.estrogen}</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] border-t-[3px] border-dashed border-[#D87838] inline-block" style={{ width: 16 }} />{d.progesterone}</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] border-t-[3px] border-dashed border-[#6B5DB0] inline-block" style={{ width: 16 }} />{d.testosterone}</span>
      </div>
    </div>
  );
}

const SYNERGY_DATA = [
  {
    phase: 'RESET' as const,
    color: '#E8F5EE', accent: '#2D7A52',
    e: '↓', p: '↓', t: '↓',
    zh: '三线低谷，优先修复 + 补铁，减少炎症负担',
    en: 'All three hormones low — rest, repair, prioritize iron',
  },
  {
    phase: 'RISE' as const,
    color: '#FDF1E8', accent: '#B8632A',
    e: '↑↑', p: '—', t: '↑',
    zh: 'E+T 协同：专注力 + 脂燃达月峰，力量增长窗口',
    en: 'E+T rise together: peak fat-burn, cognitive clarity, strength gains',
  },
  {
    phase: 'PEAK' as const,
    color: '#FCE8EC', accent: '#A8344A',
    e: '↑↑↑', p: '—', t: '↑↑',
    zh: 'E+T 双峰：最强力量输出，社交能量与风险容忍最高',
    en: 'E+T dual-peak: max strength, social drive, risk tolerance',
  },
  {
    phase: 'FOCUS' as const,
    color: '#EFEAF7', accent: '#5B4B8A',
    e: '↓', p: '↑↑', t: '↓',
    zh: 'P 主导：深度专注，体温升 0.3°C，热量需求 +200kcal',
    en: 'Progesterone dominant: deep focus, +0.3°C BBT, +200kcal needs',
  },
];

function SynergyCard({ currentPhase, lang }: { currentPhase: string; lang: string }) {
  return (
    <section className="hormone-synergy-card bg-white/92 rounded-[32px] border border-[#2D2D2D]/7 shadow-[0_14px_36px_rgba(45,45,45,0.05)]">
      <p className="text-xs font-black tracking-[0.22em] text-[#2D2D2D]/35 uppercase">
        {lang === 'zh' ? '激素协同' : 'Hormone Synergy'}
      </p>
      <div className="hormone-synergy-grid">
        {SYNERGY_DATA.map(item => {
          const isCurrent = item.phase === currentPhase;
          return (
            <div
              key={item.phase}
              className="synergy-phase-card rounded-[18px] transition-all"
              style={{
                backgroundColor: item.color,
                borderColor: isCurrent ? item.accent : 'rgba(45,45,45,0.04)',
                boxShadow: isCurrent ? `0 10px 24px ${item.accent}24` : undefined,
              }}
            >
              <p className="synergy-phase-name" style={{ color: item.accent }}>{item.phase}</p>
              <div className="synergy-metrics" style={{ color: item.accent }}>
                <span>E<span className="synergy-arrow">{item.e}</span></span>
                <span>P<span className="synergy-arrow">{item.p}</span></span>
                <span>T<span className="synergy-arrow">{item.t}</span></span>
              </div>
              <p className="synergy-description">
                {lang === 'zh' ? item.zh : item.en}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
