variable "app_name" {
  description = "Application name for ECS resources."
  type        = string
}

variable "environment" {
  description = "Environment name for resource names."
  type        = string
}

variable "aws_region" {
  description = "AWS region for CloudWatch logs."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the load balancer target group."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets for ALB and lab ECS tasks."
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group for ECS tasks."
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group for the public ALB."
  type        = string
}

variable "backend_image" {
  description = "Full backend image URI with tag."
  type        = string
}

variable "desired_count" {
  description = "Number of backend tasks to run."
  type        = number
}

variable "jwt_expire_minutes" {
  description = "JWT token lifetime in minutes."
  type        = number
}

variable "admin_username" {
  description = "Admin username."
  type        = string
}

variable "student1_username" {
  description = "First student username."
  type        = string
}

variable "student2_username" {
  description = "Second student username."
  type        = string
}

variable "secret_arns" {
  description = "Secrets Manager ARNs for backend runtime secrets."
  type = object({
    database_url      = string
    jwt_secret        = string
    admin_password    = string
    student1_password = string
    student2_password = string
  })
}

