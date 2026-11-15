# Terraform de ejemplo con problemas A PROPÓSITO, para la demo.

variable "admin_cidrs" {
  description = "CIDRs autorizados a entrar por SSH al bastion (IP del equipo o VPN)"
  type        = list(string)
  default     = ["10.0.0.0/8"]
}

resource "aws_security_group" "bastion" {
  name = "bastion-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidrs
  }

  tags = {
    Owner       = "platform"
    Environment = "dev"
    CostCenter  = "1234"
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "demo-logs-bucket"

  tags = {
    Owner       = "platform"
    Environment = "dev"
    CostCenter  = "1234"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_db_instance" "app" {
  identifier              = "app-db"
  engine                  = "postgres"
  instance_class          = "db.t3.micro"
  publicly_accessible     = false
  storage_encrypted       = true
  backup_retention_period = 7

  tags = {
    Owner       = "platform"
    Environment = "dev"
    CostCenter  = "1234"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  tags = {
    Owner       = "platform"
    Environment = "dev"
    CostCenter  = "1234"
  }
}
