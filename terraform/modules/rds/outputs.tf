output "rds_endpoint" {
  description = "RDS endpoint address."
  value       = aws_db_instance.this.address
}

output "rds_port" {
  description = "RDS PostgreSQL port."
  value       = aws_db_instance.this.port
}

