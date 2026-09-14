variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-south-1"
}

variable "app_name" {
  description = "Short name used in AWS resource names."
  type        = string
  default     = "nextkode-deploylab"
}

variable "environment" {
  description = "Environment name for tags and resource names."
  type        = string
  default     = "lab"
}

variable "vpc_cidr" {
  description = "CIDR block for the lab VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "postgres_db" {
  description = "PostgreSQL database name."
  type        = string
  default     = "nextkode"
}

variable "postgres_user" {
  description = "PostgreSQL admin username."
  type        = string
  default     = "nextkode"
}

variable "postgres_password" {
  description = "PostgreSQL password from GitHub Actions Secrets."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret from GitHub Actions Secrets."
  type        = string
  sensitive   = true
}

variable "admin_username" {
  description = "Admin login username."
  type        = string
  default     = "admin"
}

variable "admin_password" {
  description = "Admin password from GitHub Actions Secrets."
  type        = string
  sensitive   = true
}

variable "student1_username" {
  description = "First student login username."
  type        = string
  default     = "student1"
}

variable "student1_password" {
  description = "First student password from GitHub Actions Secrets."
  type        = string
  sensitive   = true
}

variable "student2_username" {
  description = "Second student login username."
  type        = string
  default     = "student2"
}

variable "student2_password" {
  description = "Second student password from GitHub Actions Secrets."
  type        = string
  sensitive   = true
}

variable "jwt_expire_minutes" {
  description = "JWT token lifetime in minutes."
  type        = number
  default     = 60
}

variable "db_instance_class" {
  description = "RDS instance size for the lab."
  type        = string
  default     = "db.t4g.micro"
}

variable "backend_image_tag" {
  description = "ECR backend image tag used by ECS."
  type        = string
  default     = "latest"
}

variable "backend_desired_count" {
  description = "Set to 0 before pushing the first backend image, then 1 to run the app."
  type        = number
  default     = 0
}

