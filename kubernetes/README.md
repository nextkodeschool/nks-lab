# Kubernetes Deployment Guide

This folder contains Kubernetes manifests for deploying Next Kode School Lab.

## Files

| File | Purpose |
| --- | --- |
| `namespace.yaml` | Creates the `nextkode-lab` namespace |
| `configmap.yaml` | Stores non-secret app settings |
| `secret.yaml` | Stores passwords, JWT secret, and database URL |
| `database.yaml` | Deploys PostgreSQL with a persistent volume and ClusterIP service |
| `backend.yaml` | Deploys the FastAPI backend and ClusterIP service |
| `frontend.yaml` | Deploys the Nginx/React frontend and LoadBalancer service |
| `ingress.yaml` | Optional Ingress route for clusters with an Ingress controller |
| `kustomization.yaml` | Lets you deploy the stack with one `kubectl apply -k` command |

## Architecture

```text
Browser
  -> frontend Service
  -> frontend Pod: Nginx + React
  -> backend Service
  -> backend Pod: FastAPI
  -> database Service
  -> database Pod: PostgreSQL
  -> PersistentVolumeClaim
```

The frontend image uses `frontend/nginx.conf`, which proxies `/api/*` and `/health` to:

```text
http://backend:8000
```

That works in Kubernetes because `backend` is the service name inside the same namespace.

## Prerequisites

- Kubernetes cluster
- `kubectl` configured for the cluster
- Docker installed
- Docker Hub account or another container registry

Check access:

```bash
kubectl version --client
kubectl cluster-info
```

## 1. Build And Push Images

Set your registry username:

```bash
export DOCKER_USERNAME=your_dockerhub_username
```

Build images from the project root:

```bash
docker build -t $DOCKER_USERNAME/nextkode-deploylab-database:latest ./database
docker build -t $DOCKER_USERNAME/nextkode-deploylab-backend:latest ./backend
docker build -t $DOCKER_USERNAME/nextkode-deploylab-frontend:latest ./frontend
```

Login and push:

```bash
docker login

docker push $DOCKER_USERNAME/nextkode-deploylab-database:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-backend:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
```

## 2. Update Image Names

Replace `your-dockerhub-username` in the manifests:

```bash
sed -i.bak "s/your-dockerhub-username/$DOCKER_USERNAME/g" kubernetes/*.yaml
```

On macOS, the command creates `.bak` files. Remove them if you do not need them:

```bash
rm kubernetes/*.bak
```

## 3. Update Secrets

Open `secret.yaml` and replace placeholder values before manual classroom deployments:

```yaml
stringData:
  POSTGRES_PASSWORD: replace_me_postgres_password
  DATABASE_URL: postgresql://nextkode:replace_me_postgres_password@database:5432/nextkode
  JWT_SECRET: replace_me_jwt_secret
  ADMIN_PASSWORD: replace_me_admin_password
  STUDENT1_PASSWORD: replace_me_student1_password
  STUDENT2_PASSWORD: replace_me_student2_password
```

Important: if you change `POSTGRES_PASSWORD`, update the same password inside `DATABASE_URL`.

For production and GitHub Actions, avoid committing real secrets. Store these as GitHub Actions Secrets:

```text
DOCKER_USERNAME
DOCKER_PASSWORD
KUBE_CONFIG_DATA
POSTGRES_PASSWORD
JWT_SECRET
ADMIN_PASSWORD
STUDENT1_PASSWORD
STUDENT2_PASSWORD
```

`KUBE_CONFIG_DATA` should be your kubeconfig encoded with:

```bash
base64 -i ~/.kube/config
```

The GitHub Actions workflows build `DATABASE_URL` from `POSTGRES_PASSWORD` during deployment.

For manual Kubernetes deployment, create the secret from your terminal instead:

```bash
kubectl create namespace nextkode-lab

kubectl create secret generic nextkode-lab-secret \
  --namespace nextkode-lab \
  --from-literal=POSTGRES_PASSWORD='your_database_password' \
  --from-literal=DATABASE_URL='postgresql://nextkode:your_database_password@database:5432/nextkode' \
  --from-literal=JWT_SECRET='your_long_random_jwt_secret' \
  --from-literal=ADMIN_PASSWORD='your_admin_password' \
  --from-literal=STUDENT1_PASSWORD='your_student1_password' \
  --from-literal=STUDENT2_PASSWORD='your_student2_password'
```

If you create the secret manually, remove `secret.yaml` from `kustomization.yaml` before applying.

## 4. Deploy

Apply everything with Kustomize:

```bash
kubectl apply -k kubernetes
```

Or apply individual files:

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/database.yaml
kubectl apply -f kubernetes/backend.yaml
kubectl apply -f kubernetes/frontend.yaml
```

## 5. Verify Pods And Services

Check pods:

```bash
kubectl get pods -n nextkode-lab
```

Check services:

```bash
kubectl get svc -n nextkode-lab
```

Check logs:

```bash
kubectl logs -n nextkode-lab deploy/database
kubectl logs -n nextkode-lab deploy/backend
kubectl logs -n nextkode-lab deploy/frontend
```

Wait for deployments:

```bash
kubectl rollout status deploy/database -n nextkode-lab
kubectl rollout status deploy/backend -n nextkode-lab
kubectl rollout status deploy/frontend -n nextkode-lab
```

## 6. Open The Application

If your cluster supports `LoadBalancer`, get the frontend address:

```bash
kubectl get svc frontend -n nextkode-lab
```

Open the external IP or hostname in a browser.

For local clusters such as Minikube, use port forwarding:

```bash
kubectl port-forward svc/frontend 8080:80 -n nextkode-lab
```

Open:

```text
http://localhost:8080
```

Login:

```text
Use the usernames from configmap.yaml and passwords from your Kubernetes Secret.
```

## 7. Verify API And Database

Check backend through port forwarding:

```bash
kubectl port-forward svc/backend 8000:8000 -n nextkode-lab
```

In another terminal:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"service":"backend","status":"healthy","database":"connected"}
```

Check PostgreSQL readiness:

```bash
kubectl exec -n nextkode-lab deploy/database -- \
  pg_isready -U nextkode -d nextkode
```

## 8. Optional Ingress

Use `ingress.yaml` only if your cluster has an Ingress controller, such as NGINX Ingress.

Enable it in `kustomization.yaml`:

```yaml
resources:
  - namespace.yaml
  - configmap.yaml
  - secret.yaml
  - database.yaml
  - backend.yaml
  - frontend.yaml
  - ingress.yaml
```

Apply again:

```bash
kubectl apply -k kubernetes
```

For local testing, add this to `/etc/hosts`:

```text
127.0.0.1 nextkode-lab.local
```

Then open:

```text
http://nextkode-lab.local
```

## 9. Demonstrate Backend Failure

Scale backend to zero:

```bash
kubectl scale deploy/backend --replicas=0 -n nextkode-lab
```

Refresh the frontend. The UI should still load, but progress and database-backed sections should show no data.

Start backend again:

```bash
kubectl scale deploy/backend --replicas=1 -n nextkode-lab
kubectl rollout status deploy/backend -n nextkode-lab
```

Refresh the frontend. Real progress data should return from the backend and database.

## 10. Update Deployment After New Images

Build and push new images:

```bash
docker build -t $DOCKER_USERNAME/nextkode-deploylab-backend:latest ./backend
docker build -t $DOCKER_USERNAME/nextkode-deploylab-frontend:latest ./frontend

docker push $DOCKER_USERNAME/nextkode-deploylab-backend:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
```

Restart deployments:

```bash
kubectl rollout restart deploy/backend -n nextkode-lab
kubectl rollout restart deploy/frontend -n nextkode-lab
```

Watch rollout:

```bash
kubectl rollout status deploy/backend -n nextkode-lab
kubectl rollout status deploy/frontend -n nextkode-lab
```

## 11. Cleanup

Delete the whole application:

```bash
kubectl delete -k kubernetes
```

If the persistent volume is retained by your storage class, delete it manually from your cluster after confirming you no longer need the data.

## Notes For Production

- Use a managed database such as Amazon RDS instead of running PostgreSQL inside Kubernetes.
- Use real secrets through External Secrets, Sealed Secrets, or your cloud provider secret manager.
- Use HTTPS with a real domain and certificate.
- Avoid the `latest` image tag for production. Use immutable tags such as Git commit SHAs.
- Increase backend replicas after moving PostgreSQL to a managed database.
- Add resource requests and limits according to your cluster capacity.
