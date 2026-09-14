output "backend_ecr_repository_url" {
  description = "Push the backend Docker image to this ECR repository."
  value       = module.ecr.backend_repository_url
}

output "api_url" {
  description = "Public backend API URL through the Application Load Balancer."
  value       = module.ecs_backend.api_url
}

output "frontend_bucket_name" {
  description = "Upload frontend/dist files to this S3 bucket."
  value       = module.frontend_hosting.bucket_name
}

output "cloudfront_domain_name" {
  description = "CloudFront domain for the frontend."
  value       = module.frontend_hosting.cloudfront_domain_name
}

output "rds_endpoint" {
  description = "Private RDS endpoint used by the backend."
  value       = module.rds.rds_endpoint
}

