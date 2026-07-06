import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Apple, CalendarDays, Check, ChevronLeft, ChevronRight, Dumbbell,
  Plus, RotateCcw, Sparkles, Trash2, X, ClipboardCheck, ListTodo,
  Droplets,
} from 'lucide-react';
import { useAppState } from '../lib/store';
import { getPhaseInfo } from '../lib/cycleEngine';
import { useLang } from '../lib/i18n';
import type { FitnessLevel, Phase, Phase6 } from '../lib/types';

type PlanCategory = 'nutrition' | 'fitness' | 'skin' | 'review' | 'planning' | 'custom';
type PlanSource = 'option' | 'user';

interface PlanItem {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  category: PlanCategory;
  note?: string;
  evidence?: {
    rationale: string;
    source: string;
    strength: 'model' | 'moderate' | 'limited';
  };
  source: PlanSource;
  completed: boolean;
}

interface DayData {
  date: Date;
  dateKey: string;
  cycleDay: number;
  phase: Phase;
  phase6: Phase6;
}

const STORAGE_KEY = 'option_plan_v1';

const CATEGORY_META = {
  nutrition: { color: '#D85A30', bg: '#FAECE7', icon: Apple },
  fitness:   { color: '#534AB7', bg: '#EEEDFE', icon: Dumbbell },
  skin:      { color: '#FF6F9F', bg: '#FFF0F7', icon: Droplets },
  review:    { color: '#085041', bg: '#E1F5EE', icon: ClipboardCheck },
  planning:  { color: '#854F0B', bg: '#FAEEDA', icon: ListTodo },
  custom:    { color: '#2D2D2D', bg: '#F2F0EB', icon: CalendarDays },
} satisfies Record<PlanCategory, { color: string; bg: string; icon: typeof Apple }>;

const PHASE_META: Record<Phase, { color: string; bg: string }> = {
  RISE:  { color: '#D85A30', bg: '#FAECE7' },
  PEAK:  { color: '#FF6F9F', bg: '#FFF0F7' },
  FOCUS: { color: '#534AB7', bg: '#EEEDFE' },
  RESET: { color: '#085041', bg: '#E1F5EE' },
};

const FITNESS_DAYS: Record<FitnessLevel, number> = {
  never: 4,
  sometimes: 6,
  regularly: 8,
  athlete: 12,
};

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateLocal(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const mondayIndex = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayIndex);
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getCycleDayForDate(date: Date, periodDate: string, cycleLength: number): number {
  const start = parseDateLocal(periodDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((target.getTime() - start.getTime()) / 86400000);
  return ((diff % cycleLength) + cycleLength) % cycleLength + 1;
}

function loadItems(): PlanItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as PlanItem[];
  } catch {
    return [];
  }
}

function fitnessScore(phase6: Phase6): number {
  if (phase6 === 'PEAK') return 100;
  if (phase6 === 'RISE') return 88;
  if (phase6 === 'FOCUS early') return 72;
  if (phase6 === 'FOCUS late') return 52;
  if (phase6 === 'RESET mid') return 38;
  return 25;
}

function nutritionTitle(phase6: Phase6, zh: boolean): string {
  if (phase6 === 'PEAK') return zh ? '蛋白质 + 充足水分，保持高输出' : 'Protein + hydration for peak output';
  if (phase6 === 'RISE') return zh ? '优质碳水前置，为训练和学习供能' : 'Front-load quality carbs for training and learning';
  if (phase6 === 'FOCUS early') return zh ? '增加蛋白质与镁，稳定食欲' : 'Increase protein and magnesium to steady appetite';
  if (phase6 === 'FOCUS late') return zh ? '高纤维 + 镁，减少水肿与波动' : 'High fibre + magnesium to reduce bloating';
  return zh ? '补铁、温热食物与抗炎脂肪' : 'Iron, warm foods, and anti-inflammatory fats';
}

function skinTitle(phase6: Phase6, zh: boolean): string {
  if (phase6 === 'PEAK') return zh ? '极简护肤 + SPF50，保护发光窗口' : 'Minimal routine + SPF50 during the glow window';
  if (phase6 === 'RISE') return zh ? '进攻型护肤窗口：VC / 温和刷酸' : 'Active window: vitamin C or gentle exfoliation';
  if (phase6 === 'FOCUS early') return zh ? '减少刺激，加入屏障支持' : 'Reduce irritation and support the skin barrier';
  if (phase6 === 'FOCUS late') return zh ? '控油抗炎，暂停高刺激叠加' : 'Oil control and anti-inflammatory barrier care';
  return zh ? '只做修复：保湿、舒缓、屏障优先' : 'Repair only: hydrate, soothe, protect the barrier';
}

function fitnessTitle(phase6: Phase6, zh: boolean): string {
  if (phase6 === 'PEAK') return zh ? '力量峰值训练 / PR 尝试' : 'Peak strength session / PR attempt';
  if (phase6 === 'RISE') return zh ? '渐进力量或 HIIT 训练' : 'Progressive strength or HIIT';
  if (phase6 === 'FOCUS early') return zh ? '中等强度力量 + 稳态有氧' : 'Moderate strength + steady cardio';
  if (phase6 === 'FOCUS late') return zh ? '低冲击训练，缩短训练时长' : 'Low-impact session with reduced volume';
  return zh ? '恢复日：散步、拉伸或完全休息' : 'Recovery day: walk, mobility, or full rest';
}

function createOptionPlan(days: DayData[], fitness: FitnessLevel, zh: boolean): PlanItem[] {
  const make = (
    day: DayData,
    category: PlanCategory,
    title: string,
    time: string,
    duration: number,
    evidence: PlanItem['evidence'],
  ): PlanItem => ({
    id: `option-${category}-${day.dateKey}`,
    title,
    date: day.dateKey,
    time,
    duration,
    category,
    evidence,
    source: 'option',
    completed: false,
  });

  const generated: PlanItem[] = [];

  for (const day of days) {
    const cycleEvidence = zh
      ? `基于你的周期长度逐日计算：今天是 D${day.cycleDay}，处于 ${day.phase6}。`
      : `Calculated day by day from your cycle length: today is D${day.cycleDay}, ${day.phase6}.`;

    generated.push(make(
      day,
      'nutrition',
      nutritionTitle(day.phase6, zh),
      '08:00',
      15,
      {
        rationale: `${cycleEvidence} ${zh ? '饮食建议用于响应阶段性食欲、体温与恢复需求，不是固定食谱。' : 'Nutrition guidance responds to phase-related appetite, temperature, and recovery changes; it is not a fixed diet.'}`,
        source: zh
          ? '来源：月经周期能量摄入与静息代谢研究；Endotext 正常月经周期生理模型。'
          : 'Sources: menstrual-cycle energy intake and resting metabolism research; Endotext menstrual-cycle physiology.',
        strength: 'moderate',
      },
    ));
    generated.push(make(
      day,
      'skin',
      skinTitle(day.phase6, zh),
      '21:30',
      15,
      {
        rationale: `${cycleEvidence} ${zh ? '激素波动可能影响皮脂、含水量与屏障耐受度，因此采用阶段性强弱调整。' : 'Hormonal variation may affect sebum, hydration, and barrier tolerance, so intensity is adjusted by phase.'}`,
        source: zh
          ? '来源：月经周期与皮肤生理研究。该领域样本通常较小，建议以个人反应校准。'
          : 'Source: menstrual-cycle skin physiology studies. Samples are often small; calibrate to personal response.',
        strength: 'limited',
      },
    ));

    if (day.date.getDay() === 0) {
      generated.push(make(
        day,
        'review',
        zh ? '本周复盘：什么有效，什么需要停止' : 'Weekly review: what worked, what should stop',
        '19:30',
        30,
        {
          rationale: zh
            ? `${cycleEvidence} 周日作为行为闭环节点，复盘实际完成度并校准下一周建议。`
            : `${cycleEvidence} Sunday closes the behavioural loop and calibrates next week's recommendations.`,
          source: zh ? '来源：Option 行为反馈机制；非医学建议。' : 'Source: Option behavioural feedback model; not a medical claim.',
          strength: 'model',
        },
      ));
    }
    if (day.date.getDay() === 1) {
      generated.push(make(
        day,
        'planning',
        zh ? '本周计划：部署三件最高杠杆事项' : 'Weekly plan: deploy the three highest-leverage moves',
        '08:30',
        30,
        {
          rationale: zh
            ? `${cycleEvidence} 周初把可调整事项放入每天，避免只形成一份抽象周计划。`
            : `${cycleEvidence} Weekly planning places flexible actions onto specific days instead of creating an abstract weekly list.`,
          source: zh ? '来源：Option 日粒度调度模型；非医学建议。' : 'Source: Option day-level scheduling model; not a medical claim.',
          strength: 'model',
        },
      ));
    }
  }

  const trainingDays = [...days]
    .sort((a, b) => fitnessScore(b.phase6) - fitnessScore(a.phase6) || a.date.getTime() - b.date.getTime())
    .slice(0, FITNESS_DAYS[fitness])
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const day of trainingDays) {
    generated.push(make(
      day,
      'fitness',
      fitnessTitle(day.phase6, zh),
      '18:30',
      day.phase === 'RESET' ? 30 : 50,
      {
        rationale: zh
          ? `基于你的个人周期逐日评分：D${day.cycleDay} · ${day.phase6}。训练日同时结合你的运动频率选择，不把高强度默认塞满每一天。`
          : `Day-level score from your cycle: D${day.cycleDay} · ${day.phase6}. Training frequency also controls how many sessions are scheduled.`,
        source: zh
          ? '来源：McNulty 等，Sports Medicine（2020）系统综述。总体效应较小且个体差异明显，因此建议需要反馈校准。'
          : 'Source: McNulty et al., Sports Medicine (2020) systematic review. Average effects were small and individual variation was substantial.',
        strength: 'limited',
      },
    ));
  }

  return generated;
}

export function Plan() {
  const [state] = useAppState();
  const [lang] = useLang();
  const zh = lang === 'zh';
  const profile = state.profile!;

  const [weekOffset, setWeekOffset] = useState(0);
  const [items, setItems] = useState<PlanItem[]>(loadItems);
  const [filters, setFilters] = useState<Set<PlanCategory>>(
    new Set(['nutrition', 'fitness', 'skin', 'review', 'planning', 'custom']),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<PlanItem, 'id' | 'source' | 'completed'>>({
    title: '',
    date: toDateKey(new Date()),
    time: '09:00',
    duration: 30,
    category: 'custom',
    note: '',
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const monday = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);

  const visibleDays = useMemo<DayData[]>(() => (
    Array.from({ length: 7 }, (_, index) => {
      const date = addDays(monday, index);
      const cycleDay = getCycleDayForDate(date, profile.periodDate, profile.cycleLength);
      const info = getPhaseInfo(cycleDay, profile.cycleLength);
      return { date, dateKey: toDateKey(date), cycleDay, phase: info.phase, phase6: info.phase6 };
    })
  ), [monday, profile.periodDate, profile.cycleLength]);

  const recommendationDays = useMemo<DayData[]>(() => (
    Array.from({ length: 14 }, (_, index) => {
      const date = addDays(new Date(), index);
      const cycleDay = getCycleDayForDate(date, profile.periodDate, profile.cycleLength);
      const info = getPhaseInfo(cycleDay, profile.cycleLength);
      return { date, dateKey: toDateKey(date), cycleDay, phase: info.phase, phase6: info.phase6 };
    })
  ), [profile.periodDate, profile.cycleLength]);

  const visibleItems = useMemo(() => (
    items
      .filter(item => filters.has(item.category))
      .sort((a, b) => a.time.localeCompare(b.time))
  ), [items, filters]);

  const categoryLabels: Record<PlanCategory, string> = {
    nutrition: zh ? '饮食' : 'Nutrition',
    fitness: zh ? '健身' : 'Fitness',
    skin: zh ? '护肤' : 'Skin',
    review: zh ? '复盘' : 'Review',
    planning: zh ? '计划' : 'Planning',
    custom: zh ? '自定义' : 'Custom',
  };

  const ovulationDay = Math.max(1, profile.cycleLength - 14);

  const openNewItem = (dateKey: string, category: PlanCategory = 'custom') => {
    setEditingId(null);
    setDraft({ title: '', date: dateKey, time: '09:00', duration: 30, category, note: '' });
    setEditorOpen(true);
  };

  const openItem = (item: PlanItem) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      date: item.date,
      time: item.time,
      duration: item.duration,
      category: item.category,
      note: item.note ?? '',
    });
    setEditorOpen(true);
  };

  const saveDraft = () => {
    if (!draft.title.trim()) return;
    if (editingId) {
      setItems(current => current.map(item => (
        item.id === editingId ? { ...item, ...draft, title: draft.title.trim() } : item
      )));
    } else {
      setItems(current => [...current, {
        ...draft,
        id: `user-${Date.now()}`,
        title: draft.title.trim(),
        source: 'user',
        completed: false,
      }]);
    }
    setEditorOpen(false);
  };

  const generatePlan = () => {
    const dateKeys = new Set(recommendationDays.map(day => day.dateKey));
    const generated = createOptionPlan(recommendationDays, profile.fitness, zh);
    setItems(current => [
      ...current.filter(item => item.source === 'user' || !dateKeys.has(item.date)),
      ...generated,
    ]);
    setWeekOffset(0);
  };

  const removeOptionPlan = () => {
    setItems(current => current.filter(item => item.source === 'user'));
  };

  const toggleFilter = (category: PlanCategory) => {
    setFilters(current => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const weekEnd = visibleDays[6].date;
  const editingItem = editingId ? items.find(item => item.id === editingId) : undefined;
  const weekLabel = zh
    ? `${monday.getMonth() + 1}月${monday.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`
    : `${monday.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;

  const weekdays = zh
    ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="h-screen overflow-y-auto px-5 py-6 sm:px-7 sm:py-8 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1480px] space-y-6 pb-10">
        <header className="flex items-start justify-between gap-5 flex-wrap">
          <div>
            <p className="text-[10px] font-black tracking-[0.22em] text-[#2D2D2D]/35 uppercase">
              {zh ? '生理节律计划' : 'Biological rhythm planning'}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-serif">
              {zh ? '把身体状态变成可执行的计划。' : 'Turn body signals into an executable plan.'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#2D2D2D]/50">
              {zh
                ? 'Option 先规划饮食、健身、护肤，并把复盘与计划放进更合适的周期窗口。你可以随时添加、修改或删除任何事项。'
                : 'Option plans nutrition, fitness, and skincare first, then places reviews and planning into stronger cycle windows. Every item remains editable.'}
            </p>
            <div className="mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/55 border border-[#2D2D2D]/6 px-3 py-2 text-[10px] text-[#2D2D2D]/45">
              <span className="font-bold text-[#2D2D2D]/65">
                {zh ? `你的周期：${profile.cycleLength} 天` : `Your cycle: ${profile.cycleLength} days`}
              </span>
              <span>{zh ? `估算排卵锚点：D${ovulationDay}` : `Estimated ovulation anchor: D${ovulationDay}`}</span>
              <span>{zh ? '每一天独立计算' : 'Calculated for each day'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={removeOptionPlan}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/70 border border-[#2D2D2D]/8 text-[#2D2D2D]/45 hover:text-[#2D2D2D]"
              title={zh ? '清除 Option 建议' : 'Clear Option suggestions'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={generatePlan}
              className="h-10 px-4 rounded-xl bg-[#2D2D2D] text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-black/10"
            >
              <Sparkles className="w-4 h-4" />
              {zh ? '生成未来 14 天每日计划' : 'Generate 14 daily plans'}
            </button>
          </div>
        </header>

        <section className="bg-white/88 rounded-[24px] border border-[#2D2D2D]/7 p-3 sm:p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(offset => offset - 1)}
              className="calendar-icon-button"
              aria-label={zh ? '上一周' : 'Previous week'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="min-w-36 px-3 text-sm font-bold text-[#2D2D2D]/70"
            >
              {weekLabel}
            </button>
            <button
              onClick={() => setWeekOffset(offset => offset + 1)}
              className="calendar-icon-button"
              aria-label={zh ? '下一周' : 'Next week'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto max-w-full pb-0.5">
            {(Object.keys(CATEGORY_META) as PlanCategory[]).map(category => {
              const meta = CATEGORY_META[category];
              const Icon = meta.icon;
              const active = filters.has(category);
              return (
                <button
                  key={category}
                  onClick={() => toggleFilter(category)}
                  className="h-8 px-3 flex-shrink-0 rounded-full flex items-center gap-1.5 text-[10px] font-bold transition-opacity"
                  style={{
                    color: meta.color,
                    backgroundColor: meta.bg,
                    opacity: active ? 1 : 0.35,
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {categoryLabels[category]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="hidden xl:grid grid-cols-7 overflow-hidden rounded-[26px] border border-[#2D2D2D]/8 bg-white/72 shadow-[0_20px_60px_rgba(45,45,45,0.06)]">
          {visibleDays.map((day, index) => {
            const phase = PHASE_META[day.phase];
            const dayItems = visibleItems.filter(item => item.date === day.dateKey);
            const today = day.dateKey === toDateKey(new Date());
            return (
              <div
                key={day.dateKey}
                className={`min-h-[590px] border-r border-[#2D2D2D]/7 last:border-r-0 ${today ? 'bg-white' : ''}`}
              >
                <div className="px-3.5 py-4 border-b border-[#2D2D2D]/7" style={{ backgroundColor: today ? phase.bg : 'transparent' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-black tracking-[0.18em] text-[#2D2D2D]/35">{weekdays[index]}</p>
                      <p className="mt-1 text-2xl font-serif">{day.date.getDate()}</p>
                    </div>
                    <button
                      onClick={() => openNewItem(day.dateKey)}
                      className="calendar-icon-button"
                      aria-label={zh ? '添加计划' : 'Add plan'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className="px-2 py-1 rounded-full text-[8px] font-black tracking-widest"
                      style={{ color: phase.color, backgroundColor: phase.bg }}
                    >
                      {day.phase}
                    </span>
                    <span className="text-[9px] font-mono text-[#2D2D2D]/30">D{day.cycleDay}/{profile.cycleLength}</span>
                  </div>
                </div>
                <div className="p-2.5 space-y-2">
                  {dayItems.map(item => (
                    <div key={item.id}>
                      <PlanCard item={item} label={categoryLabels[item.category]} onClick={() => openItem(item)} zh={zh} />
                    </div>
                  ))}
                  {dayItems.length === 0 && (
                    <button
                      onClick={() => openNewItem(day.dateKey)}
                      className="w-full py-8 text-[10px] text-[#2D2D2D]/25 hover:text-[#2D2D2D]/45"
                    >
                      {zh ? '+ 添加计划' : '+ Add plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="xl:hidden space-y-3">
          {visibleDays.map((day, index) => {
            const phase = PHASE_META[day.phase];
            const dayItems = visibleItems.filter(item => item.date === day.dateKey);
            return (
              <div key={day.dateKey} className="bg-white/88 rounded-[22px] border border-[#2D2D2D]/7 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: phase.bg }}>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-2xl">{day.date.getDate()}</span>
                    <div>
                      <p className="text-[9px] font-black tracking-widest" style={{ color: phase.color }}>
                        {weekdays[index]} · {day.phase}
                      </p>
                      <p className="text-[10px] text-[#2D2D2D]/40">D{day.cycleDay}/{profile.cycleLength}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openNewItem(day.dateKey)}
                    className="calendar-icon-button"
                    aria-label={zh ? '添加计划' : 'Add plan'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {dayItems.map(item => (
                    <div key={item.id}>
                      <PlanCard item={item} label={categoryLabels[item.category]} onClick={() => openItem(item)} zh={zh} />
                    </div>
                  ))}
                  {dayItems.length === 0 && (
                    <button onClick={() => openNewItem(day.dateKey)} className="w-full py-5 text-xs text-[#2D2D2D]/30">
                      {zh ? '这一天还没有计划' : 'Nothing planned yet'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <AnimatePresence>
        {editorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-[#2D2D2D]/25 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setEditorOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-lg bg-[#F9F7F2] rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">{editingId ? (zh ? '编辑计划' : 'Edit plan') : (zh ? '添加计划' : 'Add plan')}</h2>
                <button
                  onClick={() => setEditorOpen(false)}
                  className="calendar-icon-button"
                  aria-label={zh ? '关闭' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <input
                  value={draft.title}
                  onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
                  placeholder={zh ? '计划内容' : 'Plan title'}
                  className="input-field bg-white"
                  autoFocus
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(Object.keys(CATEGORY_META) as PlanCategory[]).map(category => {
                    const meta = CATEGORY_META[category];
                    return (
                      <button
                        key={category}
                        onClick={() => setDraft(current => ({ ...current, category }))}
                        className="px-3 py-2 rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{
                          color: meta.color,
                          backgroundColor: meta.bg,
                          outline: draft.category === category ? `2px solid ${meta.color}` : 'none',
                        }}
                      >
                        {categoryLabels[category]}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <label className="plan-field col-span-2 sm:col-span-1">
                    <span>{zh ? '日期' : 'Date'}</span>
                    <input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value }))} />
                  </label>
                  <label className="plan-field">
                    <span>{zh ? '时间' : 'Time'}</span>
                    <input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} />
                  </label>
                  <label className="plan-field">
                    <span>{zh ? '分钟' : 'Minutes'}</span>
                    <input type="number" min="5" step="5" value={draft.duration} onChange={event => setDraft(current => ({ ...current, duration: Number(event.target.value) }))} />
                  </label>
                </div>
                <textarea
                  value={draft.note}
                  onChange={event => setDraft(current => ({ ...current, note: event.target.value }))}
                  placeholder={zh ? '备注（可选）' : 'Notes (optional)'}
                  className="w-full h-24 resize-none rounded-2xl border border-[#2D2D2D]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#FF8CAF]/60"
                />
                <div className="flex gap-3">
                  {editingId && (
                    <button
                      onClick={() => {
                        setItems(current => current.filter(item => item.id !== editingId));
                        setEditorOpen(false);
                      }}
                      className="h-12 w-12 rounded-xl border border-red-500/15 text-red-500 flex items-center justify-center"
                      aria-label={zh ? '删除计划' : 'Delete plan'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {editingItem && (
                    <button
                      onClick={() => {
                        setItems(current => current.map(item => (
                          item.id === editingItem.id ? { ...item, completed: !item.completed } : item
                        )));
                      }}
                      className="h-12 px-4 rounded-xl border border-[#2D2D2D]/10 text-sm font-bold flex items-center gap-2"
                      style={editingItem.completed ? {
                        color: CATEGORY_META[editingItem.category].color,
                        backgroundColor: CATEGORY_META[editingItem.category].bg,
                      } : undefined}
                    >
                      <Check className="w-4 h-4" />
                      {editingItem.completed
                        ? (zh ? '已完成' : 'Completed')
                        : (zh ? '标记完成' : 'Mark done')}
                    </button>
                  )}
                  <button
                    onClick={saveDraft}
                    disabled={!draft.title.trim()}
                    className="flex-1 h-12 rounded-xl bg-[#2D2D2D] text-white font-bold disabled:opacity-30"
                  >
                    {zh ? '保存计划' : 'Save plan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanCard({ item, label, onClick, zh }: { item: PlanItem; label: string; onClick: () => void; zh: boolean }) {
  const meta = CATEGORY_META[item.category];
  const Icon = meta.icon;
  return (
    <div
      className="w-full text-left rounded-xl border overflow-hidden"
      style={{ backgroundColor: meta.bg, borderColor: `${meta.color}22` }}
    >
      <button onClick={onClick} className="w-full text-left p-2.5 transition-opacity hover:opacity-75">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[8px] font-black tracking-widest uppercase" style={{ color: meta.color }}>
            <Icon className="w-3 h-3" /> {label}
          </span>
          {item.completed && <Check className="w-3 h-3" style={{ color: meta.color }} />}
        </div>
        <p className={`mt-1.5 text-[11px] leading-snug font-medium ${item.completed ? 'line-through opacity-45' : ''}`}>
          {item.title}
        </p>
        <p className="mt-1.5 text-[9px] text-[#2D2D2D]/38">
          {item.time} · {item.duration}m {item.source === 'option' ? '· Option' : ''}
        </p>
      </button>
      {item.evidence && (
        <details className="border-t border-[#2D2D2D]/6 px-2.5 py-2">
          <summary className="cursor-pointer text-[9px] font-bold" style={{ color: meta.color }}>
            {zh ? '为什么安排在今天' : 'Why this day'}
          </summary>
          <p className="mt-2 text-[9px] leading-relaxed text-[#2D2D2D]/55">{item.evidence.rationale}</p>
          <p className="mt-2 text-[8px] leading-relaxed text-[#2D2D2D]/35">{item.evidence.source}</p>
          <span className="mt-2 inline-block text-[8px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
            {zh ? '证据强度：' : 'Evidence: '}
            {item.evidence.strength === 'model'
              ? (zh ? '模型依据' : 'Model-based')
              : item.evidence.strength === 'moderate'
                ? (zh ? '中等' : 'Moderate')
                : (zh ? '有限' : 'Limited')}
          </span>
        </details>
      )}
    </div>
  );
}
