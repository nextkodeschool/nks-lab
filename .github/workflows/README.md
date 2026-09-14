# GitHub Actions Workflows

These workflows show five common CI/CD paths for students.

## Required Secrets

Add these in GitHub: Settings -> Secrets and variables -> Actions.

```text
DOCKER_USERNAME
DOCKER_PASSWORD
KUBE_CONFIG_DATA
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
POSTGRES_PASSWORD
JWT_SECRET
ADMIN_PASSWORD
STUDENT1_PASSWORD
STUDENT2_PASSWORD
```

`KUBE_CONFIG_DATA` is a base64 encoded kubeconfig:

```bash
base64 -i ~/.kube/config
```

## Important Secret Rule

Kubernetes manifests and Helm `values.yaml` cannot read GitHub Actions Secrets by themselves.

Use secrets inside workflow files, then pass them to `kubectl` or `helm` during the deploy step.

## Workflows

| Workflow | Purpose |
| --- | --- |
| `docker-build-push.yml` | Builds and pushes all three Docker images |
| `kubernetes-deploy.yml` | Deploys existing images with Kubernetes manifests |
| `docker-build-kubernetes-deploy.yml` | Builds images, then deploys with Kubernetes manifests |
| `helm-deploy.yml` | Deploys existing images with Helm |
| `docker-build-helm-deploy.yml` | Builds images, then deploys with Helm |
| `terraform-infra.yml` | Creates AWS infrastructure with Terraform |

The workflows build `DATABASE_URL` from `POSTGRES_PASSWORD` during deployment.

Terraform also needs these repository variables:

```text
AWS_REGION
APP_NAME
ENVIRONMENT
TF_STATE_BUCKET
TF_STATE_LOCK_TABLE
```
