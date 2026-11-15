# Mal formateado a propósito: sirve para demostrar el chequeo de terraform fmt.
resource "aws_vpc" "main" {
cidr_block = "10.0.0.0/16"
  enable_dns_hostnames   =  true
    tags = {
  Owner = "platform"
      Environment = "dev"
 CostCenter = "1234"
  }
}
