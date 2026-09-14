output "alb_security_group_id" {
  description = "Security group for the API load balancer."
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security group for ECS backend tasks."
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Security group for RDS PostgreSQL."
  value       = aws_security_group.rds.id
}

