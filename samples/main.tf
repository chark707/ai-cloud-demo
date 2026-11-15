# Terraform de ejemplo con problemas A PROPÓSITO, para la demo.

resource "aws_security_group" "bastion" {
  name = "bastion-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Owner = "platform"
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "demo-logs-bucket"
}

resource "aws_db_instance" "app" {
  identifier          = "app-db"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  publicly_accessible = true

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
