# Discord Quota Bot

🤖 Bot Discord dédié au suivi des quotas Codex multi-comptes.

## ✨ Fonctionnalités

- 📊 Lecture du quota de chaque compte via `codex app-server`
- 🔄 Rafraîchissement automatique
- 💬 Publication dans un salon Discord
- 👥 Support multi-comptes sans intervention manuelle
- 🔒 Aucune écriture dans `SwitchCodexApp`

## 🚀 Installation

```bash
git clone https://github.com/Grow1nly/Discord_Quota_Bot.git
cd Discord_Quota_Bot
npm install
```

## ⚙️ Configuration

### `.env`

```env
DISCORD_TOKEN=ton_bot_token
QUOTA_CHANNEL_ID=id_du_salon
SOURCE_CODEX_HOME=C:\Users\leola\.codex
REFRESH_INTERVAL_MS=60000
ACCOUNT_CONCURRENCY=2
```

### Variables

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DISCORD_TOKEN` | Token bot Discord (requis) | - |
| `QUOTA_CHANNEL_ID` | ID du salon pour les messages | - |
| `SOURCE_CODEX_HOME` | Dossier Codex principal | `%USERPROFILE%\.codex` |
| `REFRESH_INTERVAL_MS` | Intervalle de rafraîchissement | 60000ms |
| `ACCOUNT_CONCURRENCY` | Lectures parallèles | 2 |

## ▶️ Lancement

```bash
npm start
```

## 📂 Structure

```
src/
├── bot.js          # Bot Discord principal
├── index.js        # Point d'entrée
├── config.js       # Chargement des variables d'environnement
├── codexRpc.js     # Communication avec codex.cmd
├── discordView.js  # Construction des messages Discord
├── format.js       # Formatage des données
└── stateStore.js   # Stockage de l'état du dashboard

data/runtime/      # Dossiers temporaires (exclus de git)
```

## 📝 License

MIT