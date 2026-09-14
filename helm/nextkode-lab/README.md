# Helm Deployment Guide

This chart deploys Next Kode School Lab with Helm.

## What Helm Deploys

```text
frontend Deployment + Service
backend Deployment + Service
database Deployment + Service + PersistentVolumeClaim
ConfigMap
Secret
optional Ingress
```

The frontend image uses `frontend/nginx.conf` and proxies API calls to:

```text
http://backend:8000
```

For that reason, the default Helm values keep the backend service name as `backend` and the database service name as `database`.

## Folder Structure

```text
helm/
  nextkode-lab/
    Chart.yaml
    values.yaml
    README.md
    templates/
      _helpers.tpl
      configmap.yaml
      secret.yaml
      database.yaml
      backend.yaml
      frontend.yaml
      ingress.yaml
      NOTES.txt
```

## Prerequisites

- Kubernetes cluster
- `kubectl` configured for the cluster
- Helm installed
- Docker images pushed to Docker Hub or another registry

Check tools:

```bash
kubectl cluster-info
helm version
docker --version
```

## 1. Build And Push Images

Run from the project root:

```bash
export DOCKER_USERNAME=your_dockerhub_username

docker build -t $DOCKER_USERNAME/nextkode-deploylab-database:latest ./database
docker build -t $DOCKER_USERNAME/nextkode-deploylab-backend:latest ./backend
docker build -t $DOCKER_USERNAME/nextkode-deploylab-frontend:latest ./frontend

docker login
docker push $DOCKER_USERNAME/nextkode-deploylab-database:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-backend:latest
docker push $DOCKER_USERNAME/nextkode-deploylab-frontend:latest
```

## 2. Review Values

Open `helm/nextkode-lab/values.yaml`.

Update image repositories:

```yaml
database:
  image:
    repository: your-dockerhub-username/nextkode-deploylab-database

backend:
  image:
    repository: your-dockerhub-username/nextkode-deploylab-backend

frontend:
  image:
    repository: your-dockerhub-username/nextkode-deploylab-frontend
```

Update secrets for non-classroom deployments:

```yaml
secrets:
  postgresPassword: replace_me_postgres_password
  databaseUrl: postgresql://nextkode:replace_me_postgres_password@database:5432/nextkode
  jwtSecret: replace_me_jwt_secret
  adminPassword: replace_me_admin_password
  student1Password: replace_me_student1_password
  student2Password: replace_me_student2_password
```

Important: if you change `postgresPassword`, update the same password in `databaseUrl`.

For GitHub Actions deployments, store sensitive values in repository Secrets:

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

The GitHub Actions workflows build `databaseUrl` from `POSTGRES_PASSWORD` during deployment.

## 3. Install With Helm

Install into a new namespace:

```bash
helm install nextkode-lab ./helm/nextkode-lab \
  --namespace nextkode-lab \
  --create-namespace \
  --set database.image.repository=$DOCKER_USERNAME/nextkode-deploylab-database \
  --set backend.image.repository=$DOCKER_USERNAME/nextkode-deploylab-backend \
  --set frontend.image.repository=$DOCKER_USERNAME/nextkode-deploylab-frontend
```

Check release:

```bash
helm list -n nextkode-lab
helm status nextkode-lab -n nextkode-lab
```

## 4. Verify Kubernetes Objects

```bash
kubectl get pods -n nextkode-lab
kubectl get svc -n nextkode-lab
kubectl get pvc -n nextkode-lab
```

Watch rollouts:

```bash
kubectl rollout status deploy/database -n nextkode-lab
kubectl rollout status deploy/backend -n nextkode-lab
kubectl rollout status deploy/frontend -n nextkode-lab
```

Check logs:

```bash
kubectl logs -n nextkode-lab deploy/database
kubectl logs -n nextkode-lab deploy/backend
kubectl logs -n nextkode-lab deploy/frontend
```

## 5. Open The App

If your cluster supports `LoadBalancer`, get the frontend service:

```bash
kubectl get svc frontend -n nextkode-lab
```

Open the external IP or hostname.

For Minikube, Kind, or local clusters, use port forwarding:

```bash
kubectl port-forward svc/frontend 8080:80 -n nextkode-lab
```

Open:

```text
http://localhost:8080
```

Login:

```text
Use the usernames from values.yaml and passwords from your Helm Secret values.
```

## 6. Verify Backend And Database

Port-forward backend:

```bash
kubectl port-forward svc/backend 8000:8000 -n nextkode-lab
```

Check health:

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"service":"backend","status":"healthy","database":"connected"}
```

Check database readiness:

```bash
kubectl exec -n nextkode-lab deploy/database -- \
  pg_isready -U nextkode -d nextkode
```

## 7. Upgrade After Changes

If you push new images with the same tag:

```bash
helm upgrade nextkode-lab ./helm/nextkode-lab \
  --namespace nextkode-lab \
  --reuse-values

kubectl rollout restart deploy/backend -n nextkode-lab
kubectl rollout restart deploy/frontend -n nextkode-lab
```

If you use a new image tag:

```bash
helm upgrade nextkode-lab ./helm/nextkode-lab \
  --namespace nextkode-lab \
  --reuse-values \
  --set backend.image.tag=new-tag \
  --set frontend.image.tag=new-tag
```

## 8. Enable Ingress

Use this only when your cluster has an Ingress controller.

```bash
helm upgrade nextkode-lab ./helm/nextkode-lab \
  --namespace nextkode-lab \
  --reuse-values \
  --set ingress.enabled=true \
  --set ingress.host=nextkode-lab.local
```

For local testing, map the hostname:

```text
127.0.0.1 nextkode-lab.local
```

Open:

```text
http://nextkode-lab.local
```

## 9. Demonstrate Backend Failure

Scale backend down:

```bash
kubectl scale deploy/backend --replicas=0 -n nextkode-lab
```

Refresh the frontend. The UI should still load, but database-backed progress should show no data.

Start backend again:

```bash
kubectl scale deploy/backend --replicas=1 -n nextkode-lab
kubectl rollout status deploy/backend -n nextkode-lab
```

Refresh the frontend. Real progress data should return.

## 10. Render Templates Locally

Use this before deploying if you want to inspect generated YAML:

```bash
helm template nextkode-lab ./helm/nextkode-lab \
  --namespace nextkode-lab
```

Lint the chart:

```bash
helm lint ./helm/nextkode-lab
```

## 11. Uninstall

Remove the Helm release:

```bash
helm uninstall nextkode-lab -n nextkode-lab
```

Delete the namespace:

```bash
kubectl delete namespace nextkode-lab
```

Depending on your storage class reclaim policy, the persistent volume may remain after uninstalling. Delete it manually only when you no longer need the database data.

## Production Notes

- Use immutable image tags instead of `latest`.
- Store production secrets outside Git, such as External Secrets, Sealed Secrets, or your cloud provider secret manager.
- Use a managed database such as Amazon RDS for production.
- Add resource requests and limits before using a shared cluster.
- Use HTTPS with a real domain and certificate.
