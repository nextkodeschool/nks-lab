locals {
  # Common tags help students identify lab resources in AWS.
  common_tags = {
    Project     = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

