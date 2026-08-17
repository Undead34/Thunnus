#!/bin/bash

# Detener ante errores graves
set -euo pipefail

echo "--- 🚀 INICIANDO INSTALACIÓN AUTOMÁTICA DE THUNNUS ---"

# ==============================================================================
# 0. VALIDACIONES PREVIAS Y SWAP
# ==============================================================================

MIN_SWAP_GB=2
MIN_SWAP_KB=$((MIN_SWAP_GB * 1024 * 1024))
MIN_RAM_KB=$((512 * 1024))

echo "--- 0. Comprobando requisitos del sistema ---"

# Evitar instalar nvm/pnpm como root (se rompe la ruta de PM2)
if [ "$(id -u)" -eq 0 ]; then
    echo "❌ ERROR: No ejecutes este script como root."
    echo "   Usa un usuario normal (ej: ec2-user) con privilegios sudo:"
    echo "   ./install_auto.sh"
    exit 1
fi

# Verificar acceso sudo
if ! sudo -n true 2>/dev/null; then
    echo "⚠️  Este script necesita sudo. Se te pedirá la contraseña si hace falta."
fi

# Comprobar memoria RAM (swap nos protege cuando el build es pesado)
RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
if [ -n "${RAM_KB:-}" ] && [ "$RAM_KB" -lt "$MIN_RAM_KB" ]; then
    echo "ℹ️  Poca RAM detectada ($((RAM_KB / 1024)) MB), el swap es importante aquí."
fi

# Comprobar/crear swap de al menos 2GB
ensure_swap() {
    TOTAL_SWAP_KB=$(free -k | awk '/^Swap:/ {print $2}')
    if [ "${TOTAL_SWAP_KB:-0}" -ge "$MIN_SWAP_KB" ]; then
        echo "✅ Swap suficiente: $((TOTAL_SWAP_KB / 1024)) MB"
        return 0
    fi

    echo "⚠️  Swap actual: ${TOTAL_SWAP_KB:-0} KB — se necesita al menos ${MIN_SWAP_GB} GB."
    SWAPFILE="/swapfile"

    if swapon --show=NAME --noheadings | grep -qx "$SWAPFILE"; then
        echo "ℹ️  $SWAPFILE está activo pero es pequeño, se desactiva para recrearlo."
        sudo swapoff "$SWAPFILE" 2>/dev/null || true
    fi

    echo "ℹ️  Creando swap de ${MIN_SWAP_GB} GB en $SWAPFILE (puede tardar unos segundos)..."
    sudo fallocate -l "${MIN_SWAP_GB}G" "$SWAPFILE" 2>/dev/null \
        || sudo dd if=/dev/zero of="$SWAPFILE" bs=1M count=$((MIN_SWAP_GB * 1024)) status=progress
    sudo chmod 600 "$SWAPFILE"
    sudo mkswap "$SWAPFILE"
    sudo swapon "$SWAPFILE"

    # Persistir en /etc/fstab si no está ya
    if ! sudo grep -qs "^$SWAPFILE " /etc/fstab; then
        echo "$SWAPFILE none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
        echo "✅ Swap persistente añadido a /etc/fstab"
    fi

    NEW_SWAP_KB=$(free -k | awk '/^Swap:/ {print $2}')
    echo "✅ Swap configurado: $((NEW_SWAP_KB / 1024)) MB"
}

ensure_swap

# ==============================================================================
# 1. INSTALACIÓN DE SISTEMA Y HERRAMIENTAS
# ==============================================================================
echo "--- 1. Actualizando sistema e instalando dependencias ---"
sudo yum update -y
sudo yum install git -y

# Instalar NVM
if ! command -v nvm >/dev/null 2>&1 && [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
else
    echo "ℹ️  NVM ya está instalado en $HOME/.nvm"
fi

# Cargar NVM (siempre)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalar Node 24 (si no está)
if ! ls -d "$NVM_DIR"/versions/node/v24.* >/dev/null 2>&1; then
    nvm install 24
fi
nvm use 24 >/dev/null 2>&1 || true

if ! command -v node >/dev/null 2>&1; then
    nvm install 24
    nvm use 24
fi
node --version

# Instalar PNPM (via corepack) y PM2
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
case ":$PATH:" in
  *":$PNPM_HOME/bin:"*) ;;
  *) export PATH="$PNPM_HOME/bin:$PATH" ;;
esac

corepack enable pnpm 2>/dev/null || npm install -g pnpm@latest

# Asegurar que pnpm exista en PATH, si no, instalarlo vía npm
if ! command -v pnpm >/dev/null 2>&1; then
    echo "ℹ️  pnpm no está en PATH, instalando globalmente con npm..."
    npm install -g pnpm@latest
    export PATH="$(npm config get prefix)/bin:$PATH"
fi
pnpm --version

if ! command -v pm2 >/dev/null 2>&1; then
    pnpm install -g pm2@latest
else
    echo "ℹ️  PM2 ya instalado: $(pm2 --version)"
fi

# ==============================================================================
# 2. CLONADO Y DEPENDENCIAS
# ==============================================================================
echo "--- 2. Preparando repositorio ---"
if [ -d "Thunnus" ]; then
    echo "Carpeta existente detectada, limpiando..."
    rm -rf Thunnus
fi

if ! git clone --depth 1 https://github.com/Undead34/Thunnus; then
    echo "❌ ERROR: Falló el clonado del repositorio. Revisa la URL y tu conexión."
    exit 1
fi
cd Thunnus/

echo "--- Instalando paquetes (pnpm install) ---"
# NODE_OPTIONS con más memoria ayuda en instancias pequeñas
NODE_OPTIONS="--max-old-space-size=2048" pnpm install

# ==============================================================================
# 3. CONFIGURACIÓN CLIENTE (src/firebase/client.ts)
# ==============================================================================
echo ""
echo "======================================================================"
echo " 📝 CONFIGURACIÓN 1: CLIENTE FIREBASE"
echo "======================================================================"
echo "Pega el bloque 'const firebaseConfig = { ... };' completo."
echo "Presiona ENTER y luego Ctrl+D al terminar."
echo "----------------------------------------------------------------------"

cat > firebase_config_temp.txt

if [ -s firebase_config_temp.txt ]; then
    cat <<EOF > src/firebase/client.ts
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
$(cat firebase_config_temp.txt)

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
EOF
    echo "✅ src/firebase/client.ts actualizado."
    rm firebase_config_temp.txt
else
    echo "⚠️ No se pegó configuración, se deja el archivo original."
fi

# ==============================================================================
# 4. CONFIGURACIÓN SERVIDOR (.env y Service Account)
# ==============================================================================
echo ""
echo "======================================================================"
echo " 🔐 CONFIGURACIÓN 2: VARIABLES DE ENTORNO (.env)"
echo "======================================================================"
echo "Pega el contenido de tu archivo .env completo."
echo "Si usas FIREBASE_SERVICE_ACCOUNT_PATH, no te preocupes por la ruta,"
echo "la arreglaremos en el siguiente paso."
echo "Presiona ENTER y luego Ctrl+D al terminar."
echo "----------------------------------------------------------------------"

# Limpiamos el .env anterior si existe
rm -f .env
cat > .env

# Verificamos si usaron la variable de path
if grep -q "FIREBASE_SERVICE_ACCOUNT_PATH" .env; then
    echo ""
    echo "👀 Se detectó 'FIREBASE_SERVICE_ACCOUNT_PATH' en el .env"
    echo "======================================================================"
    echo " 📂 CONFIGURACIÓN 3: ARCHIVO JSON DE SERVICE ACCOUNT"
    echo "======================================================================"
    echo "Por favor, pega el CONTENIDO JSON de tu llave de servicio (service-account.json)."
    echo "El script lo guardará y vinculará automáticamente."
    echo "Presiona ENTER y luego Ctrl+D al terminar."
    echo "----------------------------------------------------------------------"

    # Guardamos el JSON
    cat > service-account.json
    
    # Obtenemos la ruta absoluta actual
    CURRENT_DIR=$(pwd)
    JSON_PATH="$CURRENT_DIR/service-account.json"

    # Reemplazamos la línea en el .env forzando la ruta absoluta que acabamos de crear
    # Usamos sed con '|' como delimitador para no romper la ruta
    sed -i "s|^FIREBASE_SERVICE_ACCOUNT_PATH=.*|FIREBASE_SERVICE_ACCOUNT_PATH=$JSON_PATH|" .env

    echo ""
    echo "✅ Archivo 'service-account.json' creado."
    echo "✅ Archivo .env actualizado apuntando a: $JSON_PATH"

else
    echo ""
    echo "ℹ️ No se detectó configuración de archivo físico, usando variables de entorno estándar."
fi

# ==============================================================================
# 5. FINALIZACIÓN
# ==============================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "🎉 INSTALACIÓN Y CONFIGURACIÓN COMPLETADA"
echo "----------------------------------------------------------------------"
echo "Siguientes pasos:"
echo "   1. Verifica el archivo .env (aplicará las variables al reiniciar sesión)"
echo "   2. Ejecuta: pnpm build"
echo "   3. Inicia con PM2: pm2 start dist/server/entry.mjs --name thunnus"
echo "----------------------------------------------------------------------"
