# Quant Trading Dashboard - TODO

## Core Features
- [x] Dashboard principale con overview stato sistema
- [x] Visualizzazione real-time ultimo segnale generato
- [x] Monitoraggio regime di mercato con storico transizioni
- [x] Grafici 3D interattivi superfici ottimizzazione (TP/SL)
- [x] Pannello risk management con statistiche giornaliere
- [x] Storico completo segnali con filtri
- [x] Feature importance visualization
- [x] Grafici performance (equity curve, P&L distribution)
- [x] Pannello configurazione parametri sistema
- [x] Sistema notifiche in-app

## Backend
- [x] Database schema per trading signals, positions, performance
- [x] API endpoints per dati real-time
- [x] API endpoints per storico e statistiche
- [x] API endpoints per configurazione
- [x] Generazione dati simulati per demo

## UI/UX
- [x] Design dark theme professionale per trading
- [x] Layout responsive con sidebar navigation
- [x] Componenti riutilizzabili per metriche
- [x] Animazioni e transizioni fluide


## Integrazione Dati Reali
- [x] Ricercare API Tradytics o alternative per dati opzionari
- [x] Integrare Databento per dati futures CME reali
- [x] Integrare provider dati opzionari per VIX e GEX
- [x] Creare repository GitHub
- [x] Pushare progetto su GitHub
- [x] Preparare script deployment per DigitalOcean
- [x] Documentazione deployment


## Autenticazione Standalone
- [x] Rimuovere dipendenza OAuth Manus
- [x] Implementare auth JWT standalone con bcrypt
- [x] Creare pagine login e registrazione
- [x] Aggiornare codice su GitHub
- [ ] Redeploy su DigitalOcean


## Sistema Dati Real-Time
- [ ] Implementare servizio raccolta dati Databento (ES futures tick-by-tick)
- [ ] Implementare raccolta dati VIX da Yahoo Finance
- [ ] Implementare raccolta dati opzioni SPY per calcolo GEX
- [ ] Implementare calcolo GEX interno
- [ ] Implementare modello HMM per regime detection
- [ ] Implementare generazione segnali AI
- [ ] Configurare processo background sul server
- [ ] Testare sistema con dati live
