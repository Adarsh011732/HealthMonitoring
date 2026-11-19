output "instance_id" {
  description = "ID of the created EC2 instance"
  value       = aws_instance.app_server.id
}

output "instance_public_ip" {
  description = "Public IP address of EC2 instance (set this as EC2_HOST secret in GitHub)"
  value       = aws_eip.app.public_ip
}

output "instance_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.app_server.public_dns
}

output "health_check_url" {
  description = "Live health check endpoint URL"
  value       = "http://${aws_eip.app.public_ip}/health"
}
