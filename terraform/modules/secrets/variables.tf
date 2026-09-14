variable "app_name" {
  description = "Application name for secret paths."
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

variable "rds_endpoint" {
  description = "RDS endpoint address."
  type        = string
}

variable "jwt_secret" {
  description = "JWT signing secret."
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "Admin password."
  type        = string
  sensitive   = true
}

variable "student1_password" {
  description = "First student password."
  type        = string
  sensitive   = true
}

variable "student2_password" {
  description = "Second student password."
  type        = string
  sensitive   = true
}

