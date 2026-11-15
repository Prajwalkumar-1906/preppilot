# Engineering Architecture & Design Decisions (DECISIONS.md)

This document tracks key architectural decisions, rationale, trade-offs, and deviations made during the development of the AI Interview Coach.

---

### Decision 1: SQLAlchemy Session Management & Worker Threadpool Model
- **Context**: In FastAPI with Python 3.11+ on Windows and Linux containers, asyncio loop drivers (`aiosqlite` / `asyncpg` with proactor sockets) can experience loopback socket deadlocks in sandboxed/restricted environments and add concurrency complexity to simple CRUD pipelines.
- **Decision**: Implemented clean SQLAlchemy 2.0 sessions managed via FastAPI's `get_db` dependency running inside AnyIO's high-performance worker threadpool. The connection engine dynamically detects the database driver (PostgreSQL with `psycopg` for production/docker, and SQLite with `sqlite3` for zero-dependency local testing).
- **Trade-off / Justification**: Zero-overhead context switching, 100% test reliability with in-memory SQLite and `StaticPool`, and full compatibility with PostgreSQL in Docker containers.

---

### Decision 2: Pure ASGI Middleware for Observability & Streaming
- **Context**: Starlette's standard `BaseHTTPMiddleware` (used by `@app.middleware("http")`) buffers response streams in memory, which severely degrades Server-Sent Events (SSE) streaming latency for real-time AI feedback and can introduce event loop stalls.
- **Decision**: Built a pure ASGI middleware (`RequestLoggingMiddleware`) that wraps the ASGI `send` callback directly to attach `X-Request-ID` and `X-Process-Time` response headers.
- **Trade-off / Justification**: Streaming responses (SSE) pass through with zero buffering delay, providing true real-time word-by-word LLM evaluation output to the user.

---

### Decision 3: Ephemeral Audio Storage & Privacy-First Retention
- **Context**: Storing raw candidate audio recordings indefinitely creates security liabilities, privacy risks, and rapid disk exhaustion.
- **Decision**: Implemented an automated audio cleanup policy (`AUDIO_RETENTION_HOURS=0`). Once `faster-whisper` transcribes the audio and computes speech delivery metrics (WPM, filler word frequencies, silence pauses), the raw audio file is safely unlinked by default.
- **Trade-off / Justification**: Candidates retain full privacy and zero voice data leakage, while keeping complete analytical transcripts and metrics.

---

### Decision 4: Playwright E2E Browser Testing for Critical Onboarding Flow
- **Context**: Unit and mock tests cannot fully verify CSS layout, DOM state transitions, browser localStorage persistence, and cross-origin API proxies.
- **Decision**: Integrated Playwright with Chromium headless execution to validate the real browser candidate onboarding journey: landing on login $\to$ navigating to registration $\to$ filling role/tech preferences $\to$ verifying localStorage JWTs $\to$ verifying dashboard role badge display.
- **Trade-off / Justification**: Instant verification of user-facing regression with automated full-page screenshots.

---

### Decision 5: Provider-Agnostic LLM Layer with Structured Output & Zero-Cost Mock Fallback
- **Context**: Relying exclusively on a single LLM provider creates vendor lock-in, requires active API credentials for running tests, and incurs API expenses during local test cycles.
- **Decision**: Architected `BaseLLMProvider` abstract interface with concrete adapters for `GeminiProvider` (official `google-genai`), `OpenAICompatibleProvider` (OpenAI, Groq, Ollama, DeepSeek), and a deterministic `MockLLMProvider`. When credentials are not set in `.env`, the factory automatically falls back to `MockLLMProvider`.
- **Trade-off / Justification**: The entire test suite and frontend can be developed and verified offline without consuming API tokens or failing on network rate limits.

---

### Decision 6: Hybrid Seed Question Bank & Explainable Adaptive Difficulty
- **Context**: Relying solely on live LLM calls for every question request causes latency spikes (1.5–3s per question), increases token costs, and risks duplicate questions across practice sessions.
- **Decision**: Pre-loaded 54 curated, high-yield interview questions across 6 roles and 6 categories into a local question bank table with SHA-256 content deduplication. Live LLM generation acts as an on-demand fallback when a user exhausts unseen questions in a topic. Adaptive difficulty steps up ($\ge 7.5$) or steps down ($\le 4.5$) based on a 5-attempt moving average.
- **Trade-off / Justification**: Sub-10ms response times for the majority of interview questions, zero LLM calls required for initial practice, and deduplication guaranteed via content hashing and `UserQuestionHistory`.
