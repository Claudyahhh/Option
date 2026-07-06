import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { setLang, useLang } from '../lib/i18n';
import landingVideo from '../assets/landing-hero-6月新版.mp4';
import optionLogo from '../assets/option-logo-mark.svg';

const CTA_REVEAL_TIME = 5.2;
const LEAD_TEXT_REVEAL_TIME = CTA_REVEAL_TIME - 1;

export function Landing({ onStart }: { onStart: () => void }) {
  const [lang] = useLang();
  const [showCta, setShowCta] = useState(false);
  const [showLeadText, setShowLeadText] = useState(false);
  const isZh = lang === 'zh';
  const artFont = '"Songti SC", "STSong", "Noto Serif CJK SC", "Playfair Display", serif';
  const copy = isZh ? {
    title: ['激素周期', '是你的杠杆'],
    subtitle: [
      '你的周期，每天都有不同的优势窗口——精力、训练、皮肤、情绪。',
      'Option 帮你读懂它，用好它。',
    ],
    cta: '查看今日日报',
  } : {
    title: ['Your hormone cycle', 'is your leverage'],
    subtitle: [
      'Every day of your cycle opens a different advantage window — energy, training, skin, mood.',
      'Option helps you read it, and use it well.',
    ],
    cta: "View today's report",
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#8fb4c9]">
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3 rounded-[28px] border border-white/42 bg-[linear-gradient(120deg,rgba(255,255,255,0.24),rgba(220,239,247,0.14)_48%,rgba(246,184,197,0.18))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_8px_22px_rgba(68,103,126,0.10)] backdrop-blur-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/52 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <img src={optionLogo} alt="Option logo" className="h-9 w-9" />
          </div>
          <span className="pr-3 text-3xl font-semibold text-[#243746]/92" style={{ fontFamily: '"Playfair Display", "Songti SC", serif' }}>
            Option
          </span>
        </div>

        <div
          className="flex h-11 items-center rounded-[24px] border border-white/46 bg-[linear-gradient(120deg,rgba(255,255,255,0.22),rgba(220,239,247,0.13)_48%,rgba(246,184,197,0.17))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_8px_22px_rgba(68,103,126,0.10)] backdrop-blur-2xl"
          role="group"
          aria-label="Language"
        >
          <button
            type="button"
            aria-pressed={isZh}
            onClick={() => setLang('zh')}
            className={`h-9 rounded-[19px] px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isZh ? 'bg-white/42 text-[#243746] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]' : 'text-[#30485A]/58 hover:text-[#30485A]'
            }`}
            style={{ fontFamily: '"Playfair Display", "Songti SC", serif' }}
          >
            中文
          </button>
          <button
            type="button"
            aria-pressed={!isZh}
            onClick={() => setLang('en')}
            className={`h-9 rounded-[19px] px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              !isZh ? 'bg-white/42 text-[#243746] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]' : 'text-[#30485A]/58 hover:text-[#30485A]'
            }`}
            style={{ fontFamily: '"Playfair Display", "Songti SC", serif' }}
          >
            EN
          </button>
        </div>
      </header>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 'max(100vw, calc(100vh * 1932 / 1072))',
          height: 'max(100vh, calc(100vw * 1072 / 1932))',
        }}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          src={landingVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onTimeUpdate={(event) => {
            const { currentTime } = event.currentTarget;
            setShowLeadText(currentTime >= LEAD_TEXT_REVEAL_TIME);
            setShowCta(currentTime >= CTA_REVEAL_TIME);
          }}
          onEnded={() => {
            setShowLeadText(true);
            setShowCta(true);
          }}
        />

        <div
          className={`absolute z-30 left-1/2 top-[43%] w-[min(78vw,720px)] -translate-x-1/2 -translate-y-1/2 text-left text-[#172F42] transition-opacity duration-700 ease-out ${
            showLeadText ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h1
            className={`${isZh ? 'text-[clamp(3.1rem,7.4vw,6.8rem)]' : 'text-[clamp(2.8rem,5.4vw,5.25rem)]'} font-black leading-[0.92]`}
            style={{ fontFamily: artFont }}
          >
            <span className="block">{copy.title[0]}</span>
            <span className="block">{copy.title[1]}</span>
          </h1>
          <p className="mt-5 border-l border-[#7EA9BD]/55 pl-5 text-[clamp(1rem,1.45vw,1.35rem)] font-semibold leading-relaxed tracking-[0.02em] text-[#30485A]/88" style={{ fontFamily: artFont }}>
            <span className="block">{copy.subtitle[0]}</span>
            <span className="block">{copy.subtitle[1]}</span>
          </p>
        </div>

        <button
          type="button"
          aria-label={copy.cta}
          title={copy.cta}
          onClick={onStart}
          className={`absolute z-30 left-1/2 top-[72%] flex h-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-3 rounded-full bg-[#172F42] px-9 text-lg font-black tracking-[0.03em] text-[#FFF7FB] shadow-[0_12px_24px_rgba(23,47,66,0.24)] whitespace-nowrap transition-all duration-700 ease-out hover:bg-[#243746] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
            showCta ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ fontFamily: artFont }}
        >
          {copy.cta}
          <ArrowRight className="h-5 w-5 stroke-[2.6]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
