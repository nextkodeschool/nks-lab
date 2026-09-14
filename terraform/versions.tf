terraform {
  required_version = ">= 1.6.0"

  # GitHub Actions passes backend config during terraform init.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

