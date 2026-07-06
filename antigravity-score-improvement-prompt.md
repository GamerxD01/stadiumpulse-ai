# Antigravity Prompt — Score Improvement Pass

Paste everything below into Antigravity as one message.

---

I need to improve the evaluation score of this project (StadiumPulse AI) by fixing three specific weak areas: Testing (currently 0/100), Accessibility (currently 45/100), and Security (currently 75/100). Code Quality (86) and Problem Statement Alignment (87) are already strong — do not refactor those areas, just don't break them.

Work through the three sections below **in order**, and after each section, run/build the project to confirm nothing is broken before moving to the next.

---

## SECTION 1: Testing (highest priority — currently no test suite exists)

### Backend (FastAPI)
- Add `pytest` and `httpx` (for async test client) to backend dependencies
- Create a `tests/` folder in the backend with:
  - `test_routes.py` — test the route/navigation endpoint: one happy-path test (valid start/destination returns a route), one accessibility-mode test (confirms step-free routing is triggered), one error case (invalid/missing location returns proper 4xx, not a crash)
  - `test_crowd_density.py` — test the crowd density endpoint: happy path (valid zone returns density %), error case (invalid zone name handled gracefully)
  - `test_alerts.py` — test the staff alert / explain-alert endpoint: happy path (returns a well-formed StaffAlertModel with all required fields), test that the Gemini API fallback path works when the API call is mocked to fail/raise an exception (this proves the caching/fallback system actually works)
  - `test_simulator.py` — test the mock data generator: confirm it produces valid zone data, confirm incident spikes (crowd/medical/transit/clear) correctly change zone state
- Mock all Gemini API calls in tests (don't burn real API quota running tests) using `unittest.mock` or `pytest-mock`
- Add a `pytest.ini` or config in `pyproject.toml` so tests can be run with a single `pytest` command
- Add a "Running Tests" section to the backend README with the exact command

### Frontend (React)
- Add Vitest + React Testing Library if not already present
- Create tests for:
  - Fan Companion chat component: renders correctly, sends a message on submit, displays a response
  - Staff Copilot alert card: renders alert data correctly, displays severity styling, "explain this alert" button triggers expected behavior
  - At least one test confirming the app doesn't crash on empty/loading state
- Add a `npm run test` script to `package.json`
- Add a "Running Tests" section to the frontend README

### Verification
- Run the full backend and frontend test suites and paste the output showing all tests passing
- If any test fails, fix the underlying code or the test — don't leave failing tests in

---

## SECTION 2: Accessibility (currently 45/100)

Go through every page/component in the frontend and fix these systematically:

1. **Images & icons**: every `<img>` and icon component needs a meaningful `alt` attribute (or `aria-hidden="true"` if purely decorative)
2. **ARIA labels**: add `aria-label` to all icon-only buttons, the chat input field, alert severity badges, and any interactive element without visible text
3. **Keyboard navigation**: 
   - confirm every interactive element (buttons, chat input, dropdowns, alert cards) is reachable via Tab key in a logical order
   - confirm Enter/Space triggers buttons and clickable cards
   - add visible focus states (`:focus-visible` outlines) — don't rely on browser defaults being enough, make them clearly visible against the dark theme
4. **Semantic HTML**: replace generic `<div>` wrappers with proper semantic tags where appropriate — `<nav>`, `<main>`, `<header>`, `<section>`, `<button>` (not `<div onClick>`)
5. **Color contrast**: audit the dark glassmorphic theme — check text-on-background contrast ratios meet WCAG AA (4.5:1 for normal text, 3:1 for large text/icons). Fix any low-contrast text (especially muted/secondary text colors, which are common offenders in dark themes)
6. **Form labels**: any input field (chat box, search, filters) needs an associated `<label>` or `aria-label`, not just a placeholder
7. **Live regions**: for real-time alerts appearing on the Staff Copilot, add `aria-live="polite"` (or `"assertive"` for critical alerts) so screen readers announce new alerts automatically
8. **Reduced motion**: if there are animations/transitions, respect `prefers-reduced-motion` media query

### Verification
- Run an automated accessibility check (axe-core via `@axe-core/react` in dev, or note if Lighthouse accessibility audit is available) and paste the before/after scores
- Manually tab through the whole app and confirm no interactive element is unreachable or unlabeled

---

## SECTION 3: Security (currently 75/100)

1. **API key handling**: confirm `GEMINI_API_KEY` is read only from environment variables, never hardcoded, never logged (check console.log/print statements don't leak it), and never included in any API response body or error message sent to the client
2. **Input validation**: add proper validation (Pydantic models with constraints) on every FastAPI endpoint — reject malformed, oversized, or unexpected input types before they reach the Gemini call or the simulator
3. **CORS**: restrict CORS origins to only the actual Vercel frontend URL (`https://stadiumpulse-ai.vercel.app`) instead of `*` or overly permissive settings — keep `localhost` allowed only in a dev-specific config, not in production
4. **Rate limiting**: add basic rate limiting (e.g. `slowapi` for FastAPI) on the chat/alert/route endpoints to prevent abuse and accidental quota exhaustion from repeated calls
5. **Error handling**: ensure exceptions (including Gemini API errors) return generic client-facing error messages — never leak stack traces, internal file paths, or API error details to the frontend
6. **Dependency check**: run `pip list --outdated` and `npm outdated` and flag/update any dependencies with known critical vulnerabilities (don't need to update everything, just anything flagged as high/critical)
7. **.env safety**: confirm `.env` is in `.gitignore` and was never committed in git history (check with `git log --all --full-history -- .env`); if it was ever committed, note that so the key can be rotated again

### Verification
- Show the updated CORS config, rate limiting config, and confirm `.env` git history is clean
- Confirm no API keys or secrets appear anywhere in the codebase via a final `grep -r "AQ\." .` or similar search before this is considered done

---

## FINAL STEP

After all three sections are done and verified:
- Update the main README with a short "Testing & Quality" section summarizing test coverage, accessibility measures, and security practices added
- Commit with a clear message like `"Add test suite, accessibility fixes, and security hardening"`
- Push to GitHub and confirm Vercel/Render redeploy successfully with no build errors
