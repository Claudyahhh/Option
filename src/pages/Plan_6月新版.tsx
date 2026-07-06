import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Apple, CalendarDays, Check, Dumbbell,
  Plus, RotateCcw, Trash2, X, ClipboardCheck, ListTodo,
  Droplets, Upload, FileText, PencilLine, AlertTriangle, WandSparkles,
  Settings, MoreHorizontal, Eye, EyeOff, ClipboardPaste, GripVertical,
} from 'lucide-react';
import { useAppState } from '../lib/store';
import { getPhaseInfo } from '../lib/cycleEngine';
import { useLang } from '../lib/i18n';
import { getFoodGroupsForNutrients } from '../lib/nutrientFoods';
import { AI_MODELS, DEFAULT_AI_MODEL_ID, type AIModelOption } from '../lib/aiModels';
import type { FitnessLevel, Phase, Phase6 } from '../lib/types';

type PlanCategory = 'nutrition' | 'fitness' | 'skin' | 'review' | 'planning' | 'custom';
type PlanSource = 'option' | 'user';
type AISuggestionType = 'fitness' | 'nutrition' | 'sleep' | 'fasting' | 'review' | 'mood';

interface NutrientRecommendation {
  name: string;
  amount: string;
  unit: string;
  dailyTip: string;
}

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

interface AISuggestion {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  suggestionType: AISuggestionType;
  reason: string;
  nutritionType?: string;
  nutrients?: NutrientRecommendation[];
  source: 'ai';
  accepted: boolean;
}

interface PlanDayRecord {
  dateKey: string;
  items: PlanItem[];
  aiSuggestions: AISuggestion[];
  dayStatus: string;
  sleepHours: number | '';
}

interface PendingImageImport {
  fileName: string;
  imageBase64: string;
  status: 'pending';
  createdAt: string;
}

interface PendingTextImport {
  rawText: string;
  status: 'pending';
  createdAt: string;
}

interface PlanWindow {
  windowStartDate: string;
  generatedAt: string;
  days: PlanDayRecord[];
  pendingImage?: PendingImageImport;
  pendingText?: PendingTextImport;
}

type WindowResolutionMode = 'auto' | 'reset-from-today';
type ImportMode = 'menu' | 'image' | 'text';
type PlanDetailTarget =
  | { type: 'item'; item: PlanItem; day: DayData }
  | { type: 'suggestion'; suggestion: AISuggestion; day: DayData };

const STORAGE_KEY = 'option_plan_window_v1';
const LEGACY_STORAGE_KEY = 'option_plan_v1';
const AI_MODEL_STORAGE_KEY = 'option_plan_ai_model_v1';
const AI_KEYS_STORAGE_KEY = 'option_plan_ai_keys_v1';

interface ParsedAIEvent {
  date: string;
  title: string;
  type: PlanCategory;
  time?: string;
  duration?: number;
  note?: string;
}

interface RawAISuggestion {
  date: string;
  type: AISuggestionType;
  title: string;
  time?: string;
  duration?: number;
  reason: string;
  nutritionType?: string;
  nutrients?: NutrientRecommendation[];
}

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

const AI_TYPE_META = {
  fitness:   { label: 'Fitness', color: '#534AB7', bg: '#EEEDFE' },
  nutrition: { label: 'Nutrition', color: '#D85A30', bg: '#FAECE7' },
  sleep:     { label: 'Sleep', color: '#085041', bg: '#E1F5EE' },
  fasting:   { label: 'Deficit', color: '#854F0B', bg: '#FAEEDA' },
  review:    { label: 'Review', color: '#085041', bg: '#E1F5EE' },
  mood:      { label: 'Mood', color: '#FF6F9F', bg: '#FFF0F7' },
} satisfies Record<AISuggestionType, { label: string; color: string; bg: string }>;

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

function createPlanDay(dateKey: string, items: PlanItem[] = []): PlanDayRecord {
  return {
    dateKey,
    items,
    aiSuggestions: [],
    dayStatus: '',
    sleepHours: '',
  };
}

function createEmptyWindow(startDate: Date, generatedAt = new Date().toISOString()): PlanWindow {
  const windowStartDate = toDateKey(startDate);
  return {
    windowStartDate,
    generatedAt,
    days: Array.from({ length: 7 }, (_, index) => createPlanDay(toDateKey(addDays(startDate, index)))),
  };
}

function normalizePlanWindow(window: PlanWindow): PlanWindow {
  const start = parseDateLocal(window.windowStartDate);
  return {
    ...window,
    days: Array.from({ length: 7 }, (_, index) => {
      const dateKey = toDateKey(addDays(start, index));
      const existing = window.days.find(day => day.dateKey === dateKey);
      return {
        dateKey,
        items: existing?.items ?? [],
        aiSuggestions: existing?.aiSuggestions ?? [],
        dayStatus: existing?.dayStatus ?? '',
        sleepHours: existing?.sleepHours ?? '',
      };
    }),
  };
}

function resolveEffectivePlanWindow(
  existing: PlanWindow | null,
  today: Date,
  mode: WindowResolutionMode,
): PlanWindow {
  // C. Manual reset: the user explicitly asks to start over, so the old window is ignored.
  if (mode === 'reset-from-today') return createEmptyWindow(today);

  // B. Returning user: an existing seven-day window remains authoritative for edits/imports.
  if (existing) return normalizePlanWindow(existing);

  // A. First generation: no active window exists yet, so today becomes day 1 of the seven-day window.
  return createEmptyWindow(today);
}

function loadLegacyItems(): PlanItem[] {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]') as PlanItem[];
  } catch {
    return [];
  }
}

function loadPlanWindow(): PlanWindow {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return resolveEffectivePlanWindow(JSON.parse(raw) as PlanWindow, new Date(), 'auto');
  } catch {}

  const window = resolveEffectivePlanWindow(null, new Date(), 'auto');
  const dateKeys = new Set(window.days.map(day => day.dateKey));
  const legacyItems = loadLegacyItems().filter(item => dateKeys.has(item.date));
  if (legacyItems.length === 0) return window;

  return {
    ...window,
    days: window.days.map(day => ({
      ...day,
      items: legacyItems.filter(item => item.date === day.dateKey),
    })),
  };
}

function getWindowItems(window: PlanWindow): PlanItem[] {
  return window.days.flatMap(day => day.items);
}

function getWindowSuggestions(window: PlanWindow): AISuggestion[] {
  return window.days.flatMap(day => day.aiSuggestions);
}

function getEnvGeminiApiKey(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  return env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? '';
}

function loadSelectedModelId(): string {
  try {
    const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
    if (stored && AI_MODELS.some(model => model.id === stored)) return stored;
  } catch {}
  return DEFAULT_AI_MODEL_ID;
}

function loadApiKeys(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_KEYS_STORAGE_KEY) ?? '{}') as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getModelApiName(model: AIModelOption): string {
  if (model.id === 'openai-gpt-5') return 'gpt-5';
  if (model.id === 'openai-gpt-4o') return 'gpt-4o';
  if (model.id === 'anthropic-claude-opus-4') return 'claude-opus-4-20250514';
  if (model.id === 'anthropic-claude-sonnet-4') return 'claude-sonnet-4-20250514';
  if (model.id === 'google-gemini-2.5-pro') return 'gemini-2.5-pro';
  if (model.id === 'google-gemini-2.0-flash') return 'gemini-2.0-flash';
  if (model.id === 'deepseek-v3') return 'deepseek-chat';
  if (model.id === 'qwen-max') return 'qwen-max';
  if (model.id === 'moonshot-kimi') return 'moonshot-v1-8k';
  if (model.id === 'zhipu-glm-4') return 'glm-4';
  return model.name;
}

function getConfiguredApiKey(model: AIModelOption, keys: Record<string, string>): string {
  return keys[model.id] || (model.requestFormat === 'gemini-generate' ? getEnvGeminiApiKey() : '');
}

async function requestAIText(model: AIModelOption, apiKey: string, prompt: string, image?: { data: string; mimeType: string }): Promise<string> {
  if (!apiKey.trim()) throw new Error(`Missing API key for ${model.provider} ${model.name}`);

  if (model.requestFormat === 'gemini-generate') {
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [{ text: prompt }];
    if (image) parts.push({ inlineData: image });
    const response = await fetch(`${model.apiEndpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? response.statusText);
    return payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
  }

  if (model.requestFormat === 'anthropic-messages') {
    const response = await fetch(model.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: getModelApiName(model),
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message ?? response.statusText);
    return payload?.content?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
  }

  const response = await fetch(model.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModelApiName(model),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? response.statusText);
  return payload?.choices?.[0]?.message?.content ?? '';
}

async function testAIConnection(model: AIModelOption, apiKey: string): Promise<void> {
  await requestAIText(
    model,
    apiKey,
    'Return JSON only: {"ok": true}',
  );
}

function parseJsonPayload<T>(raw: string): T {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(trimmed) as T;
}

function splitDataUrl(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return { data: dataUrl, mimeType: 'image/png' };
  return { mimeType: match[1] || 'image/png', data: match[2] };
}

function getWindowContext(days: DayData[], planWindow: PlanWindow, cycleLength: number, ovulationDay: number) {
  return {
    windowStartDate: days[0]?.dateKey,
    windowEndDate: days[6]?.dateKey,
    cycleLength,
    ovulationAnchor: `D${ovulationDay}`,
    days: days.map(day => {
      const record = planWindow.days.find(d => d.dateKey === day.dateKey);
      return {
        date: day.dateKey,
        weekday: day.date.toLocaleDateString('en', { weekday: 'long' }),
        cycleDay: day.cycleDay,
        phase: day.phase,
        phaseDetail: day.phase6,
        dayStatus: record?.dayStatus ?? '',
        sleepHours: record?.sleepHours ?? '',
        existingEvents: (record?.items ?? []).map(item => ({
          title: item.title,
          type: item.category,
          time: item.time,
          duration: item.duration,
          note: item.note ?? '',
          source: item.source,
        })),
      };
    }),
  };
}

function buildParsePrompt(windowContext: ReturnType<typeof getWindowContext>, rawText?: string): string {
  return `You are parsing an existing personal schedule into structured events for Option.

Current active seven-day window:
${JSON.stringify(windowContext, null, 2)}

Rules:
- Only return events whose dates are inside the active seven-day window.
- If the source says a weekday, map it to the matching date in the active window.
- type must be one of: nutrition, fitness, skin, review, planning, custom.
- time is optional and should be HH:mm when known.
- duration is optional minutes when inferable.
- Return JSON only, no markdown.

JSON shape:
{
  "events": [
    { "date": "YYYY-MM-DD", "title": "string", "type": "fitness", "time": "HH:mm", "duration": 45, "note": "optional" }
  ]
}

Raw pasted schedule text:
${rawText ?? '(image input attached; extract visible schedule text from the image)'}`;
}

function buildSchedulePrompt(windowContext: ReturnType<typeof getWindowContext>): string {
  return `You are Option's hormone-cycle scheduling engine.

Use the user's active seven-day window, existing events, and hormone-cycle state to generate schedule suggestions.
The user cycle information is authoritative:
${JSON.stringify(windowContext, null, 2)}

Hormone-cycle scheduling principles:
- RESET: lower load, recovery, light yoga/walks, strategic review, emotional sensitivity warnings, no aggressive calorie deficit.
- RISE: stronger learning/training window, progressive strength or HIIT can fit if existing events allow.
- PEAK: highest output/social/strength window; schedule demanding fitness if not crowded.
- FOCUS: sustained attention and execution; moderate training, nutrition stability, sleep protection.
- Avoid fragile days for fasting/calorie deficits, especially RESET early and days already crowded.
- Put review on the clearest strategic cognition day, often RESET or late-week closure depending on the window.
- Nutrition suggestions must include nutritionType, e.g. iron, Omega-3, magnesium, protein, complex carbs, hydration.
- Nutrition suggestions must also include nutrients: [{ name, amount, unit, dailyTip }].
- The nutrient amount should reflect the user's current cycle phase. For example, RESET can bias iron and omega-3 higher; FOCUS can bias magnesium/protein for appetite and recovery stability.

Return JSON only, no markdown. The JSON must have exactly this shape:
{
  "suggestions": [
    {
      "date": "YYYY-MM-DD",
      "type": "fitness | nutrition | sleep | fasting | review | mood",
      "title": "short actionable suggestion",
      "time": "HH:mm optional",
      "duration": 30,
      "nutritionType": "required only for nutrition",
      "nutrients": [
        { "name": "magnesium", "amount": "320", "unit": "mg", "dailyTip": "about 30g pumpkin seeds plus a little dark chocolate" }
      ],
      "reason": "short reason tied to cycle day and phase"
    }
  ]
}

Coverage requirements:
- Include all seven categories at least once: fitness, nutrition, sleep, fasting, review, mood.
- For fitness, choose frequency and intensity based on phases and existing events.
- For nutrition, provide targeted nutrients across relevant days and include practical dailyTip conversions.
- For sleep, mark days that should reserve extra sleep.
- For fasting, choose only resilient days and explain why.
- Every suggestion must stay inside the active window and must include a cycle-phase reason.`;
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

function normalizeImportedEvent(event: ParsedAIEvent, allowedDates: Set<string>): PlanItem | null {
  if (!allowedDates.has(event.date) || !event.title.trim()) return null;
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: event.title.trim(),
    date: event.date,
    time: event.time ?? '',
    duration: event.duration ?? 30,
    category: event.type,
    note: event.note,
    source: 'user',
    completed: false,
  };
}

function normalizeAISuggestion(suggestion: RawAISuggestion, allowedDates: Set<string>): AISuggestion | null {
  if (!allowedDates.has(suggestion.date) || !suggestion.title.trim()) return null;
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: suggestion.title.trim(),
    date: suggestion.date,
    time: suggestion.time ?? '',
    duration: suggestion.duration ?? 30,
    suggestionType: suggestion.type,
    reason: suggestion.reason,
    nutritionType: suggestion.nutritionType,
    nutrients: suggestion.nutrients,
    source: 'ai',
    accepted: false,
  };
}

function suggestionTypeToCategory(type: AISuggestionType): PlanCategory {
  if (type === 'fitness') return 'fitness';
  if (type === 'nutrition' || type === 'fasting') return 'nutrition';
  if (type === 'review') return 'review';
  if (type === 'sleep' || type === 'mood') return 'planning';
  return 'custom';
}

function suggestionToPlanItem(suggestion: AISuggestion): PlanItem {
  return {
    id: `user-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: suggestion.title,
    date: suggestion.date,
    time: suggestion.time,
    duration: suggestion.duration,
    category: suggestionTypeToCategory(suggestion.suggestionType),
    note: suggestion.reason,
    source: 'user',
    completed: false,
  };
}

function getDayStatusLabel(day: DayData, record: PlanDayRecord | undefined, suggestions: AISuggestion[], zh: boolean): string {
  if (record?.dayStatus) return record.dayStatus;
  if (suggestions.some(suggestion => suggestion.suggestionType === 'mood')) return zh ? '情绪敏感' : 'Mood watch';
  if (suggestions.some(suggestion => suggestion.suggestionType === 'review')) return zh ? '适合复盘' : 'Review day';
  if (suggestions.some(suggestion => suggestion.suggestionType === 'sleep')) return zh ? '补眠优先' : 'Sleep priority';
  if (day.phase === 'RESET') return day.phase6 === 'RESET early' ? (zh ? '脆弱期' : 'Tender day') : (zh ? '适合复盘' : 'Review day');
  if (day.phase === 'RISE') return zh ? '高能日' : 'High energy';
  if (day.phase === 'PEAK') return zh ? '峰值日' : 'Peak day';
  return zh ? '深专注' : 'Deep focus';
}

function localParseFallback(rawText: string, days: DayData[]): ParsedAIEvent[] {
  const weekdays = new Map<string, string>();
  for (const day of days) {
    weekdays.set(day.date.toLocaleDateString('en', { weekday: 'long' }).toLowerCase(), day.dateKey);
    weekdays.set(day.date.toLocaleDateString('en', { weekday: 'short' }).toLowerCase(), day.dateKey);
  }

  return rawText
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const explicitDate = line.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
      const weekdayDate = [...weekdays.entries()].find(([weekday]) => line.toLowerCase().includes(weekday))?.[1];
      const time = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)?.[0];
      const date = explicitDate ?? weekdayDate ?? days[0].dateKey;
      const title = line
        .replace(/\b(20\d{2}-\d{2}-\d{2})\b/g, '')
        .replace(/\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/ig, '')
        .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, '')
        .trim() || line;
      const lower = line.toLowerCase();
      const type: PlanCategory = /pilates|gym|run|yoga|workout|训练|健身|瑜伽|跑步/.test(lower)
        ? 'fitness'
        : /review|复盘/.test(lower)
          ? 'review'
          : /plan|计划/.test(lower)
            ? 'planning'
            : 'custom';
      return { date, title, type, time, duration: 30 };
    });
}

function localScheduleFallback(days: DayData[], planWindow: PlanWindow, cycleLength: number): RawAISuggestion[] {
  const findDay = (phase: Phase, fallbackIndex: number) => days.find(day => day.phase === phase) ?? days[Math.min(fallbackIndex, days.length - 1)];
  const resetDay = findDay('RESET', 0);
  const riseDay = findDay('RISE', 4);
  const peakDay = findDay('PEAK', 5);
  const focusDay = findDay('FOCUS', 6);
  const busy = (dateKey: string) => (planWindow.days.find(day => day.dateKey === dateKey)?.items.length ?? 0) > 2;
  const trainingDay = !busy(peakDay.dateKey) ? peakDay : !busy(riseDay.dateKey) ? riseDay : focusDay;

  return [
    {
      date: resetDay.dateKey,
      type: 'nutrition',
      title: '补铁 + Omega-3，降低 RESET 期恢复负担',
      nutritionType: 'iron, Omega-3',
      nutrients: [
        { name: 'iron', amount: '18-22', unit: 'mg', dailyTip: '相当于一小份猪肝或蛤蜊，搭配深绿叶菜。' },
        { name: 'omega-3', amount: '1.5-2', unit: 'g', dailyTip: '约一份三文鱼，或 20g 亚麻籽/奇亚籽。' },
      ],
      reason: `D${resetDay.cycleDay}/${cycleLength} ${resetDay.phase6}：RESET 期优先补铁和抗炎脂肪，支持经期恢复。`,
    },
    {
      date: resetDay.dateKey,
      type: 'mood',
      title: '情绪低谷预警：减少高刺激社交',
      reason: `D${resetDay.cycleDay} ${resetDay.phase6}：激素低位，敏感度可能上升，建议预留缓冲。`,
    },
    {
      date: resetDay.dateKey,
      type: 'review',
      title: '战略复盘：保留观察，不急着行动',
      time: '19:30',
      duration: 30,
      reason: `D${resetDay.cycleDay} ${resetDay.phase6}：RESET 阶段更适合看清无效安排与边界。`,
    },
    {
      date: riseDay.dateKey,
      type: 'fitness',
      title: '渐进力量训练，控制在可恢复强度',
      time: '18:30',
      duration: 45,
      reason: `D${riseDay.cycleDay} ${riseDay.phase6}：RISE 期能量回升，可逐步增加训练刺激。`,
    },
    {
      date: trainingDay.dateKey,
      type: 'fitness',
      title: trainingDay.phase === 'RESET' ? '轻瑜伽或散步' : '力量 + 短有氧组合',
      time: '18:30',
      duration: trainingDay.phase === 'RESET' ? 25 : 50,
      reason: `D${trainingDay.cycleDay} ${trainingDay.phase6}：按当前窗口最有余力的阶段安排训练，避开过度拥挤日。`,
    },
    {
      date: focusDay.dateKey,
      type: 'sleep',
      title: '今晚提前关机，多睡一点',
      reason: `D${focusDay.cycleDay} ${focusDay.phase6}：按当前窗口的恢复与输出节奏，今晚优先保护睡眠质量。`,
    },
    {
      date: riseDay.dateKey,
      type: 'fasting',
      title: '轻热量缺口日，不做激进断食',
      reason: `D${riseDay.cycleDay} ${riseDay.phase6}：比 RESET 更适合轻度缺口，但仍保留蛋白质和水分。`,
    },
    {
      date: focusDay.dateKey,
      type: 'nutrition',
      title: '镁 + 蛋白质，稳定食欲和专注',
      nutritionType: 'magnesium, protein',
      nutrients: [
        { name: 'magnesium', amount: '300-320', unit: 'mg', dailyTip: '约 30g 南瓜籽 + 两小块黑巧。' },
        { name: 'protein', amount: '60-80', unit: 'g', dailyTip: '约一块鸡胸肉 + 一杯希腊酸奶。' },
      ],
      reason: `D${focusDay.cycleDay} ${focusDay.phase6}：用镁和蛋白质稳定血糖、食欲和恢复。`,
    },
  ];
}

export function Plan() {
  const [state] = useAppState();
  const [lang] = useLang();
  const zh = lang === 'zh';
  const profile = state.profile!;

  const [planWindow, setPlanWindow] = useState<PlanWindow>(loadPlanWindow);
  const [filters, setFilters] = useState<Set<PlanCategory>>(
    new Set(['nutrition', 'fitness', 'skin', 'review', 'planning', 'custom']),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('menu');
  const [importText, setImportText] = useState('');
  const [importImage, setImportImage] = useState<{ fileName: string; imageBase64: string } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastAiPrompt, setLastAiPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(loadSelectedModelId);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(loadApiKeys);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ state: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    state: 'idle',
    message: '',
  });
  const [modelSwitchNotice, setModelSwitchNotice] = useState('');
  const [detailTarget, setDetailTarget] = useState<PlanDetailTarget | null>(null);
  const [dayDrawer, setDayDrawer] = useState<DayData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestionEditorOpen, setSuggestionEditorOpen] = useState(false);
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [suggestionDraft, setSuggestionDraft] = useState<Omit<AISuggestion, 'id' | 'source' | 'accepted'>>({
    title: '',
    date: planWindow.windowStartDate,
    time: '',
    duration: 30,
    suggestionType: 'review',
    reason: '',
    nutritionType: '',
    nutrients: [],
  });
  const [draft, setDraft] = useState<Omit<PlanItem, 'id' | 'source' | 'completed'>>({
    title: '',
    date: planWindow.windowStartDate,
    time: '',
    duration: 30,
    category: 'custom',
    note: '',
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planWindow));
  }, [planWindow]);

  useEffect(() => {
    localStorage.setItem(AI_MODEL_STORAGE_KEY, selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    localStorage.setItem(AI_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    const model = AI_MODELS.find(item => item.id === selectedModelId) ?? AI_MODELS[0];
    setApiKeyDraft(getConfiguredApiKey(model, apiKeys));
    setConnectionStatus({ state: 'idle', message: '' });
  }, [selectedModelId, apiKeys]);

  useEffect(() => {
    setPlanWindow(current => {
      let changed = false;
      const days = current.days.map(day => {
        if (day.sleepHours !== '') return day;
        const log = state.dailyLogs.find(entry => entry.date === day.dateKey);
        if (!log) return day;
        changed = true;
        return { ...day, sleepHours: log.sleepHours };
      });
      return changed ? { ...current, days } : current;
    });
  }, [state.dailyLogs]);

  const windowStart = useMemo(() => parseDateLocal(planWindow.windowStartDate), [planWindow.windowStartDate]);

  const visibleDays = useMemo<DayData[]>(() => (
    Array.from({ length: 7 }, (_, index) => {
      const date = addDays(windowStart, index);
      const cycleDay = getCycleDayForDate(date, profile.periodDate, profile.cycleLength);
      const info = getPhaseInfo(cycleDay, profile.cycleLength);
      return { date, dateKey: toDateKey(date), cycleDay, phase: info.phase, phase6: info.phase6 };
    })
  ), [windowStart, profile.periodDate, profile.cycleLength]);

  const items = useMemo(() => getWindowItems(planWindow), [planWindow]);
  const suggestions = useMemo(() => getWindowSuggestions(planWindow), [planWindow]);

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
  const windowEndDate = visibleDays[6].dateKey;
  const visibleDateKeys = useMemo(() => new Set(visibleDays.map(day => day.dateKey)), [visibleDays]);
  const windowContext = useMemo(
    () => getWindowContext(visibleDays, planWindow, profile.cycleLength, ovulationDay),
    [visibleDays, planWindow, profile.cycleLength, ovulationDay],
  );
  const selectedModel = useMemo(
    () => AI_MODELS.find(model => model.id === selectedModelId) ?? AI_MODELS[0],
    [selectedModelId],
  );
  const selectedApiKey = getConfiguredApiKey(selectedModel, apiKeys);
  const hasConfiguredApiKey = Boolean(selectedApiKey.trim());

  const openNewItem = (dateKey: string, category: PlanCategory = 'custom') => {
    const safeDate = visibleDateKeys.has(dateKey) ? dateKey : planWindow.windowStartDate;
    setEditingId(null);
    setDraft({ title: '', date: safeDate, time: '', duration: 30, category, note: '' });
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

  const showItemDetail = (item: PlanItem, day: DayData) => {
    setDetailTarget({ type: 'item', item, day });
  };

  const showSuggestionDetail = (suggestion: AISuggestion, day: DayData) => {
    setDetailTarget({ type: 'suggestion', suggestion, day });
  };

  const saveAISettings = () => {
    const trimmedKey = apiKeyDraft.trim();
    setApiKeys(current => ({ ...current, [selectedModel.id]: trimmedKey }));
    setSettingsOpen(false);
    setModelSwitchNotice(zh
      ? `已切换到 ${selectedModel.provider} · ${selectedModel.name} 模型，下次生成将使用新模型。`
      : `Switched to ${selectedModel.provider} · ${selectedModel.name}. The next generation will use it.`);
    window.setTimeout(() => setModelSwitchNotice(''), 3600);
  };

  const pasteApiKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKeyDraft(text.trim());
    } catch (error) {
      setConnectionStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runConnectionTest = async () => {
    setConnectionStatus({ state: 'testing', message: zh ? '正在测试连接...' : 'Testing connection...' });
    try {
      await testAIConnection(selectedModel, apiKeyDraft.trim());
      setConnectionStatus({ state: 'success', message: zh ? '连接正常' : 'Connection works' });
    } catch (error) {
      setConnectionStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const saveDraft = () => {
    if (!draft.title.trim()) return;
    const safeDate = visibleDateKeys.has(draft.date) ? draft.date : planWindow.windowStartDate;
    setPlanWindow(current => {
      const existing = editingId ? getWindowItems(current).find(item => item.id === editingId) : undefined;
      const nextItem: PlanItem = existing
        ? { ...existing, ...draft, date: safeDate, title: draft.title.trim() }
        : {
          ...draft,
          date: safeDate,
          id: `user-${Date.now()}`,
          title: draft.title.trim(),
          source: 'user',
          completed: false,
        };

      return {
        ...current,
        days: current.days.map(day => {
          const withoutEdited = editingId
            ? day.items.filter(item => item.id !== editingId)
            : day.items;
          return day.dateKey === safeDate
            ? { ...day, items: [...withoutEdited, nextItem] }
            : { ...day, items: withoutEdited };
        }),
      };
    });
    setEditorOpen(false);
  };

  const deleteItem = (itemId: string) => {
    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => ({
        ...day,
        items: day.items.filter(item => item.id !== itemId),
      })),
    }));
  };

  const toggleItemCompleted = (itemId: string) => {
    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => ({
        ...day,
        items: day.items.map(item => (
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )),
      })),
    }));
  };

  const removeOptionPlan = () => {
    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => ({
        ...day,
        items: day.items.filter(item => item.source === 'user'),
      })),
    }));
  };

  const resetWindowFromToday = () => {
    setPlanWindow(resolveEffectivePlanWindow(null, new Date(), 'reset-from-today'));
    setResetConfirmOpen(false);
  };

  const savePendingText = () => {
    if (!importText.trim()) return;
    setPlanWindow(current => ({
      ...current,
      pendingText: {
        rawText: importText.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    }));
    setImportText('');
    setImportOpen(false);
    setImportMode('menu');
  };

  const savePendingImage = () => {
    if (!importImage) return;
    setPlanWindow(current => ({
      ...current,
      pendingImage: {
        fileName: importImage.fileName,
        imageBase64: importImage.imageBase64,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    }));
    setImportImage(null);
    setImportOpen(false);
    setImportMode('menu');
  };

  const readImportImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportImage({ fileName: file.name, imageBase64: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const applyImportedEvents = (events: PlanItem[]) => {
    if (events.length === 0) return;
    setPlanWindow(current => ({
      ...current,
      pendingImage: undefined,
      pendingText: undefined,
      days: current.days.map(day => ({
        ...day,
        items: [
          ...day.items,
          ...events.filter(event => event.date === day.dateKey),
        ],
      })),
    }));
  };

  const parsePendingImports = async () => {
    if (!planWindow.pendingText && !planWindow.pendingImage) return;
    setAiBusy(true);
    setAiError(null);

    const prompt = buildParsePrompt(windowContext, planWindow.pendingText?.rawText);
    setLastAiPrompt(prompt);

    try {
      let parsed: ParsedAIEvent[] = [];
      if (selectedApiKey) {
        const image = planWindow.pendingImage ? splitDataUrl(planWindow.pendingImage.imageBase64) : undefined;
        const rawText = await requestAIText(selectedModel, selectedApiKey, prompt, image);
        parsed = parseJsonPayload<{ events: ParsedAIEvent[] }>(rawText).events ?? [];
      } else {
        parsed = localParseFallback(planWindow.pendingText?.rawText ?? '', visibleDays);
      }

      const events = parsed
        .map(event => normalizeImportedEvent(event, visibleDateKeys))
        .filter((event): event is PlanItem => Boolean(event));
      applyImportedEvents(events);
    } catch (error) {
      const fallback = localParseFallback(planWindow.pendingText?.rawText ?? '', visibleDays)
        .map(event => normalizeImportedEvent(event, visibleDateKeys))
        .filter((event): event is PlanItem => Boolean(event));
      applyImportedEvents(fallback);
      setAiError(error instanceof Error ? error.message : String(error));
    } finally {
      setAiBusy(false);
    }
  };

  const generatePlan = async () => {
    setAiBusy(true);
    setAiError(null);

    const prompt = buildSchedulePrompt(windowContext);
    setLastAiPrompt(prompt);

    try {
      let rawSuggestions: RawAISuggestion[] = [];
      if (selectedApiKey) {
        const rawText = await requestAIText(selectedModel, selectedApiKey, prompt);
        rawSuggestions = parseJsonPayload<{ suggestions: RawAISuggestion[] }>(rawText).suggestions ?? [];
      } else {
        rawSuggestions = localScheduleFallback(visibleDays, planWindow, profile.cycleLength);
      }

      const nextSuggestions = rawSuggestions
        .map(suggestion => normalizeAISuggestion(suggestion, visibleDateKeys))
        .filter((suggestion): suggestion is AISuggestion => Boolean(suggestion));

      setPlanWindow(current => ({
        ...current,
        days: current.days.map(day => ({
          ...day,
          dayStatus: (() => {
            const dayData = visibleDays.find(candidate => candidate.dateKey === day.dateKey);
            const dateSuggestions = nextSuggestions.filter(suggestion => suggestion.date === day.dateKey);
            return dayData ? getDayStatusLabel(dayData, { ...day, dayStatus: '' }, dateSuggestions, zh) : day.dayStatus;
          })(),
          aiSuggestions: [
            ...day.aiSuggestions.filter(suggestion => suggestion.accepted),
            ...nextSuggestions.filter(suggestion => suggestion.date === day.dateKey),
          ],
        })),
      }));
    } catch (error) {
      const fallback = localScheduleFallback(visibleDays, planWindow, profile.cycleLength)
        .map(suggestion => normalizeAISuggestion(suggestion, visibleDateKeys))
        .filter((suggestion): suggestion is AISuggestion => Boolean(suggestion));
      setPlanWindow(current => ({
        ...current,
        days: current.days.map(day => ({
          ...day,
          dayStatus: (() => {
            const dayData = visibleDays.find(candidate => candidate.dateKey === day.dateKey);
            const dateSuggestions = fallback.filter(suggestion => suggestion.date === day.dateKey);
            return dayData ? getDayStatusLabel(dayData, { ...day, dayStatus: '' }, dateSuggestions, zh) : day.dayStatus;
          })(),
          aiSuggestions: [
            ...day.aiSuggestions.filter(suggestion => suggestion.accepted),
            ...fallback.filter(suggestion => suggestion.date === day.dateKey),
          ],
        })),
      }));
      setAiError(error instanceof Error ? error.message : String(error));
    } finally {
      setAiBusy(false);
    }
  };

  const saveSuggestionDraft = () => {
    if (!editingSuggestionId || !suggestionDraft.title.trim()) return;
    const safeDate = visibleDateKeys.has(suggestionDraft.date) ? suggestionDraft.date : planWindow.windowStartDate;
    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => {
        const withoutEdited = day.aiSuggestions.filter(suggestion => suggestion.id !== editingSuggestionId);
        if (day.dateKey !== safeDate) return { ...day, aiSuggestions: withoutEdited };
        return {
          ...day,
          aiSuggestions: [
            ...withoutEdited,
            {
              id: editingSuggestionId,
              ...suggestionDraft,
              date: safeDate,
              title: suggestionDraft.title.trim(),
              nutritionType: suggestionDraft.nutritionType?.trim() || undefined,
              source: 'ai',
              accepted: false,
            },
          ],
        };
      }),
    }));
    setSuggestionEditorOpen(false);
  };

  const deleteSuggestion = (suggestionId: string) => {
    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => ({
        ...day,
        aiSuggestions: day.aiSuggestions.filter(suggestion => suggestion.id !== suggestionId),
      })),
    }));
    setSuggestionEditorOpen(false);
  };

  const acceptSuggestion = (suggestion: AISuggestion) => {
    const item = suggestionToPlanItem(suggestion);
    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => ({
        ...day,
        items: day.dateKey === item.date ? [...day.items, item] : day.items,
        aiSuggestions: day.aiSuggestions.filter(currentSuggestion => currentSuggestion.id !== suggestion.id),
      })),
    }));
    setSuggestionEditorOpen(false);
  };

  const moveSuggestion = (suggestionId: string, targetDate: string) => {
    if (!visibleDateKeys.has(targetDate)) return;
    const suggestion = suggestions.find(item => item.id === suggestionId);
    if (!suggestion) return;

    setPlanWindow(current => ({
      ...current,
      days: current.days.map(day => {
        const withoutDragged = day.aiSuggestions.filter(item => item.id !== suggestionId);
        return day.dateKey === targetDate
          ? { ...day, aiSuggestions: [...withoutDragged, { ...suggestion, date: targetDate }] }
          : { ...day, aiSuggestions: withoutDragged };
      }),
    }));
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
    ? `${windowStart.getMonth() + 1}月${windowStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`
    : `${windowStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;

  const weekdayLabel = (date: Date) => {
    if (zh) return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return date.toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
  };

  return (
    <div className="h-screen overflow-y-auto px-4 py-4 sm:px-6 lg:px-7 xl:px-8">
      <div className="mx-auto max-w-[1480px] space-y-3 pb-8">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-baseline gap-3">
            <p className="flex-shrink-0 text-[10px] font-black tracking-[0.2em] text-[#2D2D2D]/35 uppercase">
              {zh ? '生理节律计划' : 'Biological rhythm planning'}
            </p>
            <h1 className="truncate text-2xl sm:text-[26px] font-serif leading-tight">
              {zh ? '把身体状态变成可执行的计划。' : 'Turn body signals into an executable plan.'}
            </h1>
          </div>
          <div className="flex flex-shrink-0 items-center justify-end gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="h-9 px-3 rounded-xl bg-white/78 border border-[#2D2D2D]/8 text-[#2D2D2D]/65 text-xs font-bold flex items-center gap-2 hover:bg-white"
            >
              <Settings className="w-4 h-4" />
              {zh ? '设置' : 'Settings'}
            </button>
            <div className="relative">
              <button
                onClick={generatePlan}
                disabled={aiBusy}
                className="relative h-9 px-4 rounded-xl bg-[#2D2D2D] text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-black/10 disabled:opacity-40"
              >
                <WandSparkles className="w-4 h-4" />
                {aiBusy ? (zh ? 'AI 处理中' : 'AI working') : (zh ? 'AI 生成当前窗口计划' : 'AI schedule window')}
                {!hasConfiguredApiKey && (
                  <span
                    title={zh ? '未配置 API key，点击设置添加。' : 'No API key configured. Open settings to add one.'}
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#F9F7F2]"
                  />
                )}
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setMoreOpen(open => !open)}
                className="h-9 w-9 rounded-xl bg-white/78 border border-[#2D2D2D]/8 text-[#2D2D2D]/55 flex items-center justify-center hover:bg-white"
                aria-label={zh ? '更多操作' : 'More actions'}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-[#2D2D2D]/8 bg-white p-2 shadow-2xl shadow-black/10">
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      setResetConfirmOpen(true);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-[#D85A30] hover:bg-[#FAECE7]"
                  >
                    {zh ? '重新从今天开始生成' : 'Restart from today'}
                  </button>
                  <button
                    onClick={() => {
                      removeOptionPlan();
                      setMoreOpen(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#2D2D2D]/60 hover:bg-[#F2F0EB]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {zh ? '撤销 Option 建议' : 'Clear Option suggestions'}
                  </button>
                  <div className="mt-2 border-t border-[#2D2D2D]/7 pt-2">
                    <p className="px-3 text-[10px] font-black tracking-widest text-[#2D2D2D]/35 uppercase">
                      {zh ? '上次 AI Prompt' : 'Last AI prompt'}
                    </p>
                    {lastAiPrompt ? (
                      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-[#F9F7F2] p-3 text-[10px] leading-relaxed text-[#2D2D2D]/55">
                        {lastAiPrompt}
                      </pre>
                    ) : (
                      <p className="px-3 py-2 text-xs text-[#2D2D2D]/35">{zh ? '暂无记录' : 'No prompt yet'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#2D2D2D]/7 bg-white/88 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-8 w-8 flex-shrink-0 rounded-xl bg-[#F2F0EB] text-[#2D2D2D]/45 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </span>
            <span className="whitespace-nowrap text-sm font-bold text-[#2D2D2D]/72">
              {weekLabel}
            </span>
            <span className="hidden sm:inline-flex rounded-full bg-[#F2F0EB] px-2 py-1 text-[10px] font-bold text-[#2D2D2D]/40">
              {zh ? '当前生效窗口' : 'Active window'}
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => {
                setImportOpen(true);
                setImportMode('menu');
              }}
              className="h-8 px-3 rounded-xl bg-white border border-[#2D2D2D]/8 text-[#2D2D2D]/62 text-xs font-bold flex items-center gap-1.5 hover:bg-[#F9F7F2]"
            >
              <Upload className="w-4 h-4" />
              {zh ? '+ 导入已有计划' : '+ Import'}
            </button>
            <button
              onClick={() => openNewItem(planWindow.windowStartDate)}
              className="h-8 px-3 rounded-xl bg-white border border-[#2D2D2D]/8 text-[#2D2D2D]/62 text-xs font-bold flex items-center gap-1.5 hover:bg-[#F9F7F2]"
            >
              <Plus className="w-4 h-4" />
              {zh ? '+ 手动添加' : '+ Add'}
            </button>
          </div>
          <div className="flex max-w-[44%] gap-1.5 overflow-x-auto pb-0.5">
            {(Object.keys(CATEGORY_META) as PlanCategory[]).map(category => {
              const meta = CATEGORY_META[category];
              const Icon = meta.icon;
              const active = filters.has(category);
              return (
                <button
                  key={category}
                  onClick={() => toggleFilter(category)}
                  className="h-7 px-2.5 flex-shrink-0 rounded-full flex items-center gap-1.5 text-[10px] font-bold transition-opacity"
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

        {modelSwitchNotice && (
          <section className="rounded-xl border border-[#085041]/10 bg-[#E1F5EE] px-3 py-2 text-xs text-[#085041]">
            {modelSwitchNotice}
          </section>
        )}

        {(planWindow.pendingImage || planWindow.pendingText) && (
          <section className="flex flex-wrap items-center gap-2">
            {planWindow.pendingImage && (
              <div className="rounded-xl border border-[#2D2D2D]/7 bg-white/70 px-3 py-2 text-xs text-[#2D2D2D]/55">
                <span className="font-bold text-[#2D2D2D]/75">{zh ? '待解析图片' : 'Pending image'}：</span>
                {planWindow.pendingImage.fileName}
              </div>
            )}
            {planWindow.pendingText && (
              <div className="rounded-xl border border-[#2D2D2D]/7 bg-white/70 px-3 py-2 text-xs text-[#2D2D2D]/55">
                <span className="font-bold text-[#2D2D2D]/75">{zh ? '待解析文本' : 'Pending text'}：</span>
                {planWindow.pendingText.rawText.slice(0, 36)}
                {planWindow.pendingText.rawText.length > 36 ? '...' : ''}
              </div>
            )}
            <button
              onClick={parsePendingImports}
              disabled={aiBusy}
              className="h-9 px-3 rounded-xl bg-[#2D2D2D] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            >
              <WandSparkles className="w-4 h-4" />
              {zh ? 'AI 解析导入' : 'AI parse import'}
            </button>
          </section>
        )}

        {aiError && (
          <section className="rounded-xl border border-[#D85A30]/15 bg-[#FAECE7] px-3 py-2 text-xs text-[#712B13]">
            {aiError}
          </section>
        )}

        <section className="hidden xl:grid grid-cols-7">
          {visibleDays.map(day => {
            const phase = PHASE_META[day.phase];
            const dayRecord = planWindow.days.find(record => record.dateKey === day.dateKey);
            const dayItems = visibleItems.filter(item => item.date === day.dateKey);
            const daySuggestions = suggestions.filter(suggestion => suggestion.date === day.dateKey);
            const dayEntries: PlanDetailTarget[] = [
              ...dayItems.map(item => ({ type: 'item' as const, item, day })),
              ...daySuggestions.map(suggestion => ({ type: 'suggestion' as const, suggestion, day })),
            ].sort((a, b) => {
              const aTime = a.type === 'item' ? a.item.time : a.suggestion.time;
              const bTime = b.type === 'item' ? b.item.time : b.suggestion.time;
              return aTime.localeCompare(bTime);
            });
            const visibleEntries = dayEntries.slice(0, 4);
            const dayStatus = getDayStatusLabel(day, dayRecord, daySuggestions, zh);
            const today = day.dateKey === toDateKey(new Date());
            return (
              <div
                key={day.dateKey}
                className="relative h-[470px] 2xl:h-[590px] flex flex-col border-r border-black/[0.06] px-2 last:border-r-0"
                onDragOver={event => event.preventDefault()}
                onDrop={event => moveSuggestion(event.dataTransfer.getData('text/plain'), day.dateKey)}
              >
                <div className="h-20 px-1 py-2.5">
                  <div className="flex h-6 items-center justify-between gap-2">
                    <button
                      onClick={() => setDayDrawer(day)}
                      className="min-w-0 text-left"
                    >
                      <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#2D2D2D]/42">{weekdayLabel(day.date)}</span>
                        <span className="text-[19px] leading-none font-bold text-[#2D2D2D]/82">{day.date.getDate()}</span>
                      </span>
                      {today && <span className="mt-1 block h-0.5 w-6 rounded-full" style={{ backgroundColor: phase.color }} />}
                    </button>
                    <button
                      onClick={() => openNewItem(day.dateKey)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-[#2D2D2D]/45 hover:bg-[#2D2D2D]/5 hover:text-[#2D2D2D]"
                      aria-label={zh ? '添加计划' : 'Add plan'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex h-5 items-center justify-between gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                      style={{ color: phase.color, backgroundColor: `${phase.color}12` }}
                    >
                      {day.phase}
                    </span>
                    <span className="text-[11px] font-mono text-[#2D2D2D]/42">D{day.cycleDay}/{profile.cycleLength}</span>
                  </div>
                  <div className="mt-1.5 h-5">
                    <span
                      title={dayStatus}
                      className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ color: phase.color, backgroundColor: `${phase.color}10` }}
                    >
                      {dayStatus}
                    </span>
                  </div>
                </div>
                <div className="px-1 pb-2.5 pt-4 flex flex-1 flex-col gap-2">
                  <div className="space-y-1.5">
                    {visibleEntries.map(entry => (
                      entry.type === 'item' ? (
                        <div key={entry.item.id}>
                          <PlanSummaryRow
                            item={entry.item}
                            label={categoryLabels[entry.item.category]}
                            onClick={() => showItemDetail(entry.item, day)}
                          />
                        </div>
                      ) : (
                        <div key={entry.suggestion.id}>
                          <AISuggestionSummaryRow
                            suggestion={entry.suggestion}
                            label={categoryLabels[suggestionTypeToCategory(entry.suggestion.suggestionType)]}
                            onClick={() => showSuggestionDetail(entry.suggestion, day)}
                            phaseColor={phase.color}
                          />
                        </div>
                      )
                    ))}
                    {dayEntries.length > 4 && (
                      <button
                        onClick={() => setDayDrawer(day)}
                        className="h-8 w-full rounded-xl border border-dashed border-[#2D2D2D]/12 bg-white/55 text-[11px] font-bold text-[#2D2D2D]/45 hover:bg-white"
                      >
                        +{dayEntries.length - 4} {zh ? '项' : 'more'}
                      </button>
                    )}
                    {dayEntries.length === 0 && (
                      <button
                        onClick={() => openNewItem(day.dateKey)}
                        className="w-full py-8 text-[10px] text-[#2D2D2D]/25 hover:text-[#2D2D2D]/45"
                      >
                        {zh ? '+ 添加计划' : '+ Add plan'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="xl:hidden space-y-3">
          {visibleDays.map(day => {
            const phase = PHASE_META[day.phase];
            const dayRecord = planWindow.days.find(record => record.dateKey === day.dateKey);
            const dayItems = visibleItems.filter(item => item.date === day.dateKey);
            const daySuggestions = suggestions.filter(suggestion => suggestion.date === day.dateKey);
            const dayEntries: PlanDetailTarget[] = [
              ...dayItems.map(item => ({ type: 'item' as const, item, day })),
              ...daySuggestions.map(suggestion => ({ type: 'suggestion' as const, suggestion, day })),
            ].sort((a, b) => {
              const aTime = a.type === 'item' ? a.item.time : a.suggestion.time;
              const bTime = b.type === 'item' ? b.item.time : b.suggestion.time;
              return aTime.localeCompare(bTime);
            });
            const visibleEntries = dayEntries.slice(0, 4);
            const dayStatus = getDayStatusLabel(day, dayRecord, daySuggestions, zh);
            const today = day.dateKey === toDateKey(new Date());
            return (
              <div
                key={day.dateKey}
                className="relative bg-white/88 rounded-[22px] border border-[#2D2D2D]/7 overflow-hidden"
                style={{
                  boxShadow: today ? `inset 0 0 0 2px ${phase.color}55` : undefined,
                }}
                onDragOver={event => event.preventDefault()}
                onDrop={event => moveSuggestion(event.dataTransfer.getData('text/plain'), day.dateKey)}
              >
                {today && (
                  <span
                    className="absolute left-0 top-0 h-0 w-0 border-r-[13px] border-t-[13px] border-r-transparent"
                    style={{ borderTopColor: phase.color }}
                  />
                )}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <button onClick={() => setDayDrawer(day)} className="flex items-baseline gap-2 text-left">
                      <span className="text-xs font-semibold text-[#2D2D2D]/42">{weekdayLabel(day.date)}</span>
                      <span className="text-xl font-bold text-[#2D2D2D]/82">{day.date.getDate()}</span>
                    </button>
                    <button
                      onClick={() => openNewItem(day.dateKey)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-[#2D2D2D]/45 hover:bg-[#2D2D2D]/5"
                      aria-label={zh ? '添加计划' : 'Add plan'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: phase.color, backgroundColor: phase.bg }}>
                      {day.phase}
                    </span>
                    <span className="text-[11px] font-mono text-[#2D2D2D]/42">D{day.cycleDay}/{profile.cycleLength}</span>
                  </div>
                  <div className="mt-1.5 h-5">
                    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: phase.color, backgroundColor: phase.bg }}>
                      {dayStatus}
                    </span>
                  </div>
                </div>
                <div className="px-3 pb-3 pt-4 flex flex-col gap-2">
                  <div className="space-y-2">
                    {visibleEntries.map(entry => (
                      entry.type === 'item' ? (
                        <div key={entry.item.id}>
                          <PlanSummaryRow
                            item={entry.item}
                            label={categoryLabels[entry.item.category]}
                            onClick={() => showItemDetail(entry.item, day)}
                          />
                        </div>
                      ) : (
                        <div key={entry.suggestion.id}>
                          <AISuggestionSummaryRow
                            suggestion={entry.suggestion}
                            label={categoryLabels[suggestionTypeToCategory(entry.suggestion.suggestionType)]}
                            onClick={() => showSuggestionDetail(entry.suggestion, day)}
                            phaseColor={phase.color}
                          />
                        </div>
                      )
                    ))}
                    {dayEntries.length > 4 && (
                      <button
                        onClick={() => setDayDrawer(day)}
                        className="h-9 w-full rounded-xl border border-dashed border-[#2D2D2D]/12 bg-white/55 text-xs font-bold text-[#2D2D2D]/45"
                      >
                        +{dayEntries.length - 4} {zh ? '项' : 'more'}
                      </button>
                    )}
                    {dayEntries.length === 0 && (
                      <button onClick={() => openNewItem(day.dateKey)} className="w-full py-5 text-xs text-[#2D2D2D]/30">
                        {zh ? '这一天还没有计划' : 'Nothing planned yet'}
                      </button>
                    )}
                  </div>
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
                    <input
                      type="date"
                      min={planWindow.windowStartDate}
                      max={windowEndDate}
                      value={draft.date}
                      onChange={event => setDraft(current => ({ ...current, date: event.target.value }))}
                    />
                  </label>
                  <label className="plan-field">
                    <span>{zh ? '时间（可选）' : 'Time optional'}</span>
                    <input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} />
                  </label>
                  <label className="plan-field">
                    <span>{zh ? '分钟（可选）' : 'Minutes optional'}</span>
                    <input type="number" min="0" step="5" value={draft.duration} onChange={event => setDraft(current => ({ ...current, duration: Number(event.target.value) }))} />
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
                        deleteItem(editingId);
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
                        toggleItemCompleted(editingItem.id);
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

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[84] bg-[#2D2D2D]/25 backdrop-blur-sm flex justify-end"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              className="h-full w-full max-w-[520px] bg-[#F9F7F2] shadow-2xl flex flex-col"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#2D2D2D]/8 px-5 py-4">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-[#2D2D2D]/35 uppercase">Option AI</p>
                  <h2 className="mt-1 font-serif text-2xl">{zh ? 'AI 模型配置' : 'AI model settings'}</h2>
                </div>
                <button onClick={() => setSettingsOpen(false)} className="calendar-icon-button" aria-label={zh ? '关闭' : 'Close'}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <section>
                  <p className="text-xs font-black tracking-widest text-[#2D2D2D]/45 uppercase">
                    {zh ? '选择模型' : 'Choose model'}
                  </p>
                  <div className="mt-3 max-h-[400px] space-y-2 overflow-y-auto pr-1">
                    {AI_MODELS.map(model => {
                      const selected = model.id === selectedModel.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModelId(model.id)}
                          className="w-full rounded-2xl border bg-white/78 p-3 text-left transition hover:bg-white"
                          style={{
                            borderColor: selected ? '#2D2D2D' : 'rgba(45,45,45,0.08)',
                            boxShadow: selected ? '0 0 0 2px rgba(45,45,45,0.08)' : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-[#2D2D2D]/82">
                                {model.provider} · {model.name}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[#2D2D2D]/45">{model.description}</p>
                            </div>
                            {selected && (
                              <span className="h-6 w-6 flex-shrink-0 rounded-full bg-[#E1F5EE] text-[#085041] flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-6">
                  <p className="text-xs font-black tracking-widest text-[#2D2D2D]/45 uppercase">
                    {zh ? 'API key 输入' : 'API key'}
                  </p>
                  <div className="mt-3 rounded-2xl border border-[#2D2D2D]/8 bg-white p-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type={apiKeyVisible ? 'text' : 'password'}
                        value={apiKeyDraft}
                        onChange={event => setApiKeyDraft(event.target.value)}
                        placeholder={zh ? '粘贴你的 API key' : 'Paste your API key'}
                        className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                      />
                      <button
                        onClick={() => setApiKeyVisible(visible => !visible)}
                        className="h-8 w-8 rounded-lg text-[#2D2D2D]/45 hover:bg-[#F2F0EB] flex items-center justify-center"
                        aria-label={apiKeyVisible ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show')}
                      >
                        {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={pasteApiKey}
                        className="h-8 px-2 rounded-lg text-xs font-bold text-[#2D2D2D]/55 hover:bg-[#F2F0EB] flex items-center gap-1"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        {zh ? '粘贴' : 'Paste'}
                      </button>
                      <button
                        onClick={runConnectionTest}
                        disabled={!apiKeyDraft.trim() || connectionStatus.state === 'testing'}
                        className="h-8 px-2.5 rounded-lg bg-[#2D2D2D] text-white text-xs font-bold disabled:opacity-35"
                      >
                        {zh ? '测试连接' : 'Test'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#2D2D2D]/40">
                    {zh
                      ? 'key 仅保存在本地 localStorage，不会上传到 Option 服务器；调用模型时会直接发往对应模型服务。'
                      : 'The key is stored only in localStorage and is sent directly to the selected model provider when used.'}
                  </p>
                  {connectionStatus.state !== 'idle' && (
                    <p
                      className="mt-2 text-xs font-bold"
                      style={{ color: connectionStatus.state === 'success' ? '#085041' : connectionStatus.state === 'error' ? '#D85A30' : 'rgba(45,45,45,0.45)' }}
                    >
                      {connectionStatus.state === 'success' ? '✓ ' : connectionStatus.state === 'error' ? '✕ ' : ''}
                      {connectionStatus.message}
                    </p>
                  )}
                </section>
              </div>

              <div className="border-t border-[#2D2D2D]/8 p-5">
                <button
                  onClick={saveAISettings}
                  className="h-12 w-full rounded-xl bg-[#2D2D2D] text-white text-sm font-bold"
                >
                  {zh ? '保存并应用' : 'Save and apply'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailTarget && (
          <PlanDetailDrawer
            target={detailTarget}
            cycleLength={profile.cycleLength}
            categoryLabels={categoryLabels}
            zh={zh}
            onClose={() => setDetailTarget(null)}
            onEditItem={item => {
              setDetailTarget(null);
              openItem(item);
            }}
            onToggleItem={item => toggleItemCompleted(item.id)}
            onDeleteItem={item => {
              deleteItem(item.id);
              setDetailTarget(null);
            }}
            onEditSuggestion={suggestion => {
              setDetailTarget(null);
              setEditingSuggestionId(suggestion.id);
              setSuggestionDraft({
                title: suggestion.title,
                date: suggestion.date,
                time: suggestion.time,
                duration: suggestion.duration,
                suggestionType: suggestion.suggestionType,
                reason: suggestion.reason,
                nutritionType: suggestion.nutritionType ?? '',
                nutrients: suggestion.nutrients ?? [],
              });
              setSuggestionEditorOpen(true);
            }}
            onAcceptSuggestion={suggestion => {
              acceptSuggestion(suggestion);
              setDetailTarget(null);
            }}
            onDeleteSuggestion={suggestion => {
              deleteSuggestion(suggestion.id);
              setDetailTarget(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dayDrawer && (
          <DayItemsDrawer
            day={dayDrawer}
            items={visibleItems.filter(item => item.date === dayDrawer.dateKey)}
            suggestions={suggestions.filter(suggestion => suggestion.date === dayDrawer.dateKey)}
            cycleLength={profile.cycleLength}
            categoryLabels={categoryLabels}
            zh={zh}
            onClose={() => setDayDrawer(null)}
            onOpenItem={item => showItemDetail(item, dayDrawer)}
            onOpenSuggestion={suggestion => showSuggestionDetail(suggestion, dayDrawer)}
            onAdd={() => {
              setDayDrawer(null);
              openNewItem(dayDrawer.dateKey);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suggestionEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[82] bg-[#2D2D2D]/25 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setSuggestionEditorOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-lg bg-[#F9F7F2] rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">{zh ? '编辑 AI 建议' : 'Edit AI suggestion'}</h2>
                <button
                  onClick={() => setSuggestionEditorOpen(false)}
                  className="calendar-icon-button"
                  aria-label={zh ? '关闭' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <input
                  value={suggestionDraft.title}
                  onChange={event => setSuggestionDraft(current => ({ ...current, title: event.target.value }))}
                  placeholder={zh ? '建议内容' : 'Suggestion title'}
                  className="input-field bg-white"
                  autoFocus
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(Object.keys(AI_TYPE_META) as AISuggestionType[]).map(type => {
                    const meta = AI_TYPE_META[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setSuggestionDraft(current => ({ ...current, suggestionType: type }))}
                        className="px-3 py-2 rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{
                          color: meta.color,
                          backgroundColor: meta.bg,
                          outline: suggestionDraft.suggestionType === type ? `2px solid ${meta.color}` : 'none',
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <label className="plan-field col-span-2 sm:col-span-1">
                    <span>{zh ? '日期' : 'Date'}</span>
                    <input
                      type="date"
                      min={planWindow.windowStartDate}
                      max={windowEndDate}
                      value={suggestionDraft.date}
                      onChange={event => setSuggestionDraft(current => ({ ...current, date: event.target.value }))}
                    />
                  </label>
                  <label className="plan-field">
                    <span>{zh ? '时间（可选）' : 'Time optional'}</span>
                    <input type="time" value={suggestionDraft.time} onChange={event => setSuggestionDraft(current => ({ ...current, time: event.target.value }))} />
                  </label>
                  <label className="plan-field">
                    <span>{zh ? '分钟' : 'Minutes'}</span>
                    <input type="number" min="0" step="5" value={suggestionDraft.duration} onChange={event => setSuggestionDraft(current => ({ ...current, duration: Number(event.target.value) }))} />
                  </label>
                </div>
                <input
                  value={suggestionDraft.nutritionType ?? ''}
                  onChange={event => setSuggestionDraft(current => ({ ...current, nutritionType: event.target.value }))}
                  placeholder={zh ? '营养素类型（饮食建议可填）' : 'Nutrition type for nutrition suggestions'}
                  className="input-field bg-white"
                />
                <textarea
                  value={suggestionDraft.reason}
                  onChange={event => setSuggestionDraft(current => ({ ...current, reason: event.target.value }))}
                  placeholder={zh ? '理由：为什么放这一天' : 'Reason: why this day'}
                  className="w-full h-24 resize-none rounded-2xl border border-[#2D2D2D]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#FF8CAF]/60"
                />
                <div className="flex gap-3">
                  {editingSuggestionId && (
                    <button
                      onClick={() => deleteSuggestion(editingSuggestionId)}
                      className="h-12 w-12 rounded-xl border border-red-500/15 text-red-500 flex items-center justify-center"
                      aria-label={zh ? '删除建议' : 'Delete suggestion'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {editingSuggestionId && suggestions.find(suggestion => suggestion.id === editingSuggestionId) && (
                    <button
                      onClick={() => {
                        const suggestion = suggestions.find(item => item.id === editingSuggestionId);
                        if (suggestion) acceptSuggestion({ ...suggestion, ...suggestionDraft, nutritionType: suggestionDraft.nutritionType || undefined });
                      }}
                      className="h-12 px-4 rounded-xl border border-[#085041]/15 bg-[#E1F5EE] text-[#085041] text-sm font-bold flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {zh ? '采纳' : 'Accept'}
                    </button>
                  )}
                  <button
                    onClick={saveSuggestionDraft}
                    disabled={!suggestionDraft.title.trim()}
                    className="flex-1 h-12 rounded-xl bg-[#2D2D2D] text-white font-bold disabled:opacity-30"
                  >
                    {zh ? '保存建议' : 'Save suggestion'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-[#2D2D2D]/25 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setImportOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-xl bg-[#F9F7F2] rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">{zh ? '导入已有计划' : 'Import existing plan'}</h2>
                <button
                  onClick={() => setImportOpen(false)}
                  className="calendar-icon-button"
                  aria-label={zh ? '关闭' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {importMode === 'menu' && (
                <div className="mt-6 grid gap-3">
                  <button
                    onClick={() => setImportMode('image')}
                    className="w-full rounded-2xl border border-[#2D2D2D]/8 bg-white/80 p-4 text-left flex items-center gap-3 hover:bg-white"
                  >
                    <Upload className="w-5 h-5 text-[#D85A30]" />
                    <div>
                      <p className="text-sm font-bold">{zh ? '截图上传' : 'Upload screenshot'}</p>
                      <p className="mt-1 text-xs text-[#2D2D2D]/45">{zh ? '先暂存图片，AI 解析下一轮接入。' : 'Store the image now; AI parsing comes later.'}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setImportMode('text')}
                    className="w-full rounded-2xl border border-[#2D2D2D]/8 bg-white/80 p-4 text-left flex items-center gap-3 hover:bg-white"
                  >
                    <FileText className="w-5 h-5 text-[#534AB7]" />
                    <div>
                      <p className="text-sm font-bold">{zh ? '文字粘贴' : 'Paste text'}</p>
                      <p className="mt-1 text-xs text-[#2D2D2D]/45">{zh ? '原始文本会进入待解析文本槽位。' : 'Raw text is stored as pending text.'}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setImportOpen(false);
                      openNewItem(planWindow.windowStartDate);
                    }}
                    className="w-full rounded-2xl border border-[#2D2D2D]/8 bg-white/80 p-4 text-left flex items-center gap-3 hover:bg-white"
                  >
                    <PencilLine className="w-5 h-5 text-[#085041]" />
                    <div>
                      <p className="text-sm font-bold">{zh ? '手动添加' : 'Add manually'}</p>
                      <p className="mt-1 text-xs text-[#2D2D2D]/45">{zh ? '直接写入当前七天窗口。' : 'Write directly into the active seven-day window.'}</p>
                    </div>
                  </button>
                </div>
              )}

              {importMode === 'image' && (
                <div className="mt-6 space-y-4">
                  <button
                    onClick={() => setImportMode('menu')}
                    className="text-xs font-bold text-[#2D2D2D]/45 hover:text-[#2D2D2D]"
                  >
                    {zh ? '返回导入方式' : 'Back to import options'}
                  </button>
                  <label className="block rounded-2xl border border-dashed border-[#2D2D2D]/18 bg-white/65 p-5 text-center cursor-pointer hover:bg-white">
                    <Upload className="mx-auto w-6 h-6 text-[#D85A30]" />
                    <p className="mt-2 text-sm font-bold">{zh ? '选择 png / jpg 日程截图' : 'Choose a png / jpg schedule screenshot'}</p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={event => readImportImage(event.target.files?.[0])}
                    />
                  </label>
                  {importImage && (
                    <div className="rounded-2xl border border-[#2D2D2D]/8 bg-white p-3">
                      <p className="mb-2 text-xs font-bold text-[#2D2D2D]/55">{importImage.fileName}</p>
                      <img src={importImage.imageBase64} alt="" className="max-h-64 w-full rounded-xl object-contain bg-[#F2F0EB]" />
                    </div>
                  )}
                  <button
                    onClick={savePendingImage}
                    disabled={!importImage}
                    className="w-full h-12 rounded-xl bg-[#2D2D2D] text-white font-bold disabled:opacity-30"
                  >
                    {zh ? '暂存为待解析图片' : 'Save as pending image'}
                  </button>
                </div>
              )}

              {importMode === 'text' && (
                <div className="mt-6 space-y-4">
                  <button
                    onClick={() => setImportMode('menu')}
                    className="text-xs font-bold text-[#2D2D2D]/45 hover:text-[#2D2D2D]"
                  >
                    {zh ? '返回导入方式' : 'Back to import options'}
                  </button>
                  <textarea
                    value={importText}
                    onChange={event => setImportText(event.target.value)}
                    placeholder={zh ? '把已有日程文字粘贴在这里' : 'Paste your existing schedule here'}
                    className="w-full h-56 resize-none rounded-2xl border border-[#2D2D2D]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#FF8CAF]/60"
                    autoFocus
                  />
                  <button
                    onClick={savePendingText}
                    disabled={!importText.trim()}
                    className="w-full h-12 rounded-xl bg-[#2D2D2D] text-white font-bold disabled:opacity-30"
                  >
                    {zh ? '暂存为待解析文本' : 'Save as pending text'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#2D2D2D]/30 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setResetConfirmOpen(false)}
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md rounded-[24px] bg-[#F9F7F2] p-6 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FAECE7] text-[#D85A30] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl">{zh ? '重新生成七天窗口？' : 'Restart the seven-day window?'}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#2D2D2D]/55">
                    {zh
                      ? '这会用今天作为第 1 天，覆盖当前窗口和其中的计划数据。'
                      : 'Today will become day 1, replacing the current window and its plan data.'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setResetConfirmOpen(false)}
                  className="flex-1 h-12 rounded-xl border border-[#2D2D2D]/10 bg-white text-sm font-bold"
                >
                  {zh ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={resetWindowFromToday}
                  className="flex-1 h-12 rounded-xl bg-[#D85A30] text-white text-sm font-bold"
                >
                  {zh ? '确认覆盖' : 'Confirm reset'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function stripTimingText(value: string): string {
  return value
    .replace(/\b([01]?\d|2[0-3]):[0-5]\d\b/g, '')
    .replace(/\b\d+\s*(m|min|mins|minutes)\b/gi, '')
    .replace(/\d+\s*分钟/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/：\s*：/g, '：')
    .trim();
}

function inferNutrientText(...values: Array<string | undefined>): string {
  const text = values.filter(Boolean).join(' ').toLowerCase();
  const nutrients: string[] = [];
  if (/iron|补铁|铁/.test(text)) nutrients.push('iron');
  if (/omega|抗炎脂肪|脂肪酸/.test(text)) nutrients.push('omega-3');
  if (/magnesium|镁/.test(text)) nutrients.push('magnesium');
  if (/protein|蛋白/.test(text)) nutrients.push('protein');
  if (/carb|碳水/.test(text)) nutrients.push('complex carbs');
  if (/hydration|水分|补水/.test(text)) nutrients.push('hydration');
  if (/fiber|纤维/.test(text)) nutrients.push('fiber');
  if (/calcium|钙/.test(text)) nutrients.push('calcium');
  if (/vitamin d|维生素 d/.test(text)) nutrients.push('vitamin d');
  return [...new Set(nutrients)].join(', ');
}

function nutrientLabel(name: string): string {
  return getFoodGroupsForNutrients(name)[0]?.labelZh || name;
}

function getNutrientRecommendations(
  suggestion: AISuggestion | undefined,
  fallbackRaw: string,
  phase: Phase,
): NutrientRecommendation[] {
  if (suggestion?.nutrients?.length) return suggestion.nutrients;
  return getFoodGroupsForNutrients(fallbackRaw).map(group => {
    if (group.nutrient === 'iron') {
      return {
        name: group.nutrient,
        amount: phase === 'RESET' ? '18-22' : '12-18',
        unit: 'mg',
        dailyTip: phase === 'RESET' ? '相当于一小份猪肝或蛤蜊，搭配深绿叶菜。' : '约一份牛肉或豆类，搭配维 C 更好吸收。',
      };
    }
    if (group.nutrient === 'omega-3') {
      return { name: group.nutrient, amount: '1.5-2', unit: 'g', dailyTip: '约一份三文鱼，或 20g 亚麻籽/奇亚籽。' };
    }
    if (group.nutrient === 'magnesium') {
      return { name: group.nutrient, amount: '300-320', unit: 'mg', dailyTip: '约 30g 南瓜籽 + 两小块黑巧。' };
    }
    if (group.nutrient === 'protein') {
      return { name: group.nutrient, amount: phase === 'RESET' ? '55-70' : '60-80', unit: 'g', dailyTip: '约一块鸡胸肉 + 一杯希腊酸奶。' };
    }
    if (group.nutrient === 'complex carbs') {
      return { name: group.nutrient, amount: '80-120', unit: 'g', dailyTip: '约一碗燕麦或一根中等红薯。' };
    }
    if (group.nutrient === 'hydration') {
      return { name: group.nutrient, amount: '1.8-2.2', unit: 'L', dailyTip: '分 4-6 次喝水，可加一份清汤或电解质。' };
    }
    return { name: group.nutrient, amount: '适量', unit: '', dailyTip: '优先从完整食物里补充，观察身体反馈。' };
  });
}

function PlanSummaryRow({ item, label, onClick }: { item: PlanItem; label: string; onClick: () => void }) {
  const meta = CATEGORY_META[item.category];
  const displayTitle = stripTimingText(item.title);
  return (
    <button
      onClick={onClick}
      className="min-h-[88px] w-full rounded-lg border border-[#2D2D2D]/8 bg-white/88 p-2.5 text-left shadow-none transition hover:bg-white hover:shadow-[0_8px_18px_rgba(45,45,45,0.05)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.12em] text-[#2D2D2D]/35 uppercase">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {item.source === 'option' ? 'OPTION' : 'USER'}
        </span>
        {item.completed && <Check className="h-3.5 w-3.5" style={{ color: meta.color }} />}
      </div>
      <p
        className={`mt-1.5 text-[13px] leading-snug font-medium text-[#2D2D2D]/82 ${item.completed ? 'line-through opacity-45' : ''}`}
        style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        title={displayTitle}
      >
        {displayTitle}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: meta.color, backgroundColor: `${meta.color}10` }}>
          {label}
        </span>
      </div>
    </button>
  );
}

function AISuggestionSummaryRow({
  suggestion,
  label,
  onClick,
  phaseColor,
}: {
  suggestion: AISuggestion;
  label: string;
  onClick: () => void;
  phaseColor: string;
}) {
  const meta = AI_TYPE_META[suggestion.suggestionType];
  const displayTitle = stripTimingText(suggestion.title);
  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={event => event.dataTransfer.setData('text/plain', suggestion.id)}
      className="relative min-h-[92px] w-full rounded-lg border border-[#2D2D2D]/8 bg-white/88 py-2.5 pl-3.5 pr-2.5 text-left shadow-none transition hover:bg-white hover:shadow-[0_8px_18px_rgba(45,45,45,0.05)]"
    >
      <span className="absolute bottom-2 left-1.5 top-2 w-0.5 rounded-full" style={{ backgroundColor: phaseColor }} />
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black tracking-[0.12em] uppercase" style={{ color: meta.color }}>
          ✦ <span className="truncate">AI · {meta.label}</span>
        </span>
      </div>
      <p
        className="mt-1.5 text-[13px] leading-snug font-medium text-[#2D2D2D]/82"
        style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        title={displayTitle}
      >
        {displayTitle}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: meta.color, backgroundColor: `${meta.color}10` }}>
          {label}
        </span>
        <GripVertical className="h-3.5 w-3.5 text-[#2D2D2D]/22 transition group-hover:text-[#2D2D2D]/45" />
      </div>
    </button>
  );
}

function PlanDetailDrawer({
  target,
  cycleLength,
  categoryLabels,
  zh,
  onClose,
  onEditItem,
  onToggleItem,
  onDeleteItem,
  onEditSuggestion,
  onAcceptSuggestion,
  onDeleteSuggestion,
}: {
  target: PlanDetailTarget;
  cycleLength: number;
  categoryLabels: Record<PlanCategory, string>;
  zh: boolean;
  onClose: () => void;
  onEditItem: (item: PlanItem) => void;
  onToggleItem: (item: PlanItem) => void;
  onDeleteItem: (item: PlanItem) => void;
  onEditSuggestion: (suggestion: AISuggestion) => void;
  onAcceptSuggestion: (suggestion: AISuggestion) => void;
  onDeleteSuggestion: (suggestion: AISuggestion) => void;
}) {
  const isItem = target.type === 'item';
  const title = stripTimingText(isItem ? target.item.title : target.suggestion.title);
  const day = target.day;
  const phase = PHASE_META[day.phase];
  const reason = isItem ? target.item.evidence?.rationale || target.item.note : target.suggestion.reason;
  const source = isItem ? target.item.evidence?.source : undefined;
  const meta = isItem ? CATEGORY_META[target.item.category] : AI_TYPE_META[target.suggestion.suggestionType];
  const nutritionRaw = isItem
    ? target.item.category === 'nutrition'
      ? inferNutrientText(target.item.title, target.item.note, target.item.evidence?.rationale)
      : ''
    : target.suggestion.suggestionType === 'nutrition'
      ? target.suggestion.nutritionType
        || target.suggestion.nutrients?.map(nutrient => nutrient.name).join(', ')
        || inferNutrientText(target.suggestion.title, target.suggestion.reason)
      : '';
  const nutrientGroups = nutritionRaw ? getFoodGroupsForNutrients(nutritionRaw) : [];
  const nutrientRecommendations = nutritionRaw
    ? getNutrientRecommendations(isItem ? undefined : target.suggestion, nutritionRaw, day.phase)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[86] bg-[#2D2D2D]/25 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        className="h-full w-full max-w-[440px] bg-[#F9F7F2] shadow-2xl flex flex-col"
        onClick={event => event.stopPropagation()}
      >
        <div className="border-b border-[#2D2D2D]/8 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: meta.color }}>
                {isItem ? categoryLabels[target.item.category] : `AI · ${AI_TYPE_META[target.suggestion.suggestionType].label}`}
              </p>
              <h2 className="mt-1 font-serif text-2xl leading-tight">{title}</h2>
            </div>
            <button onClick={onClose} className="calendar-icon-button" aria-label={zh ? '关闭' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <DetailPill label={zh ? '日期' : 'Date'} value={`${day.date.getMonth() + 1}/${day.date.getDate()} · D${day.cycleDay}/${cycleLength}`} />
            <DetailPill label={zh ? '阶段' : 'Phase'} value={day.phase6} color={phase.color} bg={phase.bg} />
          </div>

          {reason && (
            <section className="rounded-2xl border border-[#2D2D2D]/7 bg-white/72 p-4">
              <p className="text-xs font-black tracking-widest text-[#2D2D2D]/40 uppercase">
                {zh ? 'AI 理由 / 备注' : 'Reason / note'}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#2D2D2D]/62">{reason}</p>
            </section>
          )}

          {nutrientGroups.length > 0 && (
            <section className="rounded-2xl border border-[#D85A30]/10 bg-white/72 p-4">
              <p className="text-xs font-black tracking-widest text-[#D85A30] uppercase">{zh ? '营养素' : 'Nutrients'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nutrientGroups.map(group => (
                  <span key={group.nutrient} className="rounded-full bg-[#FAECE7] px-2.5 py-1 text-xs font-bold text-[#D85A30]">
                    {group.labelZh}
                  </span>
                ))}
              </div>
            </section>
          )}

          {nutrientGroups.length > 0 && (
            <section className="rounded-2xl border border-[#D85A30]/10 bg-white/72 p-4">
              <p className="text-xs font-black tracking-widest text-[#D85A30] uppercase">{zh ? '常见食物' : 'Common foods'}</p>
              <div className="mt-4 space-y-4">
                {nutrientGroups.map(group => (
                  <div key={group.nutrient}>
                    <p className="text-sm font-black text-[#2D2D2D]/70">{group.labelZh}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {group.foods.map(food => (
                        <div key={`${group.nutrient}-${food.name}`} className="rounded-xl bg-[#FAECE7]/60 px-3 py-2">
                          <p className="text-xs font-bold text-[#2D2D2D]/72">{food.name}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-[#D85A30]/70">{food.amountPer100g}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {nutrientRecommendations.length > 0 && (
            <section className="rounded-2xl border border-[#D85A30]/10 bg-white/72 p-4">
              <p className="text-xs font-black tracking-widest text-[#D85A30] uppercase">{zh ? '建议摄入量' : 'Suggested intake'}</p>
              <div className="mt-3 space-y-2">
                {nutrientRecommendations.map(recommendation => (
                  <div key={`${recommendation.name}-${recommendation.amount}`} className="rounded-xl bg-[#F9F7F2] px-3 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-black text-[#2D2D2D]/72">{nutrientLabel(recommendation.name)}</p>
                      <p className="whitespace-nowrap text-sm font-black text-[#D85A30]">
                        {recommendation.amount}{recommendation.unit}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#2D2D2D]/45">{recommendation.dailyTip}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {source && (
            <section className="rounded-2xl border border-[#2D2D2D]/7 bg-white/52 p-4">
              <p className="text-xs font-black tracking-widest text-[#2D2D2D]/40 uppercase">{zh ? '来源' : 'Source'}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#2D2D2D]/45">{source}</p>
            </section>
          )}

          {!isItem && (
            <p className="rounded-xl bg-white/55 px-3 py-2 text-xs font-bold text-[#2D2D2D]/40">
              {zh ? '提示：AI 建议可拖拽到其他日期。' : 'Tip: AI suggestions can be dragged to another date.'}
            </p>
          )}
        </div>

        <div className="border-t border-[#2D2D2D]/8 p-5 flex gap-2">
          {isItem ? (
            <>
              <button onClick={() => onDeleteItem(target.item)} className="h-11 w-11 rounded-xl border border-red-500/15 text-red-500 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => onToggleItem(target.item)} className="h-11 px-3 rounded-xl border border-[#2D2D2D]/10 bg-white text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {target.item.completed ? (zh ? '取消完成' : 'Undo') : (zh ? '采纳/完成' : 'Done')}
              </button>
              <button onClick={() => onEditItem(target.item)} className="flex-1 h-11 rounded-xl bg-[#2D2D2D] text-white text-sm font-bold">
                {zh ? '编辑' : 'Edit'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onDeleteSuggestion(target.suggestion)} className="h-11 w-11 rounded-xl border border-red-500/15 text-red-500 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => onEditSuggestion(target.suggestion)} className="h-11 px-4 rounded-xl border border-[#2D2D2D]/10 bg-white text-xs font-bold">
                {zh ? '编辑' : 'Edit'}
              </button>
              <button onClick={() => onAcceptSuggestion(target.suggestion)} className="flex-1 h-11 rounded-xl bg-[#085041] text-white text-sm font-bold">
                {zh ? '采纳' : 'Accept'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DayItemsDrawer({
  day,
  items,
  suggestions,
  cycleLength,
  categoryLabels,
  zh,
  onClose,
  onOpenItem,
  onOpenSuggestion,
  onAdd,
}: {
  day: DayData;
  items: PlanItem[];
  suggestions: AISuggestion[];
  cycleLength: number;
  categoryLabels: Record<PlanCategory, string>;
  zh: boolean;
  onClose: () => void;
  onOpenItem: (item: PlanItem) => void;
  onOpenSuggestion: (suggestion: AISuggestion) => void;
  onAdd: () => void;
}) {
  const phase = PHASE_META[day.phase];
  const entries = [
    ...items.map(item => ({ type: 'item' as const, item })),
    ...suggestions.map(suggestion => ({ type: 'suggestion' as const, suggestion })),
  ].sort((a, b) => {
    const aTime = a.type === 'item' ? a.item.time : a.suggestion.time;
    const bTime = b.type === 'item' ? b.item.time : b.suggestion.time;
    return aTime.localeCompare(bTime);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-[#2D2D2D]/25 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        className="h-full w-full max-w-[420px] bg-[#F9F7F2] shadow-2xl flex flex-col"
        onClick={event => event.stopPropagation()}
      >
        <div className="border-b border-[#2D2D2D]/8 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#2D2D2D]/42">
                {day.date.getMonth() + 1}/{day.date.getDate()} · D{day.cycleDay}/{cycleLength}
              </p>
              <h2 className="mt-1 font-serif text-2xl">{zh ? '当天全部事项' : 'All items'}</h2>
              <span className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: phase.color, backgroundColor: phase.bg }}>
                {day.phase6}
              </span>
            </div>
            <button onClick={onClose} className="calendar-icon-button" aria-label={zh ? '关闭' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-2">
          {entries.map(entry => (
            entry.type === 'item' ? (
              <div key={entry.item.id}>
                <PlanSummaryRow
                  item={entry.item}
                  label={categoryLabels[entry.item.category]}
                  onClick={() => onOpenItem(entry.item)}
                />
              </div>
            ) : (
              <div key={entry.suggestion.id}>
                <AISuggestionSummaryRow
                  suggestion={entry.suggestion}
                  label={categoryLabels[suggestionTypeToCategory(entry.suggestion.suggestionType)]}
                  onClick={() => onOpenSuggestion(entry.suggestion)}
                  phaseColor={phase.color}
                />
              </div>
            )
          ))}
          {entries.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[#2D2D2D]/12 bg-white/45 py-8 text-center text-sm text-[#2D2D2D]/35">
              {zh ? '这一天还没有计划' : 'Nothing planned yet'}
            </p>
          )}
        </div>

        <div className="border-t border-[#2D2D2D]/8 p-5">
          <button onClick={onAdd} className="h-11 w-full rounded-xl bg-[#2D2D2D] text-white text-sm font-bold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            {zh ? '添加事项' : 'Add item'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailPill({ label, value, color, bg }: { label: string; value: string; color?: string; bg?: string }) {
  return (
    <div className="rounded-2xl border border-[#2D2D2D]/7 bg-white/72 p-3">
      <p className="text-[10px] font-black tracking-widest text-[#2D2D2D]/32 uppercase">{label}</p>
      <p
        className={`mt-1 text-sm font-bold text-[#2D2D2D]/72 ${bg ? 'inline-flex rounded-full px-2 py-0.5' : ''}`}
        style={{ color, backgroundColor: bg }}
      >
        {value}
      </p>
    </div>
  );
}
