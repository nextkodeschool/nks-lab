# Terraform AWS Infrastructure

This folder creates the AWS infrastructure for Next Kode School Lab.

## Architecture

```text
CloudFront
  -> private S3 bucket for frontend files

Application Load Balancer
  -> ECS Fargate backend
  -> RDS PostgreSQL

ECR stores the backend Docker image.
Secrets Manager stores runtime passwords and JWT secret.
CloudWatch stores backend logs.
```

## Folder Structure

```text
terraform/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  modules/
    network/
    security/
    ecr/
    rds/
    secrets/
    ecs_backend/
    frontend_hosting/
```

## GitHub Actions Secrets

Add sensitive values in GitHub: Settings -> Secrets and variables -> Actions.

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
POSTGRES_PASSWORD
JWT_SECRET
ADMIN_PASSWORD
STUDENT1_PASSWORD
STUDENT2_PASSWORD
```

## GitHub Actions Variables

Add these as repository variables. They are not passwords.

```text
AWS_REGION=ap-south-1
APP_NAME=nextkode-deploylab
ENVIRONMENT=lab
TF_STATE_BUCKET=your-existing-terraform-state-bucket
TF_STATE_LOCK_TABLE=your-existing-terraform-lock-table
```

The S3 state bucket and DynamoDB lock table should exist before running Terraform.

## Important

Terraform state can contain secret values because AWS Secrets Manager secret versions are created by Terraform. Keep remote state encrypted and private.

The default `backend_desired_count` is `0`. This creates infrastructure first without requiring a backend image to already exist in ECR. After pushing the backend image, run the workflow again with desired count `1`.

## Run Locally

```bash
cd terraform
terraform init \
  -backend-config="bucket=your-existing-terraform-state-bucket" \
  -backend-config="key=nextkode-deploylab/lab/terraform.tfstate" \
  -backend-config="region=ap-south-1" \
  -backend-config="dynamodb_table=your-existing-terraform-lock-table" \
  -backend-config="encrypt=true"

terraform plan
```

For local apply, export sensitive variables first:

```bash
export TF_VAR_postgres_password='replace_me'
export TF_VAR_jwt_secret='replace_me'
export TF_VAR_admin_password='replace_me'
export TF_VAR_student1_password='replace_me'
export TF_VAR_student2_password='replace_me'
```

## After Apply

Terraform prints:

- backend ECR repository URL
- backend API URL
- frontend S3 bucket name
- CloudFront domain name
- RDS endpoint

Build the frontend with the API URL, then upload `frontend/dist` to the S3 bucket.

