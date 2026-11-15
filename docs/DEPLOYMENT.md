# Deployment Guide: AI Interview Coach

This guide details instructions for deploying the **AI Interview Coach with Real-Time Feedback** into local containerized environments, cloud VPS platforms, and managed container PaaS providers (Render, Railway, Fly.io, AWS ECS).

---

## 1. Quick Start: Local Deployment via Docker Compose

The simplest way to run the full production-ready stack (PostgreSQL 16, FastAPI backend, and Nginx + React frontend) is via Docker Compose.

### Prerequisites
- Docker Engine 24.0+ and Docker Compose v2.20+
- At least 4GB of RAM (for running faster-whisper and PostgreSQL)

### Steps
1. **Clone & Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   *(Optional)* Configure your LLM API key in `.env` (e.g. `GEMINI_API_KEY=...` or `OPENAI_API_KEY=...`). If left blank, the app runs in deterministic `mock` mode with zero external dependencies or costs.

2. **Launch Services**:
   ```bash
   docker compose up --build -d
   ```

3. **Verify Service Health**:
   - Web App UI: [http://localhost:3000](http://localhost:3000)
   - Backend OpenAPI Docs: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
   - Healthcheck: [http://localhost:8000/health](http://localhost:8000/health)

4. **Seed Demonstration Data**:
   To seed 54 curated questions and 3 historical mock sessions with 13 graded attempts:
   ```bash
   docker compose exec api python seed_data/seed_demo_history.py
   ```
   Now log in with demo credentials:
   - **Email:** `candidate@example.com`
   - **Password:** `Password123!`

5. **Stop Services**:
   ```bash
   docker compose down
   ```

---

## 2. Cloud VPS Deployment (Ubuntu / Debian / AWS EC2 / DigitalOcean Droplet)

### Step 1: Provision System Packages & Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw ffmpeg

# Install Docker & Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Clone Repository & Create `.env`
```bash
git clone <your-repo-url> /opt/interview-coach
cd /opt/interview-coach
cp .env.example .env
nano .env
```
Ensure `SECRET_KEY` is set to a cryptographically secure random string:
```bash
openssl rand -hex 32
```

### Step 3: Run the Stack
```bash
docker compose -f docker-compose.yml up -d --build
docker compose exec api python seed_data/seed_demo_history.py
```

### Step 4: Configure Domain & SSL with Certbot
Point your DNS `A` records (e.g., `interview.yourdomain.com`) to your server IP. Install Nginx on host for SSL termination:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# /etc/nginx/sites-available/interview-coach
server {
    server_name interview.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```
Enable site and obtain free Let's Encrypt SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/interview-coach /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d interview.yourdomain.com
```

---

## 3. PaaS Deployment: Render & Railway

### Option A: Railway
1. Fork or push this repository to GitHub.
2. In Railway, click **New Project** → **Deploy from GitHub repo**.
3. Add a **PostgreSQL** database service from Railway's template library.
4. For the `api` service:
   - Root directory: `/backend`
   - Build command: Automatic Dockerfile build
   - Environment variables:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
     - `SECRET_KEY`: `<generated-32-char-key>`
     - `LLM_PROVIDER`: `gemini` (or `openai`)
     - `GEMINI_API_KEY`: `<your-key>`
5. For the `web` service:
   - Root directory: `/frontend`
   - Build command: Automatic Dockerfile build
   - Point proxy pass in `nginx.conf` to Railway backend internal service URL.

### Option B: Render (Web Service + Managed PostgreSQL)
1. In Render, create a **PostgreSQL** database (Free or Starter tier).
2. Create a **Web Service (Docker)** for the Backend pointing to `backend/Dockerfile`.
3. Create a **Static Site or Web Service (Docker)** for the Frontend pointing to `frontend/Dockerfile`.

---

## 4. Production Environment Variables Reference

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | String | `AI Interview Coach` | Application display name |
| `SECRET_KEY` | String | *(Required)* | Secret key for JWT HS256 signing |
| `DATABASE_URL` | String | *(Required)* | SQLAlchemy connection string (`postgresql+psycopg://...`) |
| `SYNC_DATABASE_URL` | String | *(Optional)* | Synchronous fallback connection string |
| `LLM_PROVIDER` | String | `mock` | Selected LLM backend: `gemini`, `openai`, or `mock` |
| `GEMINI_API_KEY` | String | `""` | Google Gemini API key |
| `GEMINI_MODEL` | String | `gemini-2.5-flash` | Gemini model name |
| `OPENAI_API_KEY` | String | `""` | OpenAI API key |
| `OPENAI_BASE_URL` | String | `""` | Custom LLM base URL (for Groq, Ollama, DeepSeek) |
| `OPENAI_MODEL` | String | `gpt-4o-mini` | OpenAI-compatible model identifier |
| `WHISPER_MODEL_SIZE` | String | `base` | Model size for `faster-whisper` (`tiny`, `base`, `small`, `medium`) |
| `WHISPER_DEVICE` | String | `cpu` | Processing device: `cpu` or `cuda` |
| `WHISPER_COMPUTE_TYPE` | String | `int8` | Quantization mode (`int8`, `float16`, `float32`) |
| `AUDIO_UPLOAD_DIR` | String | `./storage/audio` | Ephemeral audio storage buffer |
| `AUDIO_RETENTION_HOURS`| Integer| `0` | Retention window (`0` deletes file immediately after transcription) |
| `CORS_ORIGINS` | JSON | `["http://localhost:3000"]` | Whitelisted frontend origins |

---

## 5. Security & Privacy Hardening Checklist

- [x] **Zero Persistent Audio**: `AUDIO_RETENTION_HOURS=0` guarantees audio uploads are deleted immediately following transcription.
- [x] **Anti-Prompt Injection**: Candidate answers are quarantined in strict XML/delimiter blocks (`<<<USER_ANSWER_BEGIN>>>`) and processed as untrusted string literals.
- [x] **Non-Buffering Nginx Proxy**: Reverse proxy buffers are disabled (`proxy_buffering off;`) to support SSE evaluation streaming without chunk drops.
- [x] **Password Protection**: Passwords salted and hashed via Argon2 / Bcrypt.
- [x] **Token Lifecycles**: Short-lived access tokens (15-60m) paired with rotating refresh tokens (7d).
