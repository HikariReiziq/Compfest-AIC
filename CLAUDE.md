# CLAUDE PROJECT INSTRUCTIONS — COBA (COMPFEST 18 AIC)

## 1. Project Overview
- **Project Name**: COBA (*Cocokkan Outfit Sesuai Badan Anda*)
- **Competition**: AI Innovation Challenge (AIC) COMPFEST in Collaboration with WIZ.AI
- **Track / Pillar**: Smart Commerce (Post-production fashion style-fit recommendation engine with real-time browser AR try-on)
- **Primary SSOT Documentation**:
  - `MEMORY.md` — Architectural Decision Records (ADR-001 to ADR-012), Rules, and Complete Progress Log.
  - `Last_note.md` — Session Summary, Root Cause Analysis, and Next Action Items.
  - `PRD.md` — Product Requirements Document.
  - `Proposal.md` — Competition Proposal and Verified Open-Access Dataset Sources.
  - `ERROR.md` — Technical Issue Log and Resolutions.
  - `docs/design_references/` — UI Layout and Feature Reference Screenshots:
    * `docs/design_references/face_analysis_report_card.png` (Visual face measurement lines & ratios).
    * `docs/design_references/face_features_grid_badges.png` (Grid badges: Face, Nose, Eye, Eyebrow, Lip).
    * `docs/design_references/gpu_specs_task_manager.png` (Hardware: RTX 4060 GPU + 128GB RAM).

---

## 2. Tech Stack & Architecture
- **Frontend (`client/`)**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Three.js (WebGL AR), `@mediapipe/tasks-vision` (468 Face Landmarks).
- **Backend (`server/`)**: FastAPI, Python 3.11, Pydantic v2, Uvicorn, Google Gemini AI API (low-latency Flash-Lite).
- **AI Engine (`ai_engine/`)**: OpenCV CIELAB Skin Tone & Monk Scale (MST-01 to MST-10), Face Shape Classification (Random Forest), ANSUR II Anthropometric Ratios, Fashion Product Catalog (CC0).
- **Containerization**: Docker Compose (`coba-backend-server` on port 8000, `coba-frontend-client` on port 3000).

---

## 3. Specialized Skills Catalog (`.claude/skills/`)
When working on specific tasks, automatically reference and adhere to the guidelines in `.claude/skills/`:
- **Computer Vision & AR**: `.claude/skills/computer-vision-expert/SKILL.md`
- **Frontend Architecture & Design**: `.claude/skills/frontend-developer/SKILL.md`, `.claude/skills/frontend-architecture/SKILL.md`, `.claude/skills/frontend-dev-guidelines/SKILL.md`, `.claude/skills/high-end-visual-design/SKILL.md`
- **Backend & API Architecture**: `.claude/skills/backend-architect/SKILL.md`, `.claude/skills/backend-dev-guidelines/SKILL.md`, `.claude/skills/fastapi-pro/SKILL.md`, `.claude/skills/api-patterns/SKILL.md`
- **AI Engineering & Prompts**: `.claude/skills/ai-engineer/SKILL.md`, `.claude/skills/python-pro/SKILL.md`
- **Code Quality & Review**: `.claude/skills/clean-code/SKILL.md`, `.claude/skills/writing-plans/SKILL.md`, `.claude/skills/to-prd/SKILL.md`

---

## 4. Strict Competition Rules & Constraints
1. **Zero Institution Identity (Absolute Rule)**: NEVER mention or output any university name, faculty, campus logo, or personal institution identity anywhere in code, comments, documentation, or commits.
2. **Conventional Commits**: Every git commit must start with standard prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
3. **No Hardcoded Secrets**: NEVER hardcode API keys or credentials in any source code. Always read dynamically from `.env` or environment variables.
4. **Session-Scoped Biometrics**: Comply with UU PDP No. 27/2022 by maintaining zero persistent biometric storage on server.
