# Factory Floor Tycoon - Agentic AI Demo

An interactive game demonstrating agentic AI capabilities through competing factory worker agents.

## Concept

Program AI agents with custom system prompts and watch them compete in a simulated factory environment. Agents autonomously make decisions about resource allocation, respond to events, and optimize for profit.

## Features

- Real-time factory simulation with multiple AI workers
- Custom or template-based system prompts
- Visual factory floor with animated agents
- Decision logging and reasoning transparency
- Performance metrics and leaderboards
- Random events (breakdowns, rush orders, quality issues)

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + WebSockets (nginx-unprivileged)
- **Backend**: Python FastAPI + WebSockets + LLM integration (Kimi k2.5)
- **Deployment**: OpenShift with automated CI/CD
- **CI/CD**: GitHub Actions + OpenShift BuildConfig webhooks

## Quick Start

The application is deployed at: **https://red.ht/factory-floor**

## Automated Deployment

Push to `main` branch automatically triggers:
1. OpenShift builds via GitHub webhooks
2. GitHub Actions workflow orchestration
3. Automatic pod rollout with new images
4. Cleanup of old builds (keeps last 3)

See [DEPLOYMENT.md](DEPLOYMENT.md) for setup details.

## Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
export LLM_API_URL="http://maas.apps.ocp.cloud.rhai-tmm.dev/kimi-k25/kimi-k2-5/v1"
export LLM_API_KEY="your-long-lived-token"
export MODEL_NAME="kimi-k2-5"
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Environment Variables

- `LLM_API_URL` - MAAS endpoint URL
- `LLM_API_KEY` - MAAS API token (JWT long-lived token)
- `MODEL_NAME` - Model to use for agents (default: kimi-k2-5)
