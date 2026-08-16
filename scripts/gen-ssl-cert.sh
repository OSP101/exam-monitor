#!/usr/bin/env bash
set -euo pipefail

# Generates a self-signed TLS certificate for the nginx HTTPS entrypoint.
#
# Use this while the server is accessed by internal IP only (no domain yet).
# Browsers will show a warning because the cert is not issued by a CA — this is
# expected. Once you have a real domain pointing at this server, switch to
# Let's Encrypt instead (instructions at the end) and delete certs/.
#
# Usage:  ./scripts/gen-ssl-cert.sh [IP_OR_HOSTNAME...]
#   Example: ./scripts/gen-ssl-cert.sh 10.10.0.5 exam-server

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTS_DIR="$DIR/certs"
mkdir -p "$CERTS_DIR"

CERT_FILE="$CERTS_DIR/fullchain.pem"
KEY_FILE="$CERTS_DIR/privkey.pem"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "Certificate already exists in $CERTS_DIR (delete the files to regenerate)."
    exit 0
fi

# Default SANs + any IPs/hostnames passed on the command line.
SANS=("DNS:localhost" "IP:127.0.0.1")
for arg in "$@"; do
    if [[ "$arg" =~ ^[0-9.]+$ ]]; then
        SANS+=("IP:$arg")
    else
        SANS+=("DNS:$arg")
    fi
done
SAN_CSV=$(IFS=,; echo "${SANS[*]}")

openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 3650 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" \
    -subj "/CN=exam-monitor" \
    -addext "subjectAltName=$SAN_CSV" \
    -addext "basicConstraints=critical,CA:FALSE" \
    -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
    -addext "extendedKeyUsage=serverAuth" >/dev/null 2>&1

echo "Self-signed certificate generated: $CERTS_DIR"
echo
echo "Start / reload nginx to pick it up:"
echo "    docker compose up -d nginx"
echo
echo "--- Later: switching to Let's Encrypt (needs a real domain) ---"
echo "1. Point a DNS A record at this server, e.g. exam.kku.ac.th"
echo "2. Issue the certificate via webroot:"
echo "    docker run --rm -it \\"
echo "      -v $CERTS_DIR:/etc/letsencrypt/live/exam-monitor \\"
echo "      -v $DIR/certbot-www:/var/www/certbot \\"
echo "      certbot/certbot certonly --webroot -w /var/www/certbot \\"
echo "      -d exam.kku.ac.th --email you@example.com"
echo "3. Run the same command again regularly (or via cron) to renew."
echo "4. Add 'server_name exam.kku.ac.th;' to nginx/nginx.conf."
echo "5. docker compose restart nginx"
