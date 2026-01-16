# 🎓 Adaptive Maths Tutor — POC

An **AI-powered, schema-driven adaptive maths tutor** for **Year 3 (ages 7–8)**, focused on early gap detection, personalised practice, and clear progress signals for parents.

This repository contains the **active POC implementation**.

---

## 🎯 POC Goal

Validate that:
- Learning gaps can be **diagnosed reliably**
- Practice can **adapt in real time**
- Progress can be **clearly explained to parents**
- This can be achieved **without pre-building large content banks**

This is a **speed-to-truth** build, not a scale-ready product.

---

## 🧠 Core Approach

- **Schema-driven questions** (AI renders, never invents)
- **Generate → Validate → Cache → Reuse**
- Deterministic validation eliminates hallucinations
- Wizard-of-Oz allowed where it accelerates learning

AI is used as a **renderer**, not a decision-maker.

---

## 🏗️ Tech Stack (and what each part does)

### Frontend

| Technology | Purpose in This Project |
|----------|--------------------------|
| **React 18 + TypeScript** | Deterministic UI and strongly-typed learning state |
| **Vite** | Fast local development and iteration speed |
| **Tailwind CSS** | Rapid, consistent UI styling |
| **shadcn/ui (Radix)** | Accessible, composable UI primitives |
| **Framer Motion** | Micro-animations for child-friendly feedback |
| **@dnd-kit** | Interactive drag-and-drop math activities |
| **React Hook Form + Zod** | Typed, validated learning inputs |
| **React Router DOM** | Screen and flow navigation |
| **TanStack React Query** | Server state, caching, retries |
| **Recharts** | Parent-facing progress and confidence charts |
| **Sonner** | Lightweight notifications |
| **date-fns + react-day-picker** | Scheduling, streaks, timelines |
| **use-sound** | UI sound effects and feedback cues |
| **Vitest + Testing Library** | Unit and component testing |

---

### Backend / Platform (Supabase)

| Technology | Purpose |
|----------|---------|
| **Supabase (Managed Backend)** | Rapid backend without ops overhead |
| **PostgreSQL** | Question cache, learning telemetry, confidence tracking |
| **Supabase Auth** | Student / parent authentication |
| **Edge Functions (Deno)** | Secure AI + audio API orchestration |
| **@supabase/supabase-js** | Typed client SDK |

---

### AI & Audio Services

| Service | Model / API | Role |
|------|-------------|------|
| **AI Gateway** | `google/gemini-2.5-flash` | Schema-based adaptive question generation |
| **ElevenLabs TTS** | `eleven_turbo_v2_5` | Tutor voice narration and explanations |
| **ElevenLabs Music API** | Music Generation | Background music (edge function exists; currently local audio is used) |

---

## ⚙️ Edge Functions

| Function | Purpose | External API |
|--------|--------|--------------|
| `generate-assessment` | Generates adaptive maths questions from schemas | Gemini |
| `text-to-speech` | Converts tutor text to audio | ElevenLabs TTS |
| `generate-music` | Background music generation (optional) | ElevenLabs Music API |

---

## 🔊 Audio & Voice Flow

**Tutor Output**

---


## 🧩 Repository Structure


## 🧪 What This POC Is / Is Not

### In Scope
- Adaptive logic
- Question correctness
- Audio learning experience
- Parent-facing clarity

### Out of Scope
- Full curriculum coverage
- Voice cloning
- Gamification depth
- Long-term optimisation

---

## 🤝 Contribution Guidelines

- Prefer **clarity over cleverness**
- Keep changes **small and reversible**
- If manual work gives faster truth, do it
- Flag uncertainty early

This is a **learning system first**.

---

## 📍 Status

🚧 **Active POC — rapid iteration expected**

Expect changing assumptions, evolving schemas, and frequent refactors.
