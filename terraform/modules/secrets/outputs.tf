output "secret_arns" {
  description = "Secret ARNs consumed by ECS."
  value = {
    database_url      = aws_secretsmanager_secret.database_url.arn
    jwt_secret        = aws_secretsmanager_secret.jwt_secret.arn
    admin_password    = aws_secretsmanager_secret.admin_password.arn
    student1_password = aws_secretsmanager_secret.student1_password.arn
    student2_password = aws_secretsmanager_secret.student2_password.arn
  }
}

