data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"]
}

resource "tls_private_key" "private-key" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "aws_key_pair" "vxstream-ec2-key-pair" {
  key_name   = "vxstream-ec2-key-pair"
  public_key = tls_private_key.private-key.public_key_openssh
}

# Creating a security group to restrict/allow inbound connectivity
resource "aws_security_group" "vxstream-network-security-group" {
  name        = "vxstream-network-security-group"
  description = "Allow TLS inbound traffic"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["86.7.178.0/24"]
  }
  ingress {
    description = "http"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["86.7.178.0/24"]
  }
  ingress {
    description = "custom_inbound"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["86.7.178.0/24"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_instance" "node-js-server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  vpc_security_group_ids = [aws_security_group.vxstream-network-security-group.id]

  tags = {
    Name = "vxstream-node-js-server"
  }

  user_data = <<-EOT
    #!/bin/bash
    sudo apt update
    sudo apt install -y nodejs
    sudo apt install -y npm

    cat << 'EOF' > /home/ubuntu/server.js
    ${file("/home/gbanys/repositories/VideoStreamingApp/server.js")}
    EOF

    sudo npm install express http socket.io
    sudo nohup node /home/ubuntu/server.js &
  EOT

  key_name = aws_key_pair.vxstream-ec2-key-pair.key_name
}


output "private_key_pem" {
  value     = tls_private_key.private-key.private_key_pem
  sensitive = true
}