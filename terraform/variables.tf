variable "aws_region" {
  description = "AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of the existing AWS EC2 Key Pair (without .pem extension)"
  type        = string
}

variable "app_port" {
  description = "Port on which the health service runs"
  type        = number
  default     = 3000
}
variable "vpc_id" {
  description = "Existing VPC for the deployment"
  type        = string
}
variable "subnet_id" {
  description = "Existing public subnet with a route to an Internet Gateway"
  type        = string
}
variable "ssh_allowed_cidrs" {
  description = "Administrator and fixed CI runner IPv4 CIDRs; do not open SSH to everyone"
  type        = list(string)
  validation {
    condition     = length(var.ssh_allowed_cidrs) > 0 && alltrue([for c in var.ssh_allowed_cidrs : can(cidrnetmask(c)) && c != "0.0.0.0/0"])
    error_message = "Provide explicit IPv4 CIDRs; unrestricted SSH is not supported."
  }
}
