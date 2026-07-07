# StadiumPulse AI: Live Demo Narration Script

This script guides you through a **3 to 5-minute live presentation** of StadiumPulse AI for the judges, showcasing the unified GenAI architecture (Fan Companion, Staff Copilot, and Organizer Command Center) built for FIFA World Cup 2026.

---

## Slide 1: The Hook (15 seconds)

*   **Action**: Project title slide on screen (with StadiumPulse AI logo).
*   **Narrator Voiceover**:
    > "Imagine 80,000 passionate football fans from over 100 countries packed into MetLife Stadium. In the chaos of match day, a single medical emergency, turnstile clog, or rail delay can cascade into a major crisis. 
    > 
    > We built **StadiumPulse AI** — a single, unified GenAI brain that sits behind connected experiences for Fans, Staff, and Organizers, keeping everyone safe, moving, and informed in their own native language."

---

## Slide 2: The Architecture & Coverage Map (30 seconds)

*   **Action**: Switch to the Slide showing the **Requirement Coverage Matrix** and **Unified System Architecture**.
*   **Narrator Voiceover**:
    > "Rather than building siloed, disconnected chatbot widgets, our backend runs a single GenAI Orchestrator built on FastAPI and **Gemini 2.5 Flash**. 
    > 
    > We explicitly mapped our solution to all 8 requirements in the brief: from accessible wayfinding and crowd safety to transit congestion analysis, shift handovers, and sustainability metrics. Let's look at how it works in real-time."

---

## Demo Step 1: The Fan Companion, Accessibility & Multilingual (75 seconds)

*   **Action**: Switch the screen to the live web application on the **Fan Companion** tab.
    ![Initial Page Load](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/initial_page_load_1783340724032.png)
*   **Narrator Voiceover**:
    > "Here is our Fan Companion chat UI, designed for fans inside the venue. We've integrated an accessibility concierge switch. Let's ask it a wayfinding question:
    >
    > *'How do I get to the Seating Bowl from Gate A? I use a wheelchair.'*"
*   **Action**: Click the first suggestion pill on screen or type the query.
    ![ADA Wayfinding Response](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/fan_companion_response_1783340742199.png)
*   **Narrator Voiceover**:
    > "Notice the orchestrator automatically detects the need for step-free access. It invokes our `get_route` tool with `accessibility_mode=True` for elevator directions **and** our dedicated `get_accessibility_info` tool — which returns zone-specific ADA elevator banks, accessible restrooms, sensory quiet rooms, and hearing loop locations.
    >
    > This is a first-class tool, not just a route flag. Now let's ask about sensory facilities directly:
    >
    > *'Is there a quiet sensory room near the Concourse East for my autistic child?'*"
*   **Action**: Type the sensory room query and send.
*   **Narrator Voiceover**:
    > "The AI calls `get_accessibility_info('Concourse East')` and returns the exact location: Quiet Room CE-S1 on Level 2 — a noise-cancelling, low-light environment — plus the induction hearing loop coverage. Real, actionable data, not a generic answer.
    >
    > Now let's test multilingual. A fan from Spain asks:
    >
    > *'¿Cómo está la congestión del tren y cuánto tengo que esperar?'*"
*   **Action**: Paste the Spanish query and click send.
*   **Narrator Voiceover**:
    > "The system natively detects Spanish, queries the `get_transit_status` tool, and returns a full response in Spanish — no external translation API required. We support 15 languages natively."

---

## Demo Step 2: Triggering a Live Safety Incident (60 seconds)

*   **Action**: Toggle to the **Staff Copilot Alert** tab. Note that it shows 'All Operations Stable'.
    ![Staff Copilot Tab](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/staff_copilot_tab_1783340753200.png)
*   **Narrator Voiceover**:
    > "Next, let's step into the shoes of the ground team on the Staff & Volunteer Copilot. In the stadium command center, an operator detects a sudden backup. We'll simulate a live crowd safety crisis by spiking the sensor feed at Gate B."
*   **Action**: Click the **"Simulate Crowd Density Spike"** button in the Control Panel.
    ![Critical Safety Alert](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/critical_alert_loaded_1783340768046.png)
*   **Narrator Voiceover**:
    > "Within seconds, turnstile count cameras detect a density spike of 96%. The GenAI Orchestrator immediately intercepts this feed, runs safety reasoning over the incident, and fires a critical alert.
    > 
    > It outputs:
    > 1. A clear Title detailing the bottleneck at Gate B.
    > 2. An actionable, bullet-pointed Response Plan for volunteers on the ground.
    > 3. A 95% Confidence Score with the logical operations rationale.
    > 
    > If a new volunteer is confused by the operational jargon, they can tap 'Explain Alert'."
*   **Action**: Click the **"Explain Alert"** button on the critical card.
    ![Volunteer Guide Explanation](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/critical_alert_explained_1783340994100.png)
*   **Narrator Voiceover**:
    > "Gemini instantly rewrites the plan into friendly, plain-English instructions. It tells the volunteer: *'Head straight to Gate B, guide crowds to Gates A, C, or D, and look out for struggling children or elderly fans.'* This turns operational jargon into immediate helper readiness."

---

## Demo Step 3: Organizer Command Center & Briefings (45 seconds)

*   **Action**: Switch to the **Organizer Panel** tab.
    ![Organizer Dashboard Grid](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/shift_briefing_generated_1783341015480.png)
*   **Narrator Voiceover**:
    > "Finally, let's check the Organizer Panel. It provides real-time visualizations of all zone crowd levels and resource metrics. At shift change, directors need to hand over operational logs. Tapping 'Generate Shift Briefing' uses Gemini to synthesize the last 4 hours of simulator alerts into a concise briefing."
*   **Action**: Click the **"Generate Shift Briefing"** button and highlight the bullet points.
*   **Narrator Voiceover**:
    > "It summarizes the Gate B crowd spike and escalator incidents in three high-impact bullets.
    > 
    > To support tournament sustainability, post-match narratives are drafted on the fly. Clicking 'Generate Narrative' reads live water, waste, and solar meters, and compiles a comprehensive green-ops narrative for the final report."
*   **Action**: Click the **"Generate Narrative"** button.
    ![Sustainability Narrative Summary](file:///C:/Users/Chandra%20Prakash/.gemini/antigravity-ide/brain/4b230e1c-e18b-4252-ae8a-78ac178b146b/narrative_generated_1783341029444.png)

---

## Slide 3: Conclusion (15 seconds)

*   **Action**: Click **"Reset Simulator"** in the Staff tab to show the status returning to green, then switch back to the slides.
*   **Narrator Voiceover**:
    > "StadiumPulse AI delivers 8 tournament-critical features powered by a single, robust GenAI layer. It keeps fans moving, supports volunteers on the ground, and gives organizers complete visibility. 
    > 
    > Thank you, and we are ready for your questions!"
