# Deployment Guide - Factory Floor Tycoon

## Prerequisites

- OpenShift cluster access
- MAAS API credentials
- `oc` CLI installed and authenticated

## Quick Deploy

1. **Create the namespace and secrets**
   ```bash
   # Create namespace
   oc apply -f deployment/deployment.yaml

   # Create secrets (update with your credentials first)
   cp deployment/secrets.yaml.example deployment/secrets.yaml
   # Edit secrets.yaml with your MAAS credentials
   oc apply -f deployment/secrets.yaml
   ```

2. **Build and deploy**
   ```bash
   # Create build configs and image streams
   oc apply -f deployment/buildconfig.yaml

   # Start builds
   oc start-build factory-backend -n factory-floor-tycoon
   oc start-build factory-frontend -n factory-floor-tycoon

   # Wait for builds to complete
   oc logs -f bc/factory-backend -n factory-floor-tycoon
   oc logs -f bc/factory-frontend -n factory-floor-tycoon

   # Deploy the application
   oc apply -f deployment/deployment.yaml
   ```

3. **Access the application**
   ```bash
   # Get the route URL
   oc get route factory-floor-tycoon -n factory-floor-tycoon
   ```

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export LLM_API_URL="https://your-maas-endpoint/v1"
export LLM_API_KEY="your-api-key"
export MODEL_NAME="gpt-3.5-turbo"

# Run
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend
- `LLM_API_URL` - MAAS endpoint URL
- `LLM_API_KEY` - MAAS API token
- `MODEL_NAME` - Model to use (default: gpt-3.5-turbo)

### Frontend
- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)

## Monitoring

```bash
# Check pod status
oc get pods -n factory-floor-tycoon

# View logs
oc logs -f deployment/factory-backend -n factory-floor-tycoon
oc logs -f deployment/factory-frontend -n factory-floor-tycoon

# Check resource usage
oc top pods -n factory-floor-tycoon
```

## Troubleshooting

### Backend not connecting to MAAS
- Verify secret is created: `oc get secret llm-credentials -n factory-floor-tycoon`
- Check environment variables in pod: `oc exec <pod-name> -n factory-floor-tycoon -- env | grep LLM`

### Frontend can't reach backend
- Verify service is running: `oc get svc -n factory-floor-tycoon`
- Check nginx config is correct in frontend pod

### Build failures
- Check build logs: `oc logs -f bc/<buildconfig-name> -n factory-floor-tycoon`
- Verify Containerfile syntax
- Check base image availability
