variable "app_name" {
  description = "Application name for resource names."
  type        = string
}

variable "environment" {
  description = "Environment name for resource names."
  type        = string
}

variable "vpc_id" {
  description = "VPC where security groups are created."
  type        = string
}

