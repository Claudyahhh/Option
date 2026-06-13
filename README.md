# Option — Hormonal Leverage for High-Performance Women

> Your cycle is not a liability. It is a precision instrument.

Most period trackers treat women as victims of their hormones — built around managing discomfort. **Option operates on a different premise: you are the operator of your own biology.**

Option maps your hormonal cycle to a daily strategic briefing, so you deploy the right effort at the highest-leverage moment — and stop working against your own physiology.

---

## What It Does

Option models your hormone curve (estrogen, progesterone, testosterone) from two inputs — your last period date and average cycle length — and generates a daily briefing across four performance pillars:

- **Energy & Work** — cognitive bandwidth, persuasion windows, deep focus periods
- **Training** — when to push for PRs, when to prioritize recovery
- **Skin** — offensive vs. defensive skincare phases
- **Mood & Strategy** — when to negotiate, when to plan, when to rest

The four cycle phases each carry a distinct operational profile:

| Phase | Window | Edge |
|---|---|---|
| **RISE** | Follicular | Absorption, learning, new inputs |
| **PEAK** | Ovulation | Persuasion, confidence, max output |
| **FOCUS** | Early luteal | Deep work, precision, sustained attention |
| **RESET** | Late luteal / Menstrual | Pattern recognition, strategic clarity |

---

## Run Locally

**Prerequisites:** Node.js, a [Gemini API key](https://aistudio.google.com/app/apikey)

```bash
git clone https://github.com/Claudyahhh/Option-.git
cd Option-
npm install
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Gemini API** for dynamic content generation
- Zero external UI libraries — custom CSS only

---

## Roadmap

- **MVP (current)** — Theoretical hormone simulation engine + daily dynamic briefing
- **v2** — Lightweight calibration layer (daily energy slider, ovulation check)
- **v3** — External biometric data integration, partner collaboration view
