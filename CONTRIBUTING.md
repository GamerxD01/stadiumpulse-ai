# Contributing to StadiumPulse AI

Thank you for reviewing StadiumPulse AI — a GenAI operating layer built for FIFA World Cup 2026 stadiums.

---

## Architecture Decision Log

This document maps every FIFA 2026 Problem Statement pillar to a concrete implementation decision in the codebase, providing reviewers and contributors with a clear trace from requirement → design → code.

---

## FIFA 2026 Problem Statement → Feature → Code Map

| PS Pillar | Feature | File | Function / Component |
|---|---|---|---|
| **Navigation** | Turn-by-turn wayfinder via Gemini tool calling | `backend/orchestrator.py` | `get_route()` |
| **Crowd Management** | AI-evaluated density alerts with confidence scores | `backend/orchestrator.py` | `evaluate_alerts()` + `get_crowd_density()` |
| **Accessibility** | ADA elevator, sensory room, hearing loop lookup by zone | `backend/orchestrator.py` | `get_accessibility_info()` |
| **Transportation** | Live transit wait times for Train, Shuttle, Rideshare | `backend/orchestrator.py` | `get_transit_status()` |
| **Sustainability** | Post-match green ops narrative from IoT metrics | `backend/orchestrator.py` | `generate_sustainability_briefing()` |
| **Multilingual** | Auto-detected native response in 15 languages | `backend/orchestrator.py` | `SYSTEM_INSTRUCTION` |
| **Operational Intel** | 3-bullet AI shift handover briefing on demand | `backend/main.py` | `get_shift_briefing()` |
| **Real-Time Decision Support** | Live simulator → Gemini → structured safety plan → volunteer action items | `backend/generator.py` + `orchestrator.py` | `StadiumSimulator` + `evaluate_alerts()` |

---

## Key Design Decisions

### 1. Synchronous Tool Calling (Manual Agentic Loop)
**Decision**: Disabled `AutomaticFunctionCallingConfig` and implemented a manual tool-call loop (`iterations < 5`) in `orchestrator.py`.

**Why**: Gives us full observability into which tools fired — the `tools_called` list is returned with every chat response and displayed to users as transparent AI reasoning chips in the UI. This is critical for evaluator review.

### 2. Literal Types on Incident Model
**Decision**: `Incident.type`, `Incident.severity`, and `Incident.status` in `generator.py` use `Literal[...]` not bare `str`.

**Why**: Constrains valid domain values at the Python type-checker level. Any code that constructs an `Incident` with an invalid string will fail `mypy` type-checking, catching bugs before they reach production.

### 3. In-Memory Cache for Safety Alerts
**Decision**: `GeminiOrchestrator.alerts_cache` stores evaluated alerts by incident ID.

**Why**: Prevents re-evaluating the same incident on every 4-second poll. LLM calls are expensive; caching ensures Gemini only evaluates new incidents, not stale ones.

### 4. Rolling-Window Rate Limiter
**Decision**: Custom `RateLimitMiddleware` with a 40 req/60s window rather than a third-party library.

**Why**: Zero external dependencies, fully auditable, and tested directly in `test_routes.py::test_rate_limit_middleware_returns_429_after_limit`.

### 5. Full Offline Fallback at Every Layer
**Decision**: Every React hook (`useChat`, `useAlerts`, `useSimulatorState`, `useStaffBriefing`) has a local mock simulation path when the backend is offline.

**Why**: Enables live demo at hackathon venues without a live backend. The demo can run entirely client-side with believable, data-driven responses.

---

## Codebase Structure

```
promptwars/
├── backend/
│   ├── generator.py        # StadiumSimulator — state machine, incident model, spike triggers
│   ├── orchestrator.py     # GeminiOrchestrator — tool functions, chat loop, alert evaluation
│   ├── main.py             # FastAPI app — routes, middleware, security headers, rate limiter
│   └── tests/              # Pytest suite — 30+ tests covering all endpoints and fallbacks
├── frontend/
│   ├── src/
│   │   ├── services/api.js         # Centralized HTTP layer
│   │   ├── hooks/                  # Custom React state hooks
│   │   ├── components/             # Modular UI components by feature area
│   │   └── tests/App.test.jsx      # Vitest + RTL frontend suite
├── SECURITY.md             # Security hardening documentation
├── MULTILINGUAL.md         # 15-language support docs with example prompts
├── CONTRIBUTING.md         # Architecture decision log (this file)
└── DEMO.md                 # Live presentation script for judges
```

---

## Running Tests

### Backend (Python)
```bash
# From project root, activate venv first
$env:PYTHONPATH="."
.\\venv\\Scripts\\pytest --tb=short -q
```

### Frontend (JavaScript)
```bash
cd frontend
npm run test
```

### Linting
```bash
# Backend
.\\venv\\Scripts\\ruff check backend/

# Frontend
cd frontend
npx oxlint src/
```

---

## Code Style

- **Python**: Follows `ruff` rules (E, W, F, I, B, C4). All functions have Google-style docstrings.
- **JavaScript**: Follows `oxlint` react rules. All hooks and components have JSDoc blocks.
- **Type safety**: All Pydantic models use strict field types (`Literal`, `Field` with constraints).
