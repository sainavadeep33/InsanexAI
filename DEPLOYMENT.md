# InsanexAI — Production Deployment Guide (AWS EC2 & navadeepsai.tech)

This guide documents the complete step-by-step setup to deploy **InsanexAI** on an AWS EC2 Ubuntu instance connected to your domain **navadeepsai.tech**.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |               AWS EC2                 |
                      |          IP: 32.198.34.242            |
                      |                                       |
User Browser -------->|  Nginx (Port 80/443 SSL via Certbot)  |
(navadeepsai.tech)    |   |                                   |
                      |   +---> Static Files (/var/www/.../dist)
                      |   |                                   |
                      |   +---> Reverse Proxy (/api/) --------+
                      |           (SSE streaming unbuffered)  |
                      |                       |               |
                      |                       v               |
                      |              FastAPI (Uvicorn)        |
                      |               Port 127.0.0.1:8000     |
                      |               Systemd Service         |
                      |                       |               |
                      |              +--------+--------+      |
                      |              |                 |      |
                      |          SQLite DB       Gemini API   |
                      |         (Encrypted)      (Outbound)   |
                      +---------------------------------------+
```

---

## 1. AWS Security Group Prerequisites
Before connecting, ensure your EC2 instance's Security Group has the following inbound rules:
- **SSH (Port 22)**: TCP, Source `My IP` (recommended) or `0.0.0.0/0`
- **HTTP (Port 80)**: TCP, Source `0.0.0.0/0` (for Let's Encrypt SSL challenge and HTTP redirection)
- **HTTPS (Port 443)**: TCP, Source `0.0.0.0/0` (for secure public traffic)

---

## 2. Connect to EC2
Open your terminal (PowerShell or Bash) and connect using your EC2 key pair:
```bash
chmod 400 WebServer.pem  # (or your key name in Downloads)
ssh -i WebServer.pem ubuntu@32.198.34.242
```

---

## 3. Server Package Installation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv python3-dev nginx certbot python3-certbot-nginx git curl

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 4. Deploy Application Code
```bash
# Recommended deployment directory
sudo mkdir -p /var/www/insanexai
sudo chown -R ubuntu:ubuntu /var/www/insanexai

# Clone from GitHub or transfer files:
# git clone <YOUR_REPO_URL> /var/www/insanexai
cd /var/www/insanexai
```

---

## 5. Backend Configuration & Dependencies
```bash
cd /var/www/insanexai/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn

# Configure production environment variables
cp .env.example .env
nano .env
```
Inside `.env`, populate your keys:
```ini
GEMINI_API_KEY=AIzaSy...
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGINS=https://navadeepsai.tech,https://www.navadeepsai.tech
```

---

## 6. Frontend Production Build
```bash
cd /var/www/insanexai/frontend
npm install
npm run build
# This compiles into /var/www/insanexai/frontend/dist ready for Nginx
```

---

## 7. Systemd Service (Autostart & Supervision)
Create the systemd service file:
```bash
sudo nano /etc/systemd/system/insanexai.service
```
Paste the following:
```ini
[Unit]
Description=InsanexAI FastAPI Application Service
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/insanexai/backend
Environment="PATH=/var/www/insanexai/backend/venv/bin"
ExecStart=/var/www/insanexai/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable insanexai
sudo systemctl start insanexai
sudo systemctl status insanexai
```

---

## 8. Nginx Configuration (Reverse Proxy & Streaming Support)
Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/insanexai
```
Paste the following:
```nginx
server {
    listen 80;
    server_name navadeepsai.tech www.navadeepsai.tech;

    # Frontend Single-Page Application (Vite dist)
    root /var/www/insanexai/frontend/dist;
    index index.html;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API & SSE Streaming Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical for Server-Sent Events (SSE) streaming without buffering:
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        chunked_transfer_encoding on;
    }

    # Backward compatibility with /chat and /health endpoints
    location ~ ^/(chat|health|docs|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
    }
}
```

Enable the configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/insanexai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 9. SSL Certificate (HTTPS via Certbot)
Obtain and install a free Let's Encrypt SSL certificate:
```bash
sudo certbot --nginx -d navadeepsai.tech -d www.navadeepsai.tech
```
Certbot will configure automatic renewal and HTTPS redirection.

---

## 10. Database Backup Strategy
Set up a daily automated backup for the SQLite database:
```bash
# In crontab (crontab -e):
0 3 * * * cp /var/www/insanexai/backend/insanexai.db /var/backups/insanexai_$(date +\%Y\%m\%d).db
```
