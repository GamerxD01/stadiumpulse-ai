# Security Policy & Architecture - StadiumPulse AI

This document outlines the security guidelines, policies, and runtime defenses implemented within **StadiumPulse AI**.

---

## 1. Runtime API Protection & Defense

### Custom IP-based Rate Limiter
- MetLife Stadium API endpoints are protected by a rolling-window rate-limiting middleware.
- **Rules**: Up to **40 requests per 60 seconds** per client IP address. Excess requests are instantly rejected with HTTP Status Code `429 Too Many Requests` to protect Gemini API quota usage from DDoS flooding.

### CORS Origin Validation
- Standard wildcards (`allow_origins=["*"]`) are disabled in production.
- API traffic is strictly locked to trusted origins:
  - Local development environments: `http://localhost:5173`, `http://127.0.0.1:5173`
  - Production deployments: `https://stadiumpulse-qn3icch8g-foxxys-projects-0b305d67.vercel.app`, `https://stadiumpulse-ai.vercel.app`

### Strict Input Validation
- The FastAPI endpoints parse requests through constrained Pydantic models.
- **Chat Query Constraints**: Incoming user queries must have a length of 1 to 500 characters. Rejects blank or oversized injection strings.
- **Simulator Control Constraints**: Spikes are verified against a strict regex whitelist: `^(crowd|medical|transit|clear)$`.

---

## 2. Server Safety & Information Leaks

### HTTP Security Headers
The following headers are automatically attached to all API HTTP response packets to guide browser sandboxing:
*   `X-Content-Type-Options: nosniff` (Prevents MIME-type sniffing attacks).
*   `X-Frame-Options: DENY` (Mitigates clickjacking attacks).
*   `Content-Security-Policy` (Restricts network connection resources to trusted domains).
*   `Referrer-Policy: strict-origin-when-cross-origin` (Avoids referrer token leaks).

### Exception Boundaries & Sanitization
- Runtime traceback leaks are mitigated via global FastAPI exception handlers.
- If an unhandled operational error occurs, details are logged safely to the backend server console, while the client receives a generic `500 Internal Server Error` message (`"detail": "An internal operational error occurred. The team has been notified."`).
- `GEMINI_API_KEY` is loaded through environment variables, never hardcoded, never printed to console/log files, and never transmitted in any HTTP response header or body.
