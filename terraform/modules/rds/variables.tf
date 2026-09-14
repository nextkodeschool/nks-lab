variable "app_name" {
  description = "Application name for database names."
  type        = string
}

variable "environment" {
  description = "Environment name for resource names."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS."
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security group that allows PostgreSQL from ECS."
  type        = string
}

variable "postgres_db" {
  description = "Database name."
  type        = string
}

variable "postgres_user" {
  description = "Database username."
  type        = string
}

variable "postgres_password" {
  description = "Database password."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
}

