#!/bin/bash

# ==============================================================================
# CONFIGURADOR NGINX + DOMINIO PARA THUNNUS (Amazon Linux 2023 / EC2)
# Uso: ./configure_nginx.sh [tu-dominio.com] [puerto-app]
# ==============================================================================

set -euo pipefail

APP_PORT="${2:-4321}"
SERVER_NAME="${1:-}"

echo "--- 🚀 CONFIGURADOR NGINX PARA THUNNUS ---"
echo "    Puerto de la app: $APP_PORT"

# ==============================================================================
# 0. VALIDACIONES
# ==============================================================================
if [ "$(id -u)" -eq 0 ]; then
    echo "❌ No ejecutes como root. Usa ec2-user con sudo."
    exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
    echo "--- Instalando nginx ---"
    sudo yum install -y nginx
else
    echo "✅ nginx ya instalado: $(nginx -v 2>&1 | awk '{print $3}')"
fi

# ==============================================================================
# 1. OBTENER IP PÚBLICA AUTOMÁTICAMENTE (IMDSv2)
# ==============================================================================
echo "--- Obteniendo IP pública de la instancia ---"
IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
if [ -n "$IMDS_TOKEN" ]; then
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
else
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || true)
fi
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s -4 ifconfig.me || curl -s -4 ipinfo.io/ip || echo "IP.DESCONOCIDA")
fi
echo "    IP pública detectada: $PUBLIC_IP"

# ==============================================================================
# 2. PREGUNTAR POR DOMINIO SI NO VIENE COMO ARGUMENTO
# ==============================================================================
if [ -z "$SERVER_NAME" ]; then
    echo ""
    echo "======================================================================"
    echo " 🌐 CONFIGURACIÓN DE DOMINIO"
    echo "======================================================================"
    echo "Tienes un dominio apuntando a la IP $PUBLIC_IP ?"
    echo "  - Escribe el dominio (ej: phish.ejemplo.com) para usar HTTPS con Let's Encrypt."
    echo "  - Deja vacío (ENTER) para servir solo por IP (sin HTTPS)."
    read -r -p "Dominio: " SERVER_NAME
    SERVER_NAME="${SERVER_NAME// /}"
fi

# ==============================================================================
# 3. GENERAR CONFIG NGINX
# ==============================================================================
echo "--- Generando configuración nginx ---"

if [ -n "$SERVER_NAME" ]; then
    echo "    Usando dominio: $SERVER_NAME"
    echo "    ⚠️  Asegúrate de que $SERVER_NAME apunte a la IP $PUBLIC_IP"
    echo "    (registro A en tu DNS) ANTES de continuar, o el certificado fallará."
    echo ""
    read -r -p "¿Ya está el registro A apuntando? [s/N]: " confirm
    if [ "${confirm,,}" != "s" ]; then
        echo "❌ Sin registro A no se puede emitir HTTPS. Ejecútalo de nuevo cuando esté listo."
        echo "   Mientras tanto puedes usar la IP o volver a correr el script."
        exit 1
    fi
fi

CONF_PATH="/etc/nginx/conf.d/thunnus.conf"
SERVER_BLOCK=""

if [ -n "$SERVER_NAME" ]; then
    SERVER_BLOCK="
    server_name $SERVER_NAME www.$SERVER_NAME;
"
else
    SERVER_BLOCK="
    server_name $PUBLIC_IP _;
"
fi

echo "--- Escribiendo $CONF_PATH ---"
sudo tee "$CONF_PATH" >/dev/null <<EOF
# Thunnus - reverse proxy (generado por configure_nginx.sh)
upstream thunnus_app {
    server 127.0.0.1:$APP_PORT;
    keepalive 32;
}

# ====== HTTP (redirige a HTTPS si hay dominio) ======
server {
    listen 80;
    server_name ${SERVER_NAME:-_};

    # Para permitir payloads grandes (credenciales/fotos)
    client_max_body_size 25M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://thunnus_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

# Reiniciar nginx para validar sintaxis
echo "--- Validando y arrancando nginx ---"
sudo nginx -t
sudo systemctl enable nginx >/dev/null 2>&1 || true
sudo systemctl restart nginx

# ==============================================================================
# 4. HTTPS CON LET'S ENCRYPT (solo si hay dominio)
# ==============================================================================
if [ -n "$SERVER_NAME" ]; then
    echo ""
    echo "--- Configurando HTTPS con Let's Encrypt ---"
    if ! command -v certbot >/dev/null 2>&1; then
        sudo yum install -y certbot python3-certbot-nginx
    fi

    sudo mkdir -p /var/www/certbot

    # Emitir certificado
    if sudo certbot --nginx -d "$SERVER_NAME" -d "www.$SERVER_NAME" --non-interactive --agree-tos --redirect --register-unsafely-without-email; then
        echo "✅ Certificado emitido y redirección HTTPS activada."
    else
        echo "⚠️  Certbot falló. Verifica que el registro A de $SERVER_NAME apunte a $PUBLIC_IP"
        echo "    y que el puerto 80 esté abierto en el Security Group."
    fi

    # Renovación automática
    echo "--- Programando renovación automática del certificado ---"
    sudo tee /etc/systemd/system/certbot-renew.timer >/dev/null <<'EOF'
[Unit]
Description=Renovar certificados Let's Encrypt cada 12h

[Timer]
OnBootSec=5min
OnCalendar=*-*-* 0,12:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
    sudo tee /etc/systemd/system/certbot-renew.service >/dev/null <<'EOF'
[Unit]
Description=Renovar certificados Let's Encrypt

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable --now certbot-renew.timer >/dev/null 2>&1 || true
    echo "✅ Renovación automática activada."
fi

# ==============================================================================
# 5. FIREWALL (Amazon Linux usa Security Groups, pero por si acaso)
# ==============================================================================
echo "--- Configurando firewall (si está activo) ---"
if command -v firewall-cmd >/dev/null 2>&1 && sudo systemctl is-active firewalld >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
    sudo firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
    sudo firewall-cmd --reload >/dev/null 2>&1 || true
    echo "✅ Firewall actualizado (HTTP/HTTPS)."
else
    echo "ℹ️  firewalld no está activo (EC2 usa Security Groups en AWS)."
fi

# ==============================================================================
# 6. RESUMEN FINAL
# ==============================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "✅ NGINX CONFIGURADO"
echo "----------------------------------------------------------------------"
if [ -n "$SERVER_NAME" ]; then
    URL="https://$SERVER_NAME"
    echo "  URL:        $URL"
    echo "  Redirige:   $URL -> http://127.0.0.1:$APP_PORT"
else
    URL="http://$PUBLIC_IP"
    echo "  URL:        $URL (sin HTTPS)"
    echo "  Redirige:   $URL -> http://127.0.0.1:$APP_PORT"
fi
echo ""
echo "  IMPORTANTE — Security Group en AWS Console:"
echo "    → Asegúrate de abrir puertos 80 (HTTP) y 443 (HTTPS) en tu instancia."
echo ""
echo "  Para levantar Thunnus con PM2:"
echo "    pm2 start dist/server/entry.mjs --name thunnus --env PORT=$APP_PORT"
echo "    pm2 save && pm2 startup"
echo "----------------------------------------------------------------------"
