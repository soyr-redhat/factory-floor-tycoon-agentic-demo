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

- **Frontend**: React + Tailwind CSS + WebSockets
- **Backend**: Python FastAPI + WebSockets + LLM integration
- **Deployment**: OpenShift (containers)

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## OpenShift Deployment

```bash
oc apply -f deployment/
```

## Environment Variables

- `LLM_API_URL` - MAAS endpoint URL
- `LLM_API_KEY` - MAAS API token
- `MODEL_NAME` - Model to use for agents
