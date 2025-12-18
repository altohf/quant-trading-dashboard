# Quant Trading Dashboard - Deployment Guide

Questa guida spiega come deployare il Quant Trading Dashboard su un droplet DigitalOcean.

## Prerequisiti

- Un droplet DigitalOcean con Ubuntu 22.04 LTS
- Accesso SSH al droplet
- Un database MySQL/TiDB (può essere locale o cloud)
- La tua chiave API Databento

## Passo 1: Configurazione del Server

### 1.1 Connettiti al Droplet

```bash
ssh root@your-droplet-ip
```

### 1.2 Esegui lo Script di Setup

```bash
# Scarica e esegui lo script di setup
curl -fsSL https://raw.githubusercontent.com/altohf/quant-trading-dashboard/main/deploy/setup-digitalocean.sh | bash
```

Oppure manualmente:

```bash
# Aggiorna il sistema
apt-get update && apt-get upgrade -y

# Installa Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Installa pnpm e PM2
npm install -g pnpm pm2

# Installa Nginx
apt-get install -y nginx git
```

## Passo 2: Clona il Repository

```bash
mkdir -p /var/www/quant-dashboard
cd /var/www/quant-dashboard
git clone https://github.com/altohf/quant-trading-dashboard.git .
```

## Passo 3: Configura le Variabili d'Ambiente

Crea il file `.env` nella root del progetto:

```bash
nano .env
```

Aggiungi le seguenti variabili (sostituisci i valori):

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/quant_dashboard

# Security
JWT_SECRET=genera-una-stringa-casuale-di-64-caratteri

# Databento API
DATABENTO_API_KEY=db-la-tua-chiave-api

# Application
NODE_ENV=production
PORT=3000

# OAuth (opzionale, per autenticazione Manus)
VITE_APP_ID=il-tuo-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# Owner
OWNER_OPEN_ID=il-tuo-open-id
OWNER_NAME=Il Tuo Nome

# Branding
VITE_APP_TITLE=Quant Trading Dashboard
VITE_APP_LOGO=/logo.svg
```

## Passo 4: Installa le Dipendenze e Build

```bash
cd /var/www/quant-dashboard

# Installa le dipendenze
pnpm install

# Build per produzione
pnpm build
```

## Passo 5: Configura il Database

Se usi MySQL locale:

```bash
# Installa MySQL
apt-get install -y mysql-server

# Crea il database
mysql -u root -e "CREATE DATABASE quant_dashboard;"
mysql -u root -e "CREATE USER 'quantuser'@'localhost' IDENTIFIED BY 'your-password';"
mysql -u root -e "GRANT ALL PRIVILEGES ON quant_dashboard.* TO 'quantuser'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"
```

Esegui le migrazioni:

```bash
pnpm db:push
```

## Passo 6: Avvia l'Applicazione con PM2

```bash
# Avvia l'applicazione
pm2 start dist/index.js --name quant-dashboard

# Salva la configurazione PM2
pm2 save

# Configura l'avvio automatico
pm2 startup
```

Comandi utili PM2:

```bash
pm2 status              # Stato dell'applicazione
pm2 logs quant-dashboard # Visualizza i log
pm2 restart quant-dashboard # Riavvia
pm2 stop quant-dashboard    # Ferma
```

## Passo 7: Configura Nginx

```bash
# Copia la configurazione Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/quant-dashboard

# Modifica il server_name con il tuo dominio/IP
nano /etc/nginx/sites-available/quant-dashboard

# Abilita il sito
ln -s /etc/nginx/sites-available/quant-dashboard /etc/nginx/sites-enabled/

# Rimuovi il sito default
rm /etc/nginx/sites-enabled/default

# Testa la configurazione
nginx -t

# Riavvia Nginx
systemctl restart nginx
```

## Passo 8: Configura SSL (Opzionale ma Raccomandato)

```bash
# Installa Certbot
apt-get install -y certbot python3-certbot-nginx

# Ottieni il certificato SSL
certbot --nginx -d your-domain.com

# Il certificato si rinnova automaticamente
```

## Passo 9: Configura il Firewall

```bash
# Abilita UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Aggiornamenti

Per aggiornare l'applicazione:

```bash
cd /var/www/quant-dashboard
git pull origin main
pnpm install
pnpm build
pm2 restart quant-dashboard
```

## Troubleshooting

### L'applicazione non si avvia

```bash
# Controlla i log
pm2 logs quant-dashboard

# Verifica le variabili d'ambiente
cat .env

# Verifica la connessione al database
mysql -u quantuser -p quant_dashboard -e "SELECT 1;"
```

### Nginx restituisce 502 Bad Gateway

```bash
# Verifica che l'app sia in esecuzione
pm2 status

# Controlla i log di Nginx
tail -f /var/log/nginx/error.log
```

### Problemi di connessione al database

```bash
# Verifica che MySQL sia in esecuzione
systemctl status mysql

# Testa la connessione
mysql -u quantuser -p -h localhost quant_dashboard
```

## Monitoraggio

### Log dell'applicazione

```bash
pm2 logs quant-dashboard --lines 100
```

### Metriche di sistema

```bash
# CPU e memoria
htop

# Spazio disco
df -h

# Connessioni di rete
netstat -tlnp
```

## Backup

### Backup del database

```bash
# Crea un backup
mysqldump -u quantuser -p quant_dashboard > backup_$(date +%Y%m%d).sql

# Ripristina un backup
mysql -u quantuser -p quant_dashboard < backup_20241218.sql
```

### Backup automatico (cron)

```bash
# Aggiungi al crontab
crontab -e

# Backup giornaliero alle 3:00
0 3 * * * mysqldump -u quantuser -p'password' quant_dashboard > /var/backups/quant_dashboard_$(date +\%Y\%m\%d).sql
```

## Supporto

Per problemi o domande, apri una issue su GitHub:
https://github.com/altohf/quant-trading-dashboard/issues
