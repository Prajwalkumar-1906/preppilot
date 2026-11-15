.PHONY: help install test test-backend test-frontend dev-backend dev-frontend docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install        - Install backend and frontend dependencies"
	@echo "  make dev-backend    - Run FastAPI backend development server"
	@echo "  make dev-frontend   - Run Vite frontend development server"
	@echo "  make test           - Run full test suite (backend + frontend)"
	@echo "  make docker-up      - Start full stack with Docker Compose"
	@echo "  make docker-down    - Stop Docker Compose services"

install:
	cd backend && uv pip install -r requirements.txt
	cd frontend && pnpm install

dev-backend:
	cd backend && .venv/Scripts/uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && pnpm dev

test: test-backend test-frontend

test-backend:
	cd backend && .venv/Scripts/pytest -v

test-frontend:
	cd frontend && pnpm test

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
