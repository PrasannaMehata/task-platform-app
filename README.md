# AI Task Processing Platform

A secure, resilient, event-driven task processing platform built using **React (Vite) + Node (Express) + Python (Worker) + Redis Streams + MongoDB**.

This repository contains the application source code. For infrastructure manifests and GitOps configurations, see the accompanying `task-platform-infra` repository.

---

## Repository Structure
- [backend/](file:///d:/venture_project/task-platform-app/backend/): Express API serving port `5000` (Zod validation, rate limiter, Pino logger, JWT auth).
- [frontend/](file:///d:/venture_project/task-platform-app/frontend/): React + Vite + Tailwind CSS v4 single-page application served via Nginx.
- [worker/](file:///d:/venture_project/task-platform-app/worker/): Python worker executing string operations from Redis Stream queue.
- [ARCHITECTURE.md](file:///d:/venture_project/task-platform-app/ARCHITECTURE.md): Explains database indexing, message queues, HPA vs KEDA, and recovery loops.

---

## 1. Quickstart: Run Locally with Docker Compose

Ensure Docker Desktop is running. Stop any local MongoDB or Redis containers running on default host ports (`27017` and `6379`) to prevent conflicts.

1. **Build and start the stack**:
   ```bash
   docker-compose build
   docker-compose up -d
   ```
2. **Access the application**:
   - Frontend SPA: `http://localhost:8080`
   - Express Backend API: `http://localhost:5000`
3. **Verify running containers**:
   ```bash
   docker-compose ps
   ```
4. **Shutdown stack**:
   ```bash
   docker-compose down -v
   ```

---

## 2. Deploying on Kubernetes (k3d + Argo CD)

To test the GitOps integration locally inside a Kubernetes environment:

### Prerequisite: Spin up Cluster & Load Images
1. **Create the k3d cluster**:
   ```bash
   k3d cluster create task-platform-cluster --port "8082:80@loadbalancer" --api-port 6550
   ```
2. **Build docker images locally** (if not already done via docker-compose):
   ```bash
   docker-compose build
   ```
3. **Import built images directly into k3d**:
   ```bash
   k3d image import task-platform-app-backend:latest task-platform-app-worker:latest task-platform-app-frontend:latest -c task-platform-cluster
   ```

### Step A: Deploy Argo CD
1. **Create the namespace**:
   ```bash
   kubectl create namespace argocd
   ```
2. **Apply Argo CD manifests using server-side apply**:
   ```bash
   kubectl apply --server-side --force-conflicts -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```
3. **Wait for server availability**:
   ```bash
   kubectl wait --for=condition=available --timeout=300s -n argocd deployment/argocd-server
   ```
4. **Port forward the dashboard**:
   ```bash
   kubectl port-forward svc/argocd-server -n argocd 8085:443
   ```
5. **Get initial admin password**:
   - **On Windows (PowerShell)**:
     ```powershell
     [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}")))
     ```
   - Access dashboard at `https://localhost:8085` (User: `admin`).

### Step B: Wire up GitOps Sync
1. Push `task-platform-infra` to your GitHub account: `https://github.com/<username>/task-platform-infra`.
2. Edit `application.yaml` in the root of the infra repo to replace `<your-username>` with your GitHub username.
3. Deploy the application configuration to Argo CD:
   ```bash
   kubectl apply -f application.yaml
   ```
4. Argo CD will automatically pull down the manifests, spin up MongoDB, Redis, backend, worker, frontend, Ingress definitions, and Horizontal Pod Autoscalers (HPAs) inside the cluster.
5. Access the Kubernetes-served application on host port `8082` (mapped from Traefik):
   - Frontend: `http://localhost:8082/`
   - Backend API: `http://localhost:8082/api/`

---

## 3. Development / Local Verification
To run tests locally:
```bash
cd backend
npm install
npm test
```
To trigger end-to-end task worker verification scripts:
```bash
node scratch/verify_phase2.js
```
