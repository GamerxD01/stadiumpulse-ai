# Antigravity Prompt — Strict Refactor Pass (Target: 98+)

Paste everything below into Antigravity as ONE message. Follow every instruction exactly. Do not skip steps. Do not summarize what you "would" do — actually do it, then prove it with command output.

---

I have manually reviewed the codebase myself and identified the exact, specific problems holding back the score. Fix these precisely as described below — do not do generic "polish," do these exact changes.

## CONTEXT: Why the last two passes didn't move Code Quality
The backend code (`main.py`, `orchestrator.py`, `generator.py`) is already clean and well-structured. The problem is `frontend/src/App.jsx` is a single 56KB monolithic file containing every component (Fan Companion, Staff Copilot, Organizer Dashboard, all UI) with zero separation of concerns. This is very likely the single biggest reason Code Quality has been stuck at exactly 86 across two review passes. Fix this first, and fix it completely — do not do a partial split.

---

## STEP 1: Split `App.jsx` into a real component architecture

Create this exact folder structure under `frontend/src/`:

```
src/
  components/
    layout/
      Header.jsx
      Navigation.jsx
      Footer.jsx (if applicable)
    fan-companion/
      FanCompanionChat.jsx
      ChatMessage.jsx
      ChatInput.jsx
    staff-copilot/
      StaffCopilotFeed.jsx
      AlertCard.jsx
      ExplainAlertButton.jsx
    organizer-dashboard/
      OrganizerDashboard.jsx
      ShiftBriefingPanel.jsx
      SustainabilityPanel.jsx
      DensityChart.jsx
    shared/
      LoadingSpinner.jsx
      ErrorBanner.jsx
      (any other genuinely reused small UI pieces)
  hooks/
    useChat.js
    useAlerts.js
    useSimulatorState.js
    (extract any repeated fetch/state logic currently duplicated in App.jsx into custom hooks)
  services/
    api.js  (centralize all fetch calls to the backend here — no component should call fetch() directly)
  App.jsx  (must be under 100 lines after refactor — only handles top-level layout/routing/tab-switching, imports the components above)

```

**Rules for this step:**
- Every component gets its own file. No component should exceed roughly 150 lines — if one does, split it further.
- All API calls must go through `services/api.js`, not scattered `fetch()` calls in components.
- All shared state/logic (polling the simulator, managing chat history, managing alerts) must be extracted into the custom hooks in `hooks/`.
- Preserve 100% of existing functionality and styling exactly as it currently behaves. This is a structural refactor, not a redesign. Do not change any visual appearance, do not change any API behavior.
- Keep all existing accessibility attributes (ARIA labels, alt text, focus states) intact when moving code — do not lose any of the accessibility work from the previous pass.
- After the split, run the app and manually verify every tab/feature still works exactly as before: Fan Companion chat, Staff Copilot alerts + explain button, Organizer dashboard briefings.

---

## STEP 2: Fix backend encapsulation issues

In `backend/main.py`, the functions `get_shift_briefing()` and `get_sustainability_briefing()` currently call `orchestrator.client.models.generate_content(...)` directly, reaching into the orchestrator's internal client from outside the class. Fix this:

1. Move the actual Gemini-calling logic for both shift briefing and sustainability briefing into two new methods on the `GeminiOrchestrator` class in `orchestrator.py`: `generate_shift_briefing(incidents, crowd_density)` and `generate_sustainability_briefing(metrics)`.
2. Update the FastAPI route handlers in `main.py` to just call `orchestrator.generate_shift_briefing(...)` and `orchestrator.generate_sustainability_briefing(...)` — no direct access to `orchestrator.client` from `main.py` at all.
3. Preserve the exact same fallback/error-handling behavior that exists now.

In `orchestrator.py`, the `chat()` method calls `self.client.models.generate_content(...)` with an identical `config=types.GenerateContentConfig(tools=[...], system_instruction=SYSTEM_INSTRUCTION, automatic_function_calling=...)` block twice — once before the tool-calling loop, once inside it. Extract this into a small private helper method (e.g. `_generate(contents)`) and call that helper in both places instead of duplicating the config block.

---

## STEP 3: Run full verification and prove it with output

After Steps 1 and 2, run and paste the actual output of ALL of these commands — do not skip any, do not paraphrase results:

```bash
# Backend
cd backend
ruff check .
mypy .
pytest -v
pytest --cov=. --cov-report=term-missing

# Frontend
cd ../frontend
npm run lint
npm run test
npm run build
```

If any command shows errors or failures, fix the underlying issue and re-run until clean. Do not move to Step 4 until all of the above pass cleanly.

---

## STEP 4: Commit and push — and PROVE it landed

This is critical: in the last pass, some changes were made but the score didn't change, likely because they were never actually committed and pushed. Do not repeat that mistake.

1. Run `git status` and paste the output before committing
2. Run `git add -A && git commit -m "Refactor: split App.jsx into component architecture, fix orchestrator encapsulation"`
3. Run `git push origin master`
4. Run `git log --oneline -5` and paste the output showing your new commit at the top
5. Give me the direct GitHub commit URL so I can verify it landed

Do not tell me the work is done unless you can show me the actual pushed commit URL and the passing command output from Step 3.

---

## STEP 5: Update README

Add a short "Architecture" section to the root `README.md` describing the new frontend folder structure (components/hooks/services), so a reviewer can see the separation of concerns is intentional and documented, not incidental.

---

## FINAL CONFIRMATION

At the very end, give me a short summary in this exact format:

```
✅ App.jsx split: [old size] → [new size] lines
✅ Components created: [count]
✅ Backend encapsulation fixed: yes/no
✅ Duplicate config extracted: yes/no
✅ Lint: pass/fail
✅ Type check: pass/fail
✅ Tests: [X/Y] passing
✅ Build: pass/fail
✅ Committed: [commit hash]
✅ Pushed: [GitHub commit URL]
```
