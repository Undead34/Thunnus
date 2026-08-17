#!/bin/bash

# Detener ante errores graves
set -e

echo "--- 🚀 INICIANDO INSTALACIÓN AUTOMÁTICA DE THUNNUS ---"

# ==============================================================================
# 1. INSTALACIÓN DE SISTEMA Y HERRAMIENTAS
# ==============================================================================
echo "--- 1. Actualizando sistema e instalando dependencias ---"
sudo yum update -y
sudo yum install git -y

# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Cargar NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalar Node 24
nvm install 24
nvm use 24

# Instalar PNPM y PM2
corepack enable pnpm
pnpm setup
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
pnpm install -g pm2@latest

# ==============================================================================
# 2. CLONADO Y DEPENDENCIAS
# ==============================================================================
echo "--- 2. Preparando repositorio ---"
if [ -d "Thunnus" ]; then
    echo "Carpeta existente detectada, limpiando..."
    rm -rf Thunnus
fi

git clone --depth 1 https://github.com/Undead34/Thunnus
cd Thunnus/

echo "--- Instalando paquetes (pnpm install) ---"
pnpm install

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
echo "Para iniciar el servidor, ejecuta:"
echo "   pnpm dev   (Modo desarrollo)"
echo "   pnpm build && pnpm start (Producción)"
echo "----------------------------------------------------------------------"
