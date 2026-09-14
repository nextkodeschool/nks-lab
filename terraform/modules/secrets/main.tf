locals {
  # Backend reads this URL from Secrets Manager at task startup.
  database_url = "postgresql://${var.postgres_user}:${urlencode(var.postgres_password)}@${var.rds_endpoint}:5432/${var.postgres_db}"
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.app_name}/database-url"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.app_name}/jwt-secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "admin_password" {
  name                    = "${var.app_name}/admin-password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "admin_password" {
  secret_id     = aws_secretsmanager_secret.admin_password.id
  secret_string = var.admin_password
}

resource "aws_secretsmanager_secret" "student1_password" {
  name                    = "${var.app_name}/student1-password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "student1_password" {
  secret_id     = aws_secretsmanager_secret.student1_password.id
  secret_string = var.student1_password
}

resource "aws_secretsmanager_secret" "student2_password" {
  name                    = "${var.app_name}/student2-password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "student2_password" {
  secret_id     = aws_secretsmanager_secret.student2_password.id
  secret_string = var.student2_password
}

