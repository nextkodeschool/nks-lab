# AWS End-to-End Deployment Guide

This guide deploys Next Kode School Lab on AWS using managed services.

Recommended classroom architecture:

```text
Student Browser
  -> CloudFront
  -> S3 static frontend
  -> API Load Balancer
  -> ECS Fargate backend
  -> RDS PostgreSQL
```

Supporting services:

- Amazon ECR for backend container images
- Amazon ECS with AWS Fargate for the backend API
- Amazon RDS for PostgreSQL
- Application Load Balancer for public API traffic
- Amazon S3 for frontend static files
- Amazon CloudFront for frontend delivery
- AWS Secrets Manager or Systems Manager Parameter Store for secrets
- Amazon CloudWatch Logs for backend logs
- IAM for service permissions

This guide keeps the frontend static on S3/CloudFront and builds it with `VITE_API_URL` pointing to the backend API load balancer. That avoids needing Nginx service discovery in AWS.

## Prerequisites

- AWS account
- AWS CLI installed and configured
- Docker installed
- Node.js installed
- Terminal opened at the project root

Check tools:

```bash
aws --version
docker --version
node --version
npm --version
```

Choose a region and application name:

```bash
export AWS_REGION=ap-south-1
export APP_NAME=nextkode-deploylab
export POSTGRES_DB=nextkode
export POSTGRES_USER=nextkode
export POSTGRES_PASSWORD='replace-with-a-strong-password'
export JWT_SECRET='replace-with-a-long-random-secret'
```

Get your AWS account ID:

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

## 1. Push Backend Image To ECR

Create a private ECR repository:

```bash
aws ecr create-repository \
  --repository-name $APP_NAME-backend \
  --region $AWS_REGION
```

Login Docker to ECR:

```bash
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

Build, tag, and push the backend image:

```bash
docker build -t $APP_NAME-backend:latest ./backend

docker tag $APP_NAME-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME-backend:latest

docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME-backend:latest
```

Save the image URI:

```bash
export BACKEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME-backend:latest
```

## 2. Prepare Networking

For a lab, you can use the default VPC. For production, create a dedicated VPC with public subnets for the load balancer and private subnets for ECS and RDS.

Get the default VPC and subnet IDs:

```bash
export VPC_ID=$(aws ec2 describe-vpcs \
  --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region $AWS_REGION)

export SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID \
  --query 'Subnets[*].SubnetId' \
  --output text \
  --region $AWS_REGION)
```

Create security groups:

```bash
export ALB_SG=$(aws ec2 create-security-group \
  --group-name $APP_NAME-alb-sg \
  --description "$APP_NAME API load balancer security group" \
  --vpc-id $VPC_ID \
  --query GroupId \
  --output text \
  --region $AWS_REGION)

export ECS_SG=$(aws ec2 create-security-group \
  --group-name $APP_NAME-ecs-sg \
  --description "$APP_NAME backend service security group" \
  --vpc-id $VPC_ID \
  --query GroupId \
  --output text \
  --region $AWS_REGION)

export RDS_SG=$(aws ec2 create-security-group \
  --group-name $APP_NAME-rds-sg \
  --description "$APP_NAME database security group" \
  --vpc-id $VPC_ID \
  --query GroupId \
  --output text \
  --region $AWS_REGION)
```

Allow browser traffic to the API load balancer:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION
```

Allow the load balancer to reach ECS:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 8000 \
  --source-group $ALB_SG \
  --region $AWS_REGION
```

Allow ECS to reach RDS:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG \
  --region $AWS_REGION
```

## 3. Create RDS PostgreSQL

Create a subnet group:

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name $APP_NAME-db-subnets \
  --db-subnet-group-description "$APP_NAME database subnets" \
  --subnet-ids $SUBNET_IDS \
  --region $AWS_REGION
```

Create PostgreSQL:

```bash
aws rds create-db-instance \
  --db-instance-identifier $APP_NAME-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --allocated-storage 20 \
  --db-name $POSTGRES_DB \
  --master-username $POSTGRES_USER \
  --master-user-password "$POSTGRES_PASSWORD" \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name $APP_NAME-db-subnets \
  --backup-retention-period 1 \
  --no-publicly-accessible \
  --region $AWS_REGION
```

Wait until RDS is ready:

```bash
aws rds wait db-instance-available \
  --db-instance-identifier $APP_NAME-db \
  --region $AWS_REGION
```

Get the database endpoint:

```bash
export RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $APP_NAME-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region $AWS_REGION)

export DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$RDS_ENDPOINT:5432/$POSTGRES_DB
```

The backend creates tables and seeds users when it starts.

## 4. Store Secrets

Create secrets in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name $APP_NAME/database-url \
  --secret-string "$DATABASE_URL" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name $APP_NAME/jwt-secret \
  --secret-string "$JWT_SECRET" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name $APP_NAME/admin-password \
  --secret-string "admin@123" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name $APP_NAME/student1-password \
  --secret-string "student@1" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name $APP_NAME/student2-password \
  --secret-string "student@2" \
  --region $AWS_REGION
```

## 5. Create ECS Cluster And Logs

```bash
aws ecs create-cluster \
  --cluster-name $APP_NAME-cluster \
  --region $AWS_REGION
```

```bash
aws logs create-log-group \
  --log-group-name /ecs/$APP_NAME-backend \
  --region $AWS_REGION
```

## 6. Create IAM Execution Role

Create `ecs-task-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:

```bash
aws iam create-role \
  --role-name nextkodeDeployLabTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-trust-policy.json
```

Attach the ECS execution policy:

```bash
aws iam attach-role-policy \
  --role-name nextkodeDeployLabTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

Allow the role to read secrets:

```bash
aws iam put-role-policy \
  --role-name nextkodeDeployLabTaskExecutionRole \
  --policy-name nextkodeDeployLabSecretsAccess \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [\"secretsmanager:GetSecretValue\"],
        \"Resource\": [\"arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:$APP_NAME/*\"]
      }
    ]
  }"
```

## 7. Register Backend Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "nextkode-deploylab-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/nextkodeDeployLabTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/nextkode-deploylab-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "JWT_EXPIRE_MINUTES", "value": "60" },
        { "name": "ADMIN_USERNAME", "value": "admin" },
        { "name": "STUDENT1_USERNAME", "value": "student1" },
        { "name": "STUDENT2_USERNAME", "value": "student2" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "nextkode-deploylab/database-url" },
        { "name": "JWT_SECRET", "valueFrom": "nextkode-deploylab/jwt-secret" },
        { "name": "ADMIN_PASSWORD", "valueFrom": "nextkode-deploylab/admin-password" },
        { "name": "STUDENT1_PASSWORD", "valueFrom": "nextkode-deploylab/student1-password" },
        { "name": "STUDENT2_PASSWORD", "valueFrom": "nextkode-deploylab/student2-password" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nextkode-deploylab-backend",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Replace `ACCOUNT_ID` and `REGION`, or generate the file with environment variables:

```bash
sed \
  -e "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" \
  -e "s/REGION/$AWS_REGION/g" \
  ecs-task-definition.json > ecs-task-definition.generated.json
```

Register it:

```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.generated.json \
  --region $AWS_REGION
```

## 8. Create Application Load Balancer

Create the load balancer:

```bash
export ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $APP_NAME-api-alb \
  --subnets $SUBNET_IDS \
  --security-groups $ALB_SG \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region $AWS_REGION)
```

Create a target group:

```bash
export TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name $APP_NAME-api-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region $AWS_REGION)
```

Create a listener:

```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $AWS_REGION
```

Get the API URL:

```bash
export API_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region $AWS_REGION)

export API_URL=http://$API_ALB_DNS
```

## 9. Create ECS Backend Service

Convert subnet IDs to CSV:

```bash
export SUBNET_CSV=$(echo $SUBNET_IDS | tr ' ' ',')
```

Create the service:

```bash
aws ecs create-service \
  --cluster $APP_NAME-cluster \
  --service-name $APP_NAME-backend-service \
  --task-definition $APP_NAME-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_CSV],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=backend,containerPort=8000" \
  --region $AWS_REGION
```

Wait for the service:

```bash
aws ecs wait services-stable \
  --cluster $APP_NAME-cluster \
  --services $APP_NAME-backend-service \
  --region $AWS_REGION
```

Check API health:

```bash
curl $API_URL/health
```

Expected response:

```json
{"service":"backend","status":"healthy","database":"connected"}
```

## 10. Build Frontend For AWS

Build React with the public API URL:

```bash
cd frontend
npm install
VITE_API_URL=$API_URL npm run build
cd ..
```

## 11. Deploy Frontend To S3

Create a globally unique bucket name:

```bash
export FRONTEND_BUCKET=$APP_NAME-frontend-$AWS_ACCOUNT_ID
```

Create the bucket:

```bash
aws s3api create-bucket \
  --bucket $FRONTEND_BUCKET \
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION
```

Enable static website hosting:

```bash
aws s3 website s3://$FRONTEND_BUCKET \
  --index-document index.html \
  --error-document index.html
```

Upload the build:

```bash
aws s3 sync frontend/dist s3://$FRONTEND_BUCKET --delete
```

For a simple lab, allow public read access to the bucket website:

```bash
aws s3api put-public-access-block \
  --bucket $FRONTEND_BUCKET \
  --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

```bash
aws s3api put-bucket-policy \
  --bucket $FRONTEND_BUCKET \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Principal\": \"*\",
        \"Action\": \"s3:GetObject\",
        \"Resource\": \"arn:aws:s3:::$FRONTEND_BUCKET/*\"
      }
    ]
  }"
```

Open the S3 website endpoint:

```text
http://BUCKET_NAME.s3-website-REGION.amazonaws.com
```

Example:

```text
http://nextkode-deploylab-frontend-123456789012.s3-website-ap-south-1.amazonaws.com
```

## 12. Add CloudFront

For a production-style deployment, put CloudFront in front of S3. In production, use Origin Access Control instead of a public S3 bucket.

Create a CloudFront distribution from the AWS Console:

1. Go to CloudFront.
2. Create distribution.
3. Set origin to the S3 static website endpoint.
4. Set default root object to `index.html`.
5. Create a custom error response so `403` and `404` return `/index.html` with status `200`.
6. Save the distribution.

After deployment, open the CloudFront domain:

```text
https://your-cloudfront-domain.cloudfront.net
```

## 13. Validate Application

Check API:

```bash
curl $API_URL/health
```

Login through the browser:

```text
admin / admin@123
student1 / student@1
student2 / student@2
```

After login, verify:

- Student progress loads
- `/api/user/profile` succeeds
- `/api/deployment/status` succeeds
- Database status shows connected

## 14. Production Improvements

- Use HTTPS on the API load balancer with AWS Certificate Manager.
- Use Route 53 for a custom domain.
- Put ECS tasks in private subnets and use NAT Gateway or VPC endpoints for outbound AWS access.
- Use CloudFront Origin Access Control instead of public S3 bucket access.
- Store all passwords and secrets in Secrets Manager.
- Enable RDS deletion protection.
- Enable RDS automated backups and monitoring.
- Add GitHub Actions to build and deploy images automatically.

## 15. Cleanup

Delete resources when the lab is finished to avoid AWS charges.

```bash
aws ecs update-service \
  --cluster $APP_NAME-cluster \
  --service $APP_NAME-backend-service \
  --desired-count 0 \
  --region $AWS_REGION
```

```bash
aws ecs delete-service \
  --cluster $APP_NAME-cluster \
  --service $APP_NAME-backend-service \
  --force \
  --region $AWS_REGION
```

```bash
aws ecs delete-cluster \
  --cluster $APP_NAME-cluster \
  --region $AWS_REGION
```

```bash
aws rds delete-db-instance \
  --db-instance-identifier $APP_NAME-db \
  --skip-final-snapshot \
  --region $AWS_REGION
```

```bash
aws s3 rm s3://$FRONTEND_BUCKET --recursive
aws s3api delete-bucket --bucket $FRONTEND_BUCKET --region $AWS_REGION
```

Delete the ALB, target group, security groups, ECR repository, CloudWatch log group, and Secrets Manager secrets from the AWS Console or with AWS CLI.

## References

- Amazon ECR image push guide: https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
- Amazon ECR documentation: https://docs.aws.amazon.com/ecr/
- Amazon ECS documentation: https://docs.aws.amazon.com/ecs/
- Amazon RDS documentation: https://docs.aws.amazon.com/rds/
- Elastic Load Balancing documentation: https://docs.aws.amazon.com/elasticloadbalancing/
- Amazon S3 static website hosting: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- Amazon CloudFront documentation: https://docs.aws.amazon.com/cloudfront/
