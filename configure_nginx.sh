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
# 3. GENERAR CONFIG NGINX (DNS-aware)
# ==============================================================================
echo "--- Generando configuración nginx ---"

DOMAINS=()          # Lista de dominios que resuelven hacia nuestra IP
CERT_DOMAINS=""     # Flags -d para certbot

# Resuelve un dominio y devuelve las IPs a las que apunta
resolve_domain() {
    local domain="$1"
    if command -v dig >/dev/null 2>&1; then
        dig +short A "$domain" | grep -E '^[0-9]+\.' || true
    elif command -v getent >/dev/null 2>&1; then
        getent ahostsv4 "$domain" 2>/dev/null | awk '{print $1}' | sort -u
    else
        python3 - "$domain" <<'PY' 2>/dev/null || true
import socket, sys
try:
    print(socket.gethostbyname(sys.argv[1]))
except Exception:
    pass
PY
    fi
}

if [ -n "$SERVER_NAME" ]; then
    echo "    Usando dominio: $SERVER_NAME"
    echo "    Verificando qué dominios resuelven hacia $PUBLIC_IP..."

    for candidate in "$SERVER_NAME" "www.$SERVER_NAME"; do
        IPS=$(resolve_domain "$candidate")
        if [ -z "$IPS" ]; then
            echo "    ⚠️  $candidate no tiene registro A (NXDOMAIN) — se omite."
            continue
        fi
        MATCHES=$(echo "$IPS" | grep -qx "$PUBLIC_IP" && echo yes || echo no)
        if [ "$MATCHES" = "yes" ]; then
            DOMAINS+=("$candidate")
            echo "    ✅ $candidate → $PUBLIC_IP (OK)"
        else
            echo "    ⚠️  $candidate apunta a [$IPS], no a $PUBLIC_IP — se omite."
        fi
    done

    if [ "${#DOMAINS[@]}" -eq 0 ]; then
        echo ""
        echo "❌ Ningún dominio resuelve hacia la IP $PUBLIC_IP."
        echo "   Crea el registro A en tu DNS apuntando a $PUBLIC_IP y vuelve a ejecutar:"
        echo "   ./configure_nginx.sh $SERVER_NAME"
        exit 1
    fi

    echo ""
    echo "    Dominios válidos que se usarán: ${DOMAINS[*]}"
else
    echo "    Sin dominio — sirviendo solo por IP: $PUBLIC_IP"
fi

CONF_PATH="/etc/nginx/conf.d/thunnus.conf"
SERVER_NAMES="${DOMAINS[*]:-}"
SERVER_BLOCK=""

if [ ${#DOMAINS[@]} -gt 0 ]; then
    SERVER_BLOCK="
    server_name ${DOMAINS[*]};
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
    server_name ${SERVER_NAMES:-_};

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
# 4. HTTPS CON LET'S ENCRYPT (solo si hay dominio válido)
# ==============================================================================
if [ "${#DOMAINS[@]}" -gt 0 ]; then
    echo ""
    echo "--- Configurando HTTPS con Let's Encrypt ---"
    if ! command -v certbot >/dev/null 2>&1; then
        sudo yum install -y certbot python3-certbot-nginx
    fi

    sudo mkdir -p /var/www/certbot

    # Construir flags -d para cada dominio validado
    for d in "${DOMAINS[@]}"; do
        CERT_DOMAINS+=" -d $d"
    done

    # Emitir certificado solo para los dominios que resolvieron
    if sudo certbot --nginx $CERT_DOMAINS --non-interactive --agree-tos --redirect --register-unsafely-without-email; then
        echo "✅ Certificado emitido y redirección HTTPS activada."
    else
        echo "⚠️  Certbot falló. Verifica que los registros A apunten a $PUBLIC_IP"
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
if [ "${#DOMAINS[@]}" -gt 0 ]; then
    URL="https://${DOMAINS[0]}"
    echo "  URL:        $URL"
    echo "  Dominios:   ${DOMAINS[*]}"
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
echo "  Para levantar Thunnus con PM2 (dentro de la carpeta Thunnus/):"
echo "    cd ~/Thunnus && pm2 start dist/server/entry.mjs --name thunnus --env PORT=$APP_PORT"
echo "    pm2 save && pm2 startup"
echo "----------------------------------------------------------------------"
