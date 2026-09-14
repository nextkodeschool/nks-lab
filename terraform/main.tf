module "network" {
  source = "./modules/network"

  app_name    = var.app_name
  cidr_block  = var.vpc_cidr
  environment = var.environment
}

module "security" {
  source = "./modules/security"

  app_name    = var.app_name
  vpc_id      = module.network.vpc_id
  environment = var.environment
}

module "ecr" {
  source = "./modules/ecr"

  app_name    = var.app_name
  environment = var.environment
}

module "rds" {
  source = "./modules/rds"

  app_name              = var.app_name
  environment           = var.environment
  private_subnet_ids    = module.network.private_subnet_ids
  rds_security_group_id = module.security.rds_security_group_id
  postgres_db           = var.postgres_db
  postgres_user         = var.postgres_user
  postgres_password     = var.postgres_password
  db_instance_class     = var.db_instance_class
}

module "secrets" {
  source = "./modules/secrets"

  app_name          = var.app_name
  postgres_db       = var.postgres_db
  postgres_user     = var.postgres_user
  postgres_password = var.postgres_password
  rds_endpoint      = module.rds.rds_endpoint
  jwt_secret        = var.jwt_secret
  admin_password    = var.admin_password
  student1_password = var.student1_password
  student2_password = var.student2_password
}

module "ecs_backend" {
  source = "./modules/ecs_backend"

  app_name              = var.app_name
  aws_region            = var.aws_region
  environment           = var.environment
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  ecs_security_group_id = module.security.ecs_security_group_id
  alb_security_group_id = module.security.alb_security_group_id
  backend_image         = "${module.ecr.backend_repository_url}:${var.backend_image_tag}"
  desired_count         = var.backend_desired_count
  jwt_expire_minutes    = var.jwt_expire_minutes
  admin_username        = var.admin_username
  student1_username     = var.student1_username
  student2_username     = var.student2_username
  secret_arns           = module.secrets.secret_arns
}

module "frontend_hosting" {
  source = "./modules/frontend_hosting"

  app_name    = var.app_name
  environment = var.environment
}
