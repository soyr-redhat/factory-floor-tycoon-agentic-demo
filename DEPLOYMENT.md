# Deployment Guide - Factory Floor Tycoon

## Prerequisites

- OpenShift cluster access (https://api.ocp.cloud.rhai-tmm.dev:6443)
- GitHub repository with Actions enabled
- MAAS API credentials

## Automated CI/CD Setup

This project uses **dual deployment strategies** for automatic updates:

### 1. GitHub Actions (Primary Orchestration)

**Required GitHub Secrets:**
- `OPENSHIFT_LOGIN_TOKEN` - Your OpenShift authentication token
- `LLM_API_URL` - MAAS endpoint URL
- `LLM_API_KEY` - MAAS API key

**Workflow Features:**
- Triggers on push to `main` affecting backend/frontend/deployment
- Installs OpenShift CLI
- Builds container images on OpenShift
- Deploys to `factory-floor-tycoon` namespace
- Automatically cleans up old builds (keeps last 3)
- Reports deployment URL

### 2. OpenShift BuildConfig (Automatic Builds)

- GitHub webhooks trigger builds on git push
- Automatic image stream updates
- Zero-downtime rolling deployments via image triggers

## Initial Setup

### 1. Configure GitHub Secrets

Go to: https://github.com/soyr-redhat/factory-floor-tycoon-agentic-demo/settings/secrets/actions

Add:
```
OPENSHIFT_LOGIN_TOKEN=<your-token>
LLM_API_URL=https://litellm-litemaas.apps.prod.rhoai.rh-aiservices-bu.com/v1
LLM_API_KEY=<your-api-key>
```

### 2. Deploy Initial Resources

```bash
# Login to OpenShift
oc login --token=<your-token> --server=https://api.ocp.cloud.rhai-tmm.dev:6443

# Namespace should already exist - verify
oc get namespace factory-floor-tycoon

# Create secrets
cp deployment/secrets.yaml.example deployment/secrets.yaml
# Edit with your credentials
oc apply -f deployment/secrets.yaml

# Apply build configs and deployments
oc apply -f deployment/buildconfig.yaml
oc apply -f deployment/deployment.yaml

# Trigger initial builds
oc start-build factory-backend -n factory-floor-tycoon
oc start-build factory-frontend -n factory-floor-tycoon
```

### 3. Access the Application

```bash
oc get route factory-floor-tycoon -n factory-floor-tycoon
```

URL: https://factory-floor-tycoon-factory-floor-tycoon.apps.ocp.cloud.rhai-tmm.dev

## How It Works

**On every push to main:**

1. GitHub sends webhook to OpenShift
2. BuildConfigs automatically start building new container images
3. GitHub Actions workflow triggers and orchestrates deployment
4. New images pushed to internal registry
5. Image triggers automatically update deployments
6. Pods roll out with zero downtime
7. Old builds cleaned up (keeps last 3)

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export LLM_API_URL="https://litellm-litemaas.apps.prod.rhoai.rh-aiservices-bu.com/v1"
export LLM_API_KEY="sk-..."
export MODEL_NAME="Mistral-Small-24B-W8A8"

uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Monitoring

```bash
# Check deployments
oc get deployments -n factory-floor-tycoon

# Check pods
oc get pods -n factory-floor-tycoon

# View logs
oc logs -f deployment/factory-backend -n factory-floor-tycoon
oc logs -f deployment/factory-frontend -n factory-floor-tycoon

# Check builds
oc get builds -n factory-floor-tycoon

# Watch GitHub Actions
gh run watch
```

## Troubleshooting

### Workflow fails at login
- Verify `OPENSHIFT_LOGIN_TOKEN` secret is set correctly
- Check token hasn't expired

### Builds not triggering automatically
- Verify BuildConfig webhooks are configured
- Check webhook deliveries in GitHub Settings → Webhooks

### Frontend pods crash (permission denied)
- Verify using `nginxinc/nginx-unprivileged:alpine` base image
- Check OpenShift security constraints

### Deployments not updating with new images
- Verify image triggers annotation exists on deployment
- Check ImageStream exists: `oc get imagestream -n factory-floor-tycoon`

### Old builds not cleaning up
- Check GitHub Actions logs for cleanup step
- Verify user has delete permissions on builds
