import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CalendarDays, ChevronLeft, MapPin, Moon, UserRound } from 'lucide-react';
import { setProfile, setTodayLog } from '../lib/store';
import { getTodayStr } from '../lib/cycleEngine';
import { useLang, useT } from '../lib/i18n';
import { LangToggle } from '../components/LangToggle';
import type { FitnessLevel, Objective, Diet, UserProfile } from '../lib/types';

const PHASE_CARDS = [
  { name: 'RISE',  color: '#FAECE7', bars: [40, 65, 90] },
  { name: 'PEAK',  color: '#FAEEDA', bars: [85, 100, 70] },
  { name: 'FOCUS', color: '#EEEDFE', bars: [50, 80, 95] },
  { name: 'RESET', color: '#E1F5EE', bars: [45, 25, 40] },
];

const CITY_SUGGESTIONS = {
  en: ['Shanghai', 'Beijing', 'Shenzhen', 'Hangzhou'],
  zh: ['上海', '北京', '深圳', '杭州'],
};

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface FormData {
  city: string;
  periodDate: string;
  cycleLength: number;
  age: number;
  sleepHours: number;
  fitness: FitnessLevel | '';
  objective: Objective[];
  diet: Diet | '';
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const t = useT();
  const o = t.onboarding;
  const [lang] = useLang();
  const isZh = lang === 'zh';

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    city: '',
    periodDate: '',
    cycleLength: 28,
    age: 27,
    sleepHours: 7,
    fitness: '',
    objective: [],
    diet: '',
  });
  const [error, setError] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const totalSteps = 3;
  const panelCopy = isZh ? [
    { kicker: '01 / 周期校准', title: '先定位你的身体时钟', sub: '这些数据会生成你的第一份今日激素周期报告。' },
    { kicker: '02 / 行动偏好', title: '告诉 Option 你如何使用身体', sub: '运动频率和目标会影响训练、皮肤与情绪建议。' },
    { kicker: '03 / 饮食边界', title: '最后校准营养建议', sub: '饮食偏好会决定推荐的食物和补充方向。' },
  ] : [
    { kicker: '01 / Cycle calibration', title: 'Set your body clock', sub: 'These inputs generate your first hormone-cycle report.' },
    { kicker: '02 / Action profile', title: 'Tell Option how you use your body', sub: 'Fitness and goals tune your training, skin, and mood guidance.' },
    { kicker: '03 / Nutrition boundary', title: 'Calibrate nutrition last', sub: 'Diet preferences shape food and recovery recommendations.' },
  ];

  const validate = () => {
    if (step === 1) {
      if (!form.city.trim()) { setError(o.errors.noCity); return false; }
      if (!form.periodDate) { setError(o.errors.noPeriodDate); return false; }
      if (form.cycleLength < 21 || form.cycleLength > 45) { setError(o.errors.invalidCycleLength); return false; }
      if (form.age < 18 || form.age > 55) { setError(o.errors.invalidAge); return false; }
    }
    if (step === 2) {
      if (!form.fitness)              { setError(o.errors.noFitness);   return false; }
      if (form.objective.length === 0) { setError(o.errors.noObjective); return false; }
    }
    if (step === 3) {
      if (!form.diet) { setError(o.errors.noDiet); return false; }
    }
    setError('');
    return true;
  };

  const next = () => {
    if (!validate()) return;
    if (step < totalSteps) { setStep(s => s + 1); return; }
    const profile: UserProfile = {
      city:        form.city.trim(),
      periodDate:  form.periodDate,
      cycleLength: form.cycleLength,
      age:         form.age,
      fitness:     form.fitness as FitnessLevel,
      objective:   form.objective,
      diet:        form.diet as Diet,
    };
    setProfile(profile);
    setTodayLog({ date: getTodayStr(), sleepHours: form.sleepHours });
    onComplete();
  };

  const back = () => { setStep(s => s - 1); setError(''); };

  return (
    <div className="onboarding-shell bg-[#8fb4c9] bg-[radial-gradient(circle_at_14%_12%,rgba(246,184,197,0.32),transparent_32%),radial-gradient(circle_at_86%_82%,rgba(220,239,247,0.52),transparent_34%)]">
      {/* Left panel */}
      <div className="onboarding-intro">
        <div className="onboarding-intro-card rounded-[36px] border border-white/42 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),rgba(220,239,247,0.18)_48%,rgba(246,184,197,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_18px_48px_rgba(68,103,126,0.14)] backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-5">
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-[0.22em] text-[#30485A]/50 uppercase">
                {o.step} {step} {o.of} {totalSteps}
              </p>
              <h2 className="text-2xl lg:text-5xl font-serif leading-none text-[#172F42]">{o.stepTitles[step - 1]}</h2>
              <p className="hidden lg:block max-w-md leading-relaxed text-[#30485A]/72">{o.stepSubtitles[step - 1]}</p>
            </div>
            <LangToggle className="flex-shrink-0 mt-1" />
          </div>
        </div>

        <div className="onboarding-phase-cards grid-cols-2 gap-3">
          {PHASE_CARDS.map(phase => (
            <motion.div
              key={phase.name}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-[24px] border border-white/38 bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.46)] backdrop-blur-xl"
            >
              <div className="mb-3 flex h-7 w-10 items-end gap-0.5">
                {phase.bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-[#172F42]/18" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="text-xs font-bold tracking-widest text-[#30485A]/62">{phase.name}</p>
            </motion.div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="hidden lg:flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i < step ? 'bg-[#172F42] flex-[2]' : 'bg-white/38 flex-1'}`} />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="onboarding-panel">
        <div className="onboarding-card mx-auto w-full max-w-[820px] rounded-[38px] border border-white/42 bg-white/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_24px_64px_rgba(68,103,126,0.16)] backdrop-blur-2xl">
          <div ref={contentRef} className="onboarding-content space-y-4" role="region" aria-label={o.stepTitles[step - 1]} tabIndex={0}>
          <div className="flex items-end justify-between gap-5 border-b border-white/36 pb-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#30485A]/45">{panelCopy[step - 1].kicker}</p>
              <h3 className="mt-2 text-2xl font-serif leading-tight text-[#172F42] sm:text-3xl">{panelCopy[step - 1].title}</h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#30485A]/66">{panelCopy[step - 1].sub}</p>
            </div>
            <div className="hidden rounded-full border border-white/44 bg-white/24 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#30485A]/58 sm:block">
              {String(step).padStart(2, '0')} / 03
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[28px] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.32),rgba(220,239,247,0.18))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)]">
                      <Field label={o.fields.city}>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#30485A]/38" />
                          <input
                            className="input-field input-field-with-icon bg-white/52 border-white/48"
                            value={form.city}
                            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                            placeholder={o.fields.cityPlaceholder}
                          />
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-1.5">
                          {CITY_SUGGESTIONS[isZh ? 'zh' : 'en'].map(city => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, city }))}
                              className="whitespace-nowrap rounded-full border border-white/45 bg-white/34 px-1.5 py-1.5 text-[11px] font-semibold text-[#30485A]/72 transition-colors hover:bg-[#F6B8C5]/24"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                    <div className="rounded-[28px] border border-white/45 bg-white/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <Field label={o.fields.periodDate}>
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#30485A]/38" />
                          <input
                            type="date"
                            className="input-field input-field-with-icon bg-white/42 border-white/40"
                            value={form.periodDate}
                            max={getTodayStr()}
                            onChange={e => setForm(f => ({ ...f, periodDate: e.target.value }))}
                          />
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-1.5">
                          {[
                            { days: 0, label: isZh ? '今天' : 'Today' },
                            { days: 7, label: isZh ? '7 天前' : '7d ago' },
                            { days: 14, label: isZh ? '14 天前' : '14d ago' },
                            { days: 28, label: isZh ? '28 天前' : '28d ago' },
                          ].map(item => (
                            <button
                              key={item.days}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, periodDate: dateDaysAgo(item.days) }))}
                              className="whitespace-nowrap rounded-full border border-white/45 bg-white/30 px-1.5 py-1.5 text-[11px] font-semibold text-[#30485A]/72 transition-colors hover:bg-[#F6B8C5]/24"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[28px] border border-white/45 bg-white/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <Field label={o.fields.cycleLength}>
                        <NumberControl plain value={form.cycleLength} min={21} max={45} unit={o.fields.days} onChange={cycleLength => setForm(f => ({ ...f, cycleLength }))} />
                      </Field>
                    </div>
                    <div className="rounded-[28px] border border-white/45 bg-white/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <Field label={o.fields.age}>
                        <NumberControl plain icon={<UserRound className="h-4 w-4" />} value={form.age} min={18} max={55} onChange={age => setForm(f => ({ ...f, age }))} />
                      </Field>
                    </div>
                    <div className="rounded-[28px] border border-white/45 bg-white/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <Field label={o.fields.lastSleep}>
                        <NumberControl plain icon={<Moon className="h-4 w-4" />} value={form.sleepHours} min={3} max={12} step={0.5} unit={t.hours} onChange={sleepHours => setForm(f => ({ ...f, sleepHours }))} />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label={o.fitness.label}>
                    <OptionGrid
                      options={o.fitness.options}
                      value={form.fitness}
                      onChange={v => setForm(f => ({ ...f, fitness: v as FitnessLevel }))}
                      cols={2}
                    />
                  </Field>
                  <Field label={o.objective.label}>
                    <ObjectiveMultiGrid
                      options={o.objective.options}
                      value={form.objective}
                      onChange={v => setForm(f => ({ ...f, objective: v }))}
                    />
                  </Field>
                </>
              )}

              {step === 3 && (
                <Field label={o.diet.label}>
                  <OptionGrid
                    options={o.diet.options}
                    value={form.diet}
                    onChange={v => setForm(f => ({ ...f, diet: v as Diet }))}
                    cols={2}
                  />
                </Field>
              )}
            </motion.div>
          </AnimatePresence>
          </div>

          <div className="onboarding-actions">
          {error && (
            <motion.p role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 rounded-2xl border border-[#F6B8C5]/35 bg-[#F6B8C5]/16 px-4 py-3 text-sm font-semibold text-[#A8344A]">
              {error}
            </motion.p>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button onClick={back} className="flex items-center gap-2 rounded-full border border-white/44 bg-white/24 px-6 py-4 font-semibold text-[#30485A]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)] transition-all hover:bg-white/36">
                <ChevronLeft className="w-4 h-4" /> {t.back}
              </button>
            )}
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-3 rounded-full bg-[#172F42] py-5 text-lg font-bold text-[#FFF7FB] shadow-[0_14px_28px_rgba(23,47,66,0.22)] transition-all hover:bg-[#243746]"
            >
              {step < totalSteps ? t.continue : o.finishCta}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: import('react').ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-[#30485A]/50">{label}</label>
      {children}
    </div>
  );
}

function NumberControl({ icon, value, min, max, step = 1, unit, plain = false, onChange }: {
  icon?: import('react').ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  plain?: boolean;
  onChange: (value: number) => void;
}) {
  const update = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    onChange(Number(clamped.toFixed(1)));
  };

  return (
    <div className={plain ? '' : 'rounded-2xl border border-white/48 bg-white/36 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#30485A]/55">
          {icon}
          <span className="text-sm font-bold text-[#172F42]">
            {value}{unit ? ` ${unit}` : ''}
          </span>
        </div>
        <div className="flex overflow-hidden rounded-full border border-[#8FB4C9]/28 bg-white/34">
          <button
            type="button"
            onClick={() => update(value - step)}
            className="h-8 w-9 text-lg font-semibold text-[#30485A]/70 transition-colors hover:bg-[#DCEFF7]/45"
            aria-label="Decrease"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => update(value + step)}
            className="h-8 w-9 border-l border-[#8FB4C9]/20 text-lg font-semibold text-[#30485A]/70 transition-colors hover:bg-[#F6B8C5]/24"
            aria-label="Increase"
          >
            +
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => update(+event.target.value)}
        className="w-full accent-[#F6B8C5]"
      />
    </div>
  );
}

function OptionGrid({ options, value, onChange, cols }: {
  options: readonly { value: string; label: string; sub: string; wide?: boolean }[];
  value: string;
  onChange: (v: string) => void;
  cols: number;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={opt.wide ? { gridColumn: `span ${cols}` } : {}}
          className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
            value === opt.value
              ? 'border-[#8FB4C9]/45 bg-[#172F42] text-white shadow-[0_12px_24px_rgba(23,47,66,0.16)]'
              : 'border-white/42 bg-white/34 text-[#172F42] hover:border-[#F6B8C5]/42 hover:bg-[#F6B8C5]/14'
          }`}
        >
          <p className={`font-bold text-sm ${value === opt.value ? 'text-white' : 'text-[#2D2D2D]'}`}>{opt.label}</p>
          <p className={`text-xs mt-0.5 ${value === opt.value ? 'text-white/60' : 'text-[#2D2D2D]/50'}`}>{opt.sub}</p>
        </button>
      ))}
    </div>
  );
}

function ObjectiveMultiGrid({ options, value, onChange }: {
  options: readonly { value: string; label: string; sub: string; wide?: boolean }[];
  value: Objective[];
  onChange: (v: Objective[]) => void;
}) {
  const toggle = (v: string) => {
    if (v === 'all') { onChange(['all']); return; }
    type Core = 'career' | 'body' | 'skin' | 'mood';
    const without = value.filter(x => x !== 'all') as Core[];
    const next: Core[] = without.includes(v as Core)
      ? without.filter(x => x !== v)
      : [...without, v as Core];
    onChange(next);
  };
  const isActive = (v: string) =>
    v === 'all' ? value.includes('all') : !value.includes('all') && value.includes(v as Objective);

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          style={opt.wide ? { gridColumn: 'span 2' } : {}}
          className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${
            isActive(opt.value)
              ? 'border-[#8FB4C9]/45 bg-[#172F42] text-white shadow-[0_12px_24px_rgba(23,47,66,0.16)]'
              : 'border-white/42 bg-white/34 text-[#172F42] hover:border-[#F6B8C5]/42 hover:bg-[#F6B8C5]/14'
          }`}
        >
          <p className={`font-bold text-sm ${isActive(opt.value) ? 'text-white' : 'text-[#2D2D2D]'}`}>{opt.label}</p>
          <p className={`text-xs mt-0.5 ${isActive(opt.value) ? 'text-white/60' : 'text-[#2D2D2D]/50'}`}>{opt.sub}</p>
        </button>
      ))}
    </div>
  );
}

