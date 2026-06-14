import { useState, useEffect } from 'react';

export type Lang = 'en' | 'zh';

const LANG_KEY = 'option_lang';

// ── Singleton lang state ────────────────────────────────────────────────────
let _lang: Lang = (localStorage.getItem(LANG_KEY) as Lang) ?? 'en';
const _listeners = new Set<() => void>();

function notifyLang() { _listeners.forEach(fn => fn()); }

export function getLang(): Lang { return _lang; }
export function setLang(lang: Lang) {
  _lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  notifyLang();
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick(t => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return [_lang, setLang];
}

// ── Translations ────────────────────────────────────────────────────────────
export const T = {
  en: {
    // Common
    days: 'd',
    hours: 'hours',
    save: 'Save',
    back: 'Back',
    continue: 'Continue',

    // Navigation
    nav: {
      today:   'Today',
      plan:    'Plan',
      learn:   'Learn',
      profile: 'Profile',
    },

    // Phase names (keep as brand identifiers, add sub-label)
    phases: {
      RISE:  { label: 'RISE',  sublabel: 'Rebuilding' },
      PEAK:  { label: 'PEAK',  sublabel: 'Deploy' },
      FOCUS: { label: 'FOCUS', sublabel: 'Depth' },
      RESET: { label: 'RESET', sublabel: 'Clarity' },
    },

    // Sidebar
    sidebar: {
      currentPhase: 'Current Phase',
      todayEdge:    "Today's Edge",
      dayLabel:     'Day',
      hormones:     'Hormones are your leverage.',
    },

    // Phase tips
    phaseTips: {
      'RISE early':  '"Energy rebuilding. Warm up — save the main event."',
      'RISE mid':    '"Acquisition mode active. Your brain is hungry — feed it."',
      'RISE late':   '"Approaching PEAK. Finalise and prepare. You deliver this week."',
      'PEAK early':  '"Power window opening. Schedule high-stakes work now."',
      'PEAK mid':    '"Highest-leverage 24h. Deploy your biggest move."',
      'PEAK late':   '"Last PEAK window. Finish it. Tomorrow: depth mode."',
      'FOCUS early': '"Depth mode. Schedule deep work blocks."',
      'FOCUS mid':   '"Attention stamina at peak. Tackle your longest task."',
      'FOCUS late':  '"Focus holds. Protect your schedule. Fuel the engine."',
      'RESET early': '"Your BS detector is at max. Audit and cut."',
      'RESET mid':   '"Strategic solitude. Clearest thinking in quiet."',
      'RESET late':  '"Rebuild phase. Energy returning. Plan the RISE ahead."',
    } as Record<string, string>,

    // Landing
    landing: {
      tagline:  'Hormones are your leverage.',
      sub:      'Your cycle gives you a different edge every day — in energy, training, skin, and mood. Option reads it so you can use it.',
      cta:      'Get my daily edge',
      copyright: 'Option',
      phaseSubs: {
        RISE:  'Learning speed',
        PEAK:  'Persuasion',
        FOCUS: 'Deep focus',
        RESET: 'Sharp intuition',
      },
    },

    // Onboarding
    onboarding: {
      step:  'STEP',
      of:    'OF',
      stepTitles:   ['Your cycle data', 'Your profile', 'Diet & preferences'],
      stepSubtitles: [
        'Three data points generate your first report. Accuracy sharpens with every cycle you log.',
        'Used to calibrate training load and sharpen the focus of your daily report.',
        'Nutrition recommendations will adjust to your dietary needs.',
      ],
      fields: {
        city:         'City / Region',
        cityPlaceholder: 'e.g. Shanghai',
        periodDate:   'Last Period Start',
        cycleLength:  'Cycle Length',
        age:          'Age',
        lastSleep:    'Last Sleep',
        days:         'days',
      },
      fitness: {
        label: 'Fitness Level',
        options: [
          { value: 'never',     label: 'Rarely',    sub: 'Minimal exercise' },
          { value: 'sometimes', label: 'Sometimes', sub: '1–2× per week' },
          { value: 'regularly', label: 'Regularly', sub: '3–5× per week' },
          { value: 'athlete',   label: 'Athlete',   sub: 'Daily training' },
        ],
      },
      objective: {
        label: 'Primary Objective',
        options: [
          { value: 'career', label: 'Career',   sub: 'Work & productivity' },
          { value: 'body',   label: 'Body',     sub: 'Training & nutrition' },
          { value: 'skin',   label: 'Skin',     sub: 'Skincare strategy' },
          { value: 'mood',   label: 'Mood',     sub: 'Emotional clarity' },
          { value: 'all',    label: 'All four', sub: 'Balanced across pillars', wide: true },
        ],
      },
      diet: {
        label: 'Dietary Preference',
        options: [
          { value: 'none',       label: 'No restriction', sub: 'Everything' },
          { value: 'vegetarian', label: 'Vegetarian',     sub: 'No meat' },
          { value: 'vegan',      label: 'Vegan',          sub: 'Plant-based only' },
          { value: 'other',      label: 'Other',          sub: 'Custom needs' },
        ],
      },
      errors: {
        noCity:            'Please enter your city so Option can load local weather.',
        noPeriodDate:      'Please select your last period start date.',
        invalidCycleLength:'Cycle length must be between 21–45 days.',
        invalidAge:        'Please enter a valid age.',
        noFitness:         'Please select your fitness level.',
        noObjective:       'Please select your primary objective.',
        noDiet:            'Please select your dietary preference.',
      },
      finishCta: 'See my first report',
    },

    // Dashboard
    dashboard: {
      option: 'Option',
      day:    'Day',
      sleepGate: {
        sectionLabel: 'Morning Check-in',
        question:     'How long did you sleep?',
        sub:          'Sleep interacts with your hormonal state to calibrate all four pillars.',
        hours:        'hours',
        cta:          "Generate today's report",
      },
      hormones:       'Hormone Curve',
      todayEdge:      "Today's Edge",
      todayContext:   "Today's Context",
      subPhase:       'Sub-phase',
      dayInPhase:     'in this phase',
      stats: {
        sleep:      'Sleep',
        low:        '(Low)',
        high:       '(High)',
        cycleDay:   'Cycle Day',
        ageBracket: 'Age Bracket',
        nextPhase:  'Next Phase',
        in:         'in',
      },
      debrief: {
        label:      "Yesterday's Review",
        wasPhase:   'Yesterday was',
        question:   'How accurate was the report?',
        accurate:   '👍 Spot on',
        offToday:   '👎 Not quite',
        loggedGood: 'Got it. Your feedback sharpens the next cycle.',
        loggedBad:  'Noted. The model will recalibrate.',
      },
      share: {
        label:        'Share',
        modalTitle:   'Share your phase',
        forYou:       'For you this week',
        partnerNote:  'Schedule note',
        energy:       'Energy',
        cycleDay:     'Cycle Day',
        nextPhase:    'Next phase',
        poweredBy:    'Powered by Option',
        saveImage:    'Save image',
        copyText:     'Copy text',
        copied:       'Copied!',
        close:        'Close',
        phases: {
          RISE: {
            headline:    "I'm in RISE phase this week",
            tagline:     "Learning mode active. I'm at my most open.",
            forYou:      [
              "📚 Best week to explore new ideas or places together",
              "✨ I'll say yes more than usual — good time to propose plans",
              "🧩 Brainstorming sessions will land especially well",
            ],
            partnerNote: "Schedule creative sessions and ideation with me.",
          },
          PEAK: {
            headline:    "I'm at PEAK — my highest-output window",
            tagline:     "48h of maximum charisma and decisiveness.",
            forYou:      [
              "🎯 Highest-leverage window of my month — schedule the important things",
              "💬 I'm at my most persuasive. Have that conversation now.",
              "⚡ Bring me decisions, pitches, or bold moves to back",
            ],
            partnerNote: "Front-load high-stakes meetings and decisions.",
          },
          FOCUS: {
            headline:    "I'm in FOCUS this week",
            tagline:     "Deep work mode. Precision high, noise low.",
            forYou:      [
              "📱 Text > calls this week. I'm in the zone.",
              "📋 Give me detail work — I'll catch what others miss",
              "🤫 1-on-1 depth over group energy right now",
            ],
            partnerNote: "Book me for analysis, reviews, or precision tasks.",
          },
          RESET: {
            headline:    "I'm in RESET this week",
            tagline:     "Strategic clarity. Sharp intuition, low noise.",
            forYou:      [
              "🌿 Low-key time together > high-energy plans",
              "💭 My BS detector is maxed — great week for honest check-ins",
              "🔮 Ask for my read on things. Intuition is sharp right now.",
            ],
            partnerNote: "Good week for strategy, reflection, or big-picture calls.",
          },
        } as Record<string, { headline: string; tagline: string; forYou: string[]; partnerNote: string }>,
      },
      pillars: {
        energy: 'Energy',
        body:   'Body',
        skin:   'Skin',
        mood:   'Mood',
      },
      whyShow: 'Why? →',
      whyHide: 'Hide science ↑',
      estrogen:     'Estrogen',
      progesterone: 'Progesterone',
      testosterone: 'Testosterone',
    },

    // Plan
    plan: {
      title:      'Turn hormones into a plan.',
      weekdays:   ['MON','TUE','WED','THU','FRI','SAT','SUN'],
      months:     ['January','February','March','April','May','June','July','August','September','October','November','December'],
      phases:     ['RISE','PEAK','FOCUS','RESET'],
      dayDetail: {
        phase:      'Phase',
        cycleDay:   'Cycle Day',
        bestFor:    'Best for',
        standDown:  'Stand down',
        bestForMap: {
          PEAK:  'Negotiation, pitches',
          RISE:  'Learning, creativity',
          FOCUS: 'Deep work, analysis',
          RESET: 'Strategy, reflection',
        },
        standDownMap: {
          PEAK:  'Over-treating skin',
          RISE:  'Isolation',
          FOCUS: 'High-stakes social',
          RESET: 'New commitments',
        },
      },
      smartMatch: {
        title:       'Smart Match',
        description: 'Paste your to-do list (one task per line) and Option will match each task to your optimal hormonal window this month.',
        placeholder: 'Write business plan\nGym session\nClient pitch\nCode review',
        cta:         'Optimise My Week',
        matching:    'Matching…',
      },
      weekSchedule: {
        title:       'Schedule This Week',
        description: 'Enter tasks for the week (one per line). Option assigns each to the optimal day based on your hormone levels.',
        placeholder: 'Write proposal\nClient call\nGym session\nCode review\nTeam meeting',
        cta:         'Schedule My Week',
        scheduling:  'Scheduling…',
        today:       'TODAY',
        weekOf:      'Week of',
      },
    },

    // Learn
    learn: {
      title:       'Hormone Library',
      subtitle:    '"Trace each hormone\'s journey. All content is research-backed and cited inline."',
      youAreHere:  'You are here:',
      searchPlaceholder: 'Search hormones…',
      research:    'Research',
      phaseRef:    'Phase Reference',
      newsletter: {
        title:  'Stay informed. Stay ahead.',
        sub:    'New peer-reviewed research published every Friday. Subscribe to the Option Journal.',
        placeholder: 'your@email.com',
        cta:    'Subscribe',
      },
      phaseTableRows: {
        energy: 'Energy',
        body:   'Body',
        skin:   'Skin',
        mood:   'Mood',
      },
      hormones: {
        Estrogen:     'Estrogen',
        Progesterone: 'Progesterone',
        Testosterone: 'Testosterone',
        'LH & FSH':  'LH & FSH',
      },
    },

    // Profile
    profile: {
      title:       'My Profile',
      subtitle:    'Your data. Your cycle. Your baseline.',
      periodToday: 'Period started today',
      cycleUpdated:'Cycle updated',
      editProfile: 'Edit profile',
      resetAll:    'Reset all data',
      resetConfirm:'Reset all data and start over?',
      periodConfirm:'Log today as the first day of your period? This will update your cycle baseline.',
      cards: {
        cycleData:        'Cycle Data',
        goalsPrefs:       'Goals & Preferences',
        cycleIntelligence:'Cycle Intelligence',
        ageBracket:       'Age Bracket Modifiers',
      },
      rows: {
        city:           'City',
        age:            'Age',
        lastPeriod:     'Last Period',
        cycleLength:    'Cycle Length',
        objective:      'Primary Objective',
        fitness:        'Fitness Level',
        diet:           'Diet',
        logsRecorded:   'Logs recorded',
        debriefCount:   'Debrief responses',
        calibration:    'Calibration status',
        calibActive:    'Active',
        calibPending:   (n: number) => `${n}/3 logs to activate`,
        training:       'Training',
        skin:           'Skin',
        nutrition:      'Nutrition',
        days:           (n: number) => `${n} day${n !== 1 ? 's' : ''}`,
        daysCycle:      (n: number) => `${n} days`,
        ageBracketLabel:(b: string) => `${b}`,
      },
      fitness: {
        never:     'Rarely active',
        sometimes: 'Sometimes (1–2×/wk)',
        regularly: 'Regularly (3–5×/wk)',
        athlete:   'Athlete (daily)',
      },
      objective: {
        career: 'Career', body: 'Body', skin: 'Skin', mood: 'Mood', all: 'All four pillars',
      },
      diet: {
        none: 'No restriction', vegetarian: 'Vegetarian', vegan: 'Vegan', other: 'Other',
      },
      ageBrackets: {
        '22–26': {
          training:  'Highest intensity recommended',
          skin:      'Aggressive actives tolerated',
          nutrition: 'Most carb-timing responsive',
        },
        '27–31': {
          training:  'High intensity + recovery guidance',
          skin:      'Preventive anti-aging in RISE',
          nutrition: 'Calcium + vitamin D emphasis',
        },
        '32–38': {
          training:  'Longer warm-ups, recovery priority',
          skin:      'Barrier support, retinol moderated',
          nutrition: 'Collagen, omega-3, anti-inflammatory',
        },
      } as Record<string, { training: string; skin: string; nutrition: string }>,
      editFitnessOptions: [
        { value: 'never',     label: 'Rarely' },
        { value: 'sometimes', label: 'Sometimes' },
        { value: 'regularly', label: 'Regularly' },
        { value: 'athlete',   label: 'Athlete' },
      ],
      editObjectiveOptions: [
        { value: 'career', label: 'Career' },
        { value: 'body',   label: 'Body' },
        { value: 'skin',   label: 'Skin' },
        { value: 'mood',   label: 'Mood' },
        { value: 'all',    label: 'All four' },
      ],
    },
  },

  // ── Chinese ──────────────────────────────────────────────────────────────
  zh: {
    days: '天',
    hours: '小时',
    save: '保存',
    back: '返回',
    continue: '继续',

    nav: {
      today:   '今日',
      plan:    '计划',
      learn:   '学习',
      profile: '我的',
    },

    phases: {
      RISE:  { label: 'RISE',  sublabel: '上升期' },
      PEAK:  { label: 'PEAK',  sublabel: '排卵期' },
      FOCUS: { label: 'FOCUS', sublabel: '黄体期' },
      RESET: { label: 'RESET', sublabel: '月经期' },
    },

    sidebar: {
      currentPhase: '当前阶段',
      todayEdge:    '今日优势',
      dayLabel:     '第',
      hormones:     '激素，是你的杠杆。',
    },

    phaseTips: {
      'RISE early':  '"能量慢慢回来了，先热身——重头戏别急着上。"',
      'RISE mid':    '"大脑进入吸收模式，越学越快——抓紧输入。"',
      'RISE late':   '"巅峰将至，收尾、准备——这周你会是最佳状态。"',
      'PEAK early':  '"黄金窗口开启，高风险任务现在上。"',
      'PEAK mid':    '"全月最高价值的24小时，倾尽全力出击。"',
      'PEAK late':   '"最后的巅峰时段，收尾。明天切入深度模式。"',
      'FOCUS early': '"深度工作模式启动，提前排好专注时间块。"',
      'FOCUS mid':   '"专注耐力见顶，干掉你最长的那个任务。"',
      'FOCUS late':  '"专注仍在线，守住日程，好好吃饭补充能量。"',
      'RESET early': '"直觉雷达全开——该砍的砍，该留的留。"',
      'RESET mid':   '"需要安静。越安静，想得越清楚。"',
      'RESET late':  '"能量慢慢归来，趁清醒规划下一个崛起期。"',
    } as Record<string, string>,

    landing: {
      tagline:  '激素，是你的杠杆。',
      sub:      '你的周期，每天都有不同的优势窗口——精力、训练、皮肤、情绪。Option 帮你读懂它，用好它。',
      cta:      '查看今日报告',
      copyright: 'Option',
      phaseSubs: {
        RISE:  '学习加速',
        PEAK:  '说服力最强',
        FOCUS: '深度专注',
        RESET: '直觉清晰',
      },
    },

    onboarding: {
      step:  '第',
      of:    '步，共',
      stepTitles:    ['周期数据', '个人档案', '饮食偏好'],
      stepSubtitles: [
        '三项数据，生成你的专属首报。记录的周期越多，建议越准。',
        '用于校准训练负荷，让每日报告更贴合你的身体状态。',
        '营养建议将根据你的饮食习惯做个性化调整。',
      ],
      fields: {
        city:            '所在城市',
        cityPlaceholder: '例如：上海',
        periodDate:      '上次月经开始日期',
        cycleLength:     '周期长度',
        age:             '年龄',
        lastSleep:       '昨晚睡眠',
        days:            '天',
      },
      fitness: {
        label: '运动频率',
        options: [
          { value: 'never',     label: '很少运动', sub: '几乎不运动' },
          { value: 'sometimes', label: '偶尔运动', sub: '每周 1–2 次' },
          { value: 'regularly', label: '规律运动', sub: '每周 3–5 次' },
          { value: 'athlete',   label: '专业运动员', sub: '每日训练' },
        ],
      },
      objective: {
        label: '首要目标',
        options: [
          { value: 'career', label: '职场',     sub: '工作与生产力' },
          { value: 'body',   label: '身体',     sub: '训练与营养' },
          { value: 'skin',   label: '皮肤',     sub: '护肤策略' },
          { value: 'mood',   label: '情绪',     sub: '情绪清晰度' },
          { value: 'all',    label: '全部四项', sub: '均衡覆盖所有维度', wide: true },
        ],
      },
      diet: {
        label: '饮食偏好',
        options: [
          { value: 'none',       label: '无限制',   sub: '什么都吃' },
          { value: 'vegetarian', label: '素食',     sub: '不吃肉' },
          { value: 'vegan',      label: '纯素',     sub: '纯植物饮食' },
          { value: 'other',      label: '其他',     sub: '定制需求' },
        ],
      },
      errors: {
        noCity:            '请输入所在城市，以便 Option 获取当地天气。',
        noPeriodDate:      '请选择你上次月经的开始日期。',
        invalidCycleLength:'周期长度必须在 21–45 天之间。',
        invalidAge:        '请输入有效的年龄。',
        noFitness:         '请选择你的运动频率。',
        noObjective:       '请选择你的首要目标。',
        noDiet:            '请选择你的饮食偏好。',
      },
      finishCta: '查看我的第一份报告',
    },

    dashboard: {
      option: 'Option',
      day:    '第',
      sleepGate: {
        sectionLabel: '晨间记录',
        question:     '昨晚睡了多久？',
        sub:          '睡眠时长直接影响激素水平，决定今日四项建议的准确度。',
        hours:        '小时',
        cta:          '查看今日报告',
      },
      hormones:       '激素曲线',
      todayEdge:      '今日优势',
      todayContext:   '今日背景',
      subPhase:       '子阶段',
      dayInPhase:     '在此阶段的第',
      stats: {
        sleep:      '睡眠',
        low:        '（偏少）',
        high:       '（偏多）',
        cycleDay:   '周期天',
        ageBracket: '年龄段',
        nextPhase:  '下一阶段',
        in:         '还有',
      },
      debrief: {
        label:      '昨日复盘',
        wasPhase:   '昨天处于',
        question:   '昨天的报告准确吗？',
        accurate:   '👍 很准确',
        offToday:   '👎 不太对',
        loggedGood: '已记录。你的反馈将优化下一个周期的预测。',
        loggedBad:  '已记录。模型将重新校准。',
      },
      share: {
        label:       '分享',
        modalTitle:  '分享你的阶段状态',
        forYou:      '对你来说，这周',
        partnerNote: '给你的建议',
        energy:      '今日能量',
        cycleDay:    '周期天',
        nextPhase:   '下一阶段',
        poweredBy:   'Powered by Option',
        saveImage:   '保存图片',
        copyText:    '复制文字',
        copied:      '已复制！',
        close:       '关闭',
        phases: {
          RISE: {
            headline:    '这周我在 RISE 上升期',
            tagline:     '思维开放，越学越快，适合探索新事物。',
            forYou:      [
              '📚 适合一起探索新想法或新地方',
              '✨ 我比平时更愿意说"好啊"——大胆提计划',
              '🧩 头脑风暴和创意讨论这周格外顺',
            ],
            partnerNote: '这周排创意会议和探索性合作最好。',
          },
          PEAK: {
            headline:    '这周我在 PEAK 排卵期',
            tagline:     '全月能量最高，说服力和决断力见顶。',
            forYou:      [
              '🎯 本月最高价值时段，重要事项现在排',
              '💬 说服力最强，重要对话这周谈',
              '⚡ 要拍板、提案、大胆行动——找我',
            ],
            partnerNote: '高风险会议和重要决策，就排这周。',
          },
          FOCUS: {
            headline:    '这周我在 FOCUS 黄体期',
            tagline:     '深度工作模式，细节力强，社交欲低。',
            forYou:      [
              '📱 发消息好过打电话，我在专注状态里',
              '📋 细节任务交我，这周我最挑得出问题',
              '🤫 一对一聊好过群体聚会，这周我更喜欢深度',
            ],
            partnerNote: '分析、复审、需要精准度的工作，这周找我。',
          },
          RESET: {
            headline:    '这周我在 RESET 月经期',
            tagline:     '直觉最锐利，需要安静，适合复盘。',
            forYou:      [
              '🌿 低调相处好过高能量社交，我需要安静',
              '💭 直觉雷达最灵，这周适合来一次坦诚对话',
              '🔮 要我判断什么？这周是找我的好时候',
            ],
            partnerNote: '战略规划、大局复盘、长期决策，这周最适合。',
          },
        } as Record<string, { headline: string; tagline: string; forYou: string[]; partnerNote: string }>,
      },
      pillars: {
        energy: '精力',
        body:   '身体',
        skin:   '皮肤',
        mood:   '情绪',
      },
      whyShow: '为什么？→',
      whyHide: '收起科学依据 ↑',
      estrogen:     '雌激素',
      progesterone: '孕激素',
      testosterone: '睾酮',
    },

    plan: {
      title:      '把激素变成计划。',
      weekdays:   ['周一','周二','周三','周四','周五','周六','周日'],
      months:     ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
      phases:     ['RISE','PEAK','FOCUS','RESET'],
      dayDetail: {
        phase:      '阶段',
        cycleDay:   '周期天',
        bestFor:    '最适合',
        standDown:  '避免',
        bestForMap: {
          PEAK:  '谈判、演讲',
          RISE:  '学习、创意',
          FOCUS: '深度工作、分析',
          RESET: '战略、复盘',
        },
        standDownMap: {
          PEAK:  '过度护肤操作',
          RISE:  '自我隔离',
          FOCUS: '高风险社交',
          RESET: '接受新承诺',
        },
      },
      smartMatch: {
        title:       '智能匹配',
        description: '将你的待办事项粘贴进来（每行一条），Option 将把每项任务匹配到本月最佳的激素窗口。',
        placeholder: '写商业计划\n健身课\n客户提案\n代码审查',
        cta:         '优化我的本周计划',
        matching:    '匹配中…',
      },
      weekSchedule: {
        title:       '安排本周计划',
        description: '输入本周事项（每行一条），Option 将根据你的激素状态，把每项事务安排到最佳的那一天。',
        placeholder: '写提案\n客户沟通\n健身\n代码复审\n团队会议',
        cta:         '安排本周',
        scheduling:  '安排中…',
        today:       '今天',
        weekOf:      '本周',
      },
    },

    learn: {
      title:       '激素图书馆',
      subtitle:    '"追踪每种激素的变化轨迹。所有内容均有科学文献支撑。"',
      youAreHere:  '你在这里：',
      searchPlaceholder: '搜索激素…',
      research:    '研究文献',
      phaseRef:    '阶段参考',
      newsletter: {
        title:       '保持信息更新，保持领先。',
        sub:         '每周五发布最新同行评审研究。订阅 Option 期刊。',
        placeholder: 'your@email.com',
        cta:         '订阅',
      },
      phaseTableRows: {
        energy: '精力',
        body:   '身体',
        skin:   '皮肤',
        mood:   '情绪',
      },
      hormones: {
        Estrogen:     '雌激素',
        Progesterone: '孕激素',
        Testosterone: '睾酮',
        'LH & FSH':  '黄体生成素 & 卵泡刺激素',
      },
    },

    profile: {
      title:       '我的档案',
      subtitle:    '你的数据。你的周期。你的基准线。',
      periodToday: '今天月经来了',
      cycleUpdated:'周期已更新',
      editProfile: '编辑档案',
      resetAll:    '清除所有数据',
      resetConfirm:'清除所有数据并重新开始？',
      periodConfirm:'将今天标记为月经第一天？这将更新你的周期基准线。',
      cards: {
        cycleData:        '周期数据',
        goalsPrefs:       '目标与偏好',
        cycleIntelligence:'周期智能',
        ageBracket:       '年龄段调整',
      },
      rows: {
        city:           '城市',
        age:            '年龄',
        lastPeriod:     '上次月经',
        cycleLength:    '周期长度',
        objective:      '首要目标',
        fitness:        '运动频率',
        diet:           '饮食偏好',
        logsRecorded:   '记录天数',
        debriefCount:   '晚间复盘次数',
        calibration:    '校准状态',
        calibActive:    '已激活',
        calibPending:   (n: number) => `${n}/3 条记录后激活`,
        training:       '训练',
        skin:           '皮肤',
        nutrition:      '营养',
        days:           (n: number) => `${n} 天`,
        daysCycle:      (n: number) => `${n} 天`,
        ageBracketLabel:(b: string) => b,
      },
      fitness: {
        never:     '很少运动',
        sometimes: '偶尔（每周 1–2 次）',
        regularly: '规律（每周 3–5 次）',
        athlete:   '专业运动员（每日）',
      },
      objective: {
        career: '职场', body: '身体', skin: '皮肤', mood: '情绪', all: '全部四项支柱',
      },
      diet: {
        none: '无限制', vegetarian: '素食', vegan: '纯素', other: '其他',
      },
      ageBrackets: {
        '22–26': {
          training:  '推荐最高强度训练',
          skin:      '可耐受强效活性成分',
          nutrition: '对碳水时机安排最敏感',
        },
        '27–31': {
          training:  '高强度 + 恢复指导',
          skin:      'RISE 期开始预防性抗老',
          nutrition: '钙质 + 维生素 D 优先',
        },
        '32–38': {
          training:  '延长热身，恢复优先',
          skin:      '屏障修护，视黄醇适度使用',
          nutrition: '胶原蛋白、Omega-3、抗炎饮食',
        },
      } as Record<string, { training: string; skin: string; nutrition: string }>,
      editFitnessOptions: [
        { value: 'never',     label: '很少' },
        { value: 'sometimes', label: '偶尔' },
        { value: 'regularly', label: '规律' },
        { value: 'athlete',   label: '运动员' },
      ],
      editObjectiveOptions: [
        { value: 'career', label: '职场' },
        { value: 'body',   label: '身体' },
        { value: 'skin',   label: '皮肤' },
        { value: 'mood',   label: '情绪' },
        { value: 'all',    label: '全部' },
      ],
    },
  },
} as const;

export type Translations = typeof T.en;

/** Returns the translation object for the current language. */
export function useT(): Translations {
  const [lang] = useLang();
  // TypeScript: both branches have the same shape
  return (lang === 'zh' ? T.zh : T.en) as unknown as Translations;
}
