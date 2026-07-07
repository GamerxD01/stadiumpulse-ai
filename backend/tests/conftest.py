"""Shared pytest fixtures for backend tests.

Provides a session-scoped rate limiter reset fixture that clears the
in-memory request log before each test file module that imports it,
preventing 429 cross-contamination between test suites.
"""

import os

import pytest

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-api-key")

from backend.main import RateLimitMiddleware, app


def _get_rate_limiter(application) -> RateLimitMiddleware | None:
    """Walk Starlette middleware stack to find the RateLimitMiddleware instance."""
    # app.middleware_stack is built lazily; iterate app.middleware_stack children
    # via the __dict__ of the built handler chain.
    current = application.middleware_stack
    while current is not None:
        if isinstance(current, RateLimitMiddleware):
            return current
        current = getattr(current, "app", None)
    return None


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the rate limiter's in-memory request log before each test.

    This prevents 429 cross-contamination when the rate-limit test fires 45
    requests that fill the per-IP window used by subsequent test cases.
    """
    limiter = _get_rate_limiter(app)
    if limiter is not None:
        limiter.requests.clear()
    yield
    # Clear again after to avoid leakage into the next test
    if limiter is not None:
        limiter.requests.clear()
