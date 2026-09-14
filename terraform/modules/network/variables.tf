variable "app_name" {
  description = "Application name for resource names."
  type        = string
}

variable "environment" {
  description = "Environment name for tags."
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC."
  type        = string
}

