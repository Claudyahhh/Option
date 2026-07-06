import { useState } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, User, Target, Utensils, Activity, Pencil, Check, X } from 'lucide-react';
import { useAppState, resetApp, updateProfile } from '../lib/store';
import { getCycleDay, getPhaseInfo, getAgeBracket, getTodayStr } from '../lib/cycleEngine';
import { useT } from '../lib/i18n';
import { LangToggle } from '../components/LangToggle';
import type { FitnessLevel, Objective } from '../lib/types';


export function Profile({ onReset }: { onReset: () => void }) {
  const [state] = useAppState();
  const t = useT();
  const p = t.profile;
  const profile = state.profile;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    periodDate: profile?.periodDate ?? '',
    cycleLength: profile?.cycleLength ?? 28,
    fitness: profile?.fitness ?? 'sometimes' as FitnessLevel,
    objective: profile?.objective ?? ['all'] as Objective[],
  });

  if (!profile) return null;

  const cycleDay  = getCycleDay(profile.periodDate, profile.cycleLength);
  const phaseInfo = getPhaseInfo(cycleDay, profile.cycleLength);
  const bracket   = getAgeBracket(profile.age);

  const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
    RISE:  { bg: '#FAECE7', text: '#D85A30' },
    PEAK:  { bg: '#FAEEDA', text: '#FF8CAF' },
    FOCUS: { bg: '#EEEDFE', text: '#534AB7' },
    RESET: { bg: '#E1F5EE', text: '#085041' },
  };
  const col = PHASE_COLORS[phaseInfo.phase];

  const handleReset = () => {
    if (window.confirm(p.resetConfirm)) {
      resetApp();
      onReset();
    }
  };

  const startEdit = () => {
    setEditForm({
      periodDate: profile.periodDate,
      cycleLength: profile.cycleLength,
      fitness: profile.fitness,
      objective: profile.objective,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateProfile(editForm);
    setIsEditing(false);
  };

  return (
    <div className="p-8 lg:p-12 space-y-10 overflow-y-auto max-h-screen">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h2 className="text-4xl font-serif">{p.title}</h2>
          <p className="text-[#2D2D2D]/50 text-sm">{p.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LangToggle />
          {/* Edit toggle */}
          {!isEditing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-[#2D2D2D]/10 rounded-full text-sm font-medium text-[#2D2D2D]/60 hover:border-[#FF8CAF]/40 hover:text-[#2D2D2D] transition-all"
            >
              <Pencil className="w-4 h-4" /> {p.editProfile}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="flex items-center gap-2 px-5 py-3 bg-[#2D2D2D] text-white rounded-full text-sm font-bold hover:shadow-lg transition-all"
              >
                <Check className="w-4 h-4" /> {t.save}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-3 border border-[#2D2D2D]/10 rounded-full text-sm font-medium text-[#2D2D2D]/50 hover:bg-black/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Current status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="paper-card rounded-[40px] p-10 border border-[#2D2D2D]/5 relative overflow-hidden"
        style={{ backgroundColor: col.bg }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 -mr-16 -mt-16" style={{ backgroundColor: col.text }} />
        <div className="relative z-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Current Phase',  value: phaseInfo.phase },
            { label: 'Sub-phase',      value: phaseInfo.subPhase },
            { label: 'Cycle Day',      value: `Day ${cycleDay} of ${profile.cycleLength}` },
            { label: 'Next Phase',     value: `${phaseInfo.nextPhase} in ${phaseInfo.daysUntilNextPhase} day${phaseInfo.daysUntilNextPhase !== 1 ? 's' : ''}` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] font-black tracking-widest opacity-40 mb-1" style={{ color: col.text }}>{s.label.toUpperCase()}</p>
              <p className="text-xl font-serif" style={{ color: col.text }}>{s.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Profile details */}
      <div className="grid md:grid-cols-2 gap-6">
        <ProfileCard icon={User} title={p.cards.cycleData}>
          <Row label={p.rows.city} value={profile.city} />
          <Row label={p.rows.age} value={`${profile.age} (${p.rows.ageBracketLabel(bracket)})`} />

          {isEditing ? (
            <>
              <EditRow label="Last Period Start">
                <input
                  type="date"
                  className="input-field"
                  value={editForm.periodDate}
                  max={getTodayStr()}
                  onChange={e => setEditForm(f => ({ ...f, periodDate: e.target.value }))}
                />
              </EditRow>
              <EditRow label={`Cycle Length: ${editForm.cycleLength} days`}>
                <div className="flex items-center gap-4 h-12 bg-[#ADCBE3]/10 border border-[#2D2D2D]/10 rounded-2xl px-4">
                  <input
                    type="range" min={21} max={45} value={editForm.cycleLength}
                    onChange={e => setEditForm(f => ({ ...f, cycleLength: +e.target.value }))}
                    className="flex-1 accent-[#FF8CAF]"
                  />
                  <span className="font-bold text-sm w-8 text-right">{editForm.cycleLength}</span>
                </div>
              </EditRow>
            </>
          ) : (
            <>
              <Row label={p.rows.lastPeriod} value={(() => { const [y,m,d] = profile.periodDate.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); })()} />
              <Row label={p.rows.cycleLength} value={p.rows.daysCycle(profile.cycleLength)} />
            </>
          )}
        </ProfileCard>

        <ProfileCard icon={Target} title={p.cards.goalsPrefs}>
          {isEditing ? (
            <>
              <EditRow label={p.rows.fitness}>
                <div className="grid grid-cols-2 gap-2">
                  {p.editFitnessOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setEditForm(f => ({ ...f, fitness: opt.value }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        editForm.fitness === opt.value
                          ? 'bg-[#2D2D2D] text-white border-[#2D2D2D]'
                          : 'border-[#2D2D2D]/10 text-[#2D2D2D]/60 hover:border-[#FF8CAF]/40'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </EditRow>
              <EditRow label={p.rows.objective}>
                <div className="grid grid-cols-2 gap-2">
                  {p.editObjectiveOptions.map(opt => {
                    const isActive = opt.value === 'all'
                      ? editForm.objective.includes('all')
                      : !editForm.objective.includes('all') && editForm.objective.includes(opt.value as Objective);
                    const toggle = () => {
                      if (opt.value === 'all') { setEditForm(f => ({ ...f, objective: ['all'] })); return; }
                      const without = editForm.objective.filter(x => x !== 'all');
                      const next = without.includes(opt.value as Objective)
                        ? without.filter(x => x !== opt.value)
                        : [...without, opt.value as Objective];
                      setEditForm(f => ({ ...f, objective: next.length ? next : ['all'] }));
                    };
                    return (
                      <button
                        key={opt.value}
                        onClick={toggle}
                        style={opt.value === 'all' ? { gridColumn: 'span 2' } : {}}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#2D2D2D] text-white border-[#2D2D2D]'
                            : 'border-[#2D2D2D]/10 text-[#2D2D2D]/60 hover:border-[#FF8CAF]/40'
                        }`}
                      >{opt.label}</button>
                    );
                  })}
                </div>
              </EditRow>
            </>
          ) : (
            <>
              <Row label={p.rows.objective} value={
                profile.objective.includes('all')
                  ? p.objective.all
                  : profile.objective.map(o => p.objective[o] ?? o).join(' · ')
              } />
              <Row label={p.rows.fitness}   value={p.fitness[profile.fitness] ?? profile.fitness} />
              <Row label={p.rows.diet}      value={p.diet[profile.diet] ?? profile.diet} />
            </>
          )}
        </ProfileCard>

        <ProfileCard icon={Activity} title={p.cards.cycleIntelligence}>
          <Row label={p.rows.logsRecorded}  value={p.rows.days(state.dailyLogs.length)} />
          <Row label={p.rows.debriefCount}  value={`${state.dailyLogs.filter(l => l.debriefRating).length}`} />
          <Row label={p.rows.calibration}   value={state.dailyLogs.length >= 3 ? p.rows.calibActive : p.rows.calibPending(state.dailyLogs.length)} />
        </ProfileCard>

        <ProfileCard icon={Utensils} title={p.cards.ageBracket}>
          {p.ageBrackets[bracket] && <>
            <Row label={p.rows.training}  value={p.ageBrackets[bracket].training} />
            <Row label={p.rows.skin}      value={p.ageBrackets[bracket].skin} />
            <Row label={p.rows.nutrition} value={p.ageBrackets[bracket].nutrition} />
          </>}
        </ProfileCard>
      </div>

      {/* Reset */}
      <div className="flex justify-start">
        <button
          onClick={handleReset}
          className="flex items-center gap-3 px-7 py-4 border border-[#2D2D2D]/10 rounded-full text-sm font-medium text-[#2D2D2D]/50 hover:border-red-300 hover:text-red-500 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          {p.resetAll}
        </button>
      </div>
    </div>
  );
}

function ProfileCard({ icon: Icon, title, children }: { icon: import('react').ElementType; title: string; children: import('react').ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="paper-card p-7 rounded-[32px] border border-[#2D2D2D]/5 bg-white space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#ADCBE3]/20 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#2D2D2D]/60" />
        </div>
        <h3 className="font-serif text-xl">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#2D2D2D]/5 last:border-0">
      <span className="text-xs font-bold text-[#2D2D2D]/40 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-medium text-[#2D2D2D]">{value}</span>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: import('react').ReactNode }) {
  return (
    <div className="space-y-1.5 py-2 border-b border-[#2D2D2D]/5 last:border-0">
      <span className="text-xs font-bold text-[#2D2D2D]/40 uppercase tracking-widest">{label}</span>
      {children}
    </div>
  );
}
