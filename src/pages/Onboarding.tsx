import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { setProfile, setTodayLog } from '../lib/store';
import { getTodayStr } from '../lib/cycleEngine';
import { useT } from '../lib/i18n';
import { LangToggle } from '../components/LangToggle';
import type { FitnessLevel, Objective, Diet, UserProfile } from '../lib/types';

const PHASE_CARDS = [
  { name: 'RISE',  color: '#FAECE7', bars: [40, 65, 90] },
  { name: 'PEAK',  color: '#FAEEDA', bars: [85, 100, 70] },
  { name: 'FOCUS', color: '#EEEDFE', bars: [50, 80, 95] },
  { name: 'RESET', color: '#E1F5EE', bars: [45, 25, 40] },
];

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

  const totalSteps = 3;

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
    <div className="flex flex-col lg:flex-row h-screen bg-white">
      {/* Left panel */}
      <div className="w-full lg:w-[42%] bg-[#F9F7F2] p-12 lg:p-20 flex flex-col justify-center gap-10 border-r border-[#2D2D2D]/5 paper-card">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-[0.2em] text-[#2D2D2D]/40 uppercase">
              {o.step} {step} {o.of} {totalSteps}
            </p>
            <h2 className="text-5xl font-serif text-[#2D2D2D]">{o.stepTitles[step - 1]}</h2>
            <p className="text-[#2D2D2D]/60 max-w-md leading-relaxed">{o.stepSubtitles[step - 1]}</p>
          </div>
          <LangToggle className="flex-shrink-0 mt-1" />
        </div>

        <div className="space-y-3">
          {PHASE_CARDS.map(phase => (
            <motion.div
              key={phase.name}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-3xl flex items-center gap-5"
              style={{ backgroundColor: phase.color }}
            >
              <div className="flex items-end gap-0.5 h-7 w-10 flex-shrink-0">
                {phase.bars.map((h, i) => (
                  <div key={i} className="flex-1 bg-black/10 rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div>
                <p className="font-bold text-xs tracking-widest text-[#2D2D2D]/50">{phase.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i < step ? 'bg-[#2D2D2D] flex-[2]' : 'bg-[#2D2D2D]/10 flex-1'}`} />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center bg-white">
        <div className="max-w-xl mx-auto w-full space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {step === 1 && (
                <>
                  <Field label={o.fields.city}>
                    <input
                      className="input-field"
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder={o.fields.cityPlaceholder}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-5">
                    <Field label={o.fields.periodDate}>
                      <input
                        type="date"
                        className="input-field"
                        value={form.periodDate}
                        max={getTodayStr()}
                        onChange={e => setForm(f => ({ ...f, periodDate: e.target.value }))}
                      />
                    </Field>
                    <Field label={`${o.fields.cycleLength}: ${form.cycleLength} ${o.fields.days}`}>
                      <div className="flex items-center gap-4 h-14 bg-[#ADCBE3]/10 border border-[#2D2D2D]/10 rounded-2xl px-5">
                        <input
                          type="range" min={21} max={45} value={form.cycleLength}
                          onChange={e => setForm(f => ({ ...f, cycleLength: +e.target.value }))}
                          className="flex-1 accent-[#FF8CAF]"
                        />
                        <span className="font-bold text-sm w-8 text-right">{form.cycleLength}</span>
                      </div>
                    </Field>
                    <Field label={`${o.fields.age}: ${form.age}`}>
                      <div className="flex items-center gap-4 h-14 bg-[#ADCBE3]/10 border border-[#2D2D2D]/10 rounded-2xl px-5">
                        <input
                          type="range" min={18} max={55} value={form.age}
                          onChange={e => setForm(f => ({ ...f, age: +e.target.value }))}
                          className="flex-1 accent-[#FF8CAF]"
                        />
                        <span className="font-bold text-sm w-8 text-right">{form.age}</span>
                      </div>
                    </Field>
                    <Field label={`${o.fields.lastSleep}: ${form.sleepHours}${t.hours}`}>
                      <div className="flex items-center gap-4 h-14 bg-[#ADCBE3]/10 border border-[#2D2D2D]/10 rounded-2xl px-5">
                        <input
                          type="range" min={3} max={12} step={0.5} value={form.sleepHours}
                          onChange={e => setForm(f => ({ ...f, sleepHours: +e.target.value }))}
                          className="flex-1 accent-[#FF8CAF]"
                        />
                        <span className="font-bold text-sm w-8 text-right">{form.sleepHours}</span>
                      </div>
                    </Field>
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

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 font-medium">
              {error}
            </motion.p>
          )}

          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button onClick={back} className="flex items-center gap-2 px-6 py-4 rounded-full border border-[#2D2D2D]/10 text-[#2D2D2D]/60 font-medium hover:bg-black/5 transition-all">
                <ChevronLeft className="w-4 h-4" /> {t.back}
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 py-5 bg-[#2D2D2D] text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-[#2D2D2D]/20 transition-all flex items-center justify-center gap-3"
            >
              {step < totalSteps ? t.continue : o.finishCta}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: import('react').ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-[#2D2D2D]/40 uppercase tracking-widest">{label}</label>
      {children}
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
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={opt.wide ? { gridColumn: `span ${cols}` } : {}}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
            value === opt.value
              ? 'bg-[#2D2D2D] text-white border-[#2D2D2D] shadow-lg'
              : 'bg-[#ADCBE3]/10 border-[#2D2D2D]/10 hover:border-[#FF8CAF]/40 hover:bg-[#FF8CAF]/5'
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
          onClick={() => toggle(opt.value)}
          style={opt.wide ? { gridColumn: 'span 2' } : {}}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 relative ${
            isActive(opt.value)
              ? 'bg-[#2D2D2D] text-white border-[#2D2D2D] shadow-lg'
              : 'bg-[#ADCBE3]/10 border-[#2D2D2D]/10 hover:border-[#FF8CAF]/40 hover:bg-[#FF8CAF]/5'
          }`}
        >
          <p className={`font-bold text-sm ${isActive(opt.value) ? 'text-white' : 'text-[#2D2D2D]'}`}>{opt.label}</p>
          <p className={`text-xs mt-0.5 ${isActive(opt.value) ? 'text-white/60' : 'text-[#2D2D2D]/50'}`}>{opt.sub}</p>
        </button>
      ))}
    </div>
  );
}
