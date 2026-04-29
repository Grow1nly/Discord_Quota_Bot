# Discord Quota Bot

Bot Discord dédié au suivi des quotas Codex multi-comptes.

## Objectif

- Aucun suivi cooldown manuel
- Aucune écriture dans `SwitchCodexApp`
- Aucune bascule du compte actif source
- Lecture du quota de chaque compte via `codex app-server`

## Fonctionnement

1. Lit `C:\Users\leola\.codex\accounts.json`
2. Pour chaque compte, copie son `auth.json` dans un home temporaire local au bot
3. Lance `codex.cmd app-server` avec ce home temporaire
4. Appelle `account/rateLimits/read`
5. Publie dans Discord :
   - Pourcentage de quota restant
   - Date/heure de reset
   - Temps restant avant reset

## Variables `.env`

- `DISCORD_TOKEN` (requis - à remplacer par votre propre token)
- `QUOTA_CHANNEL_ID` (ID du salon Discord pour les messages)
- `SOURCE_CODEX_HOME` (dossier Codex principal)
- `REFRESH_INTERVAL_MS` (fréquence de rafraîchissement, défaut: 60000ms)
- `ACCOUNT_CONCURRENCY` (concorrence de lecture des comptes, défaut: 2)

## Lancement

```powershell
npm install
npm start
```

## Sécurité

⚠️ **IMPORTANT** : Ne jamais committer le fichier `.env` avec vos tokens réels !

Le fichier `.env` est ignoré par git via `.gitignore`. Créez votre propre fichier `.env` avec vos propres valeurs après le clone.

## Structure

```
src/
├── bot.js          # Bot Discord principal
├── index.js        # Point d'entrée
├── config.js       # Chargement des variables d'environnement
├── codexRpc.js     # Communication avec codex.cmd
├── discordView.js  # Construction des messages Discord
├── format.js       # Formattage des données
└── stateStore.js   # Stockage de l'état du dashboard

data/runtime/      # Dossiers temporaires (exclus de git)

.env.example        # Modèle de configuration (sans token)
```

## Dépendances

- discord.js
- dotenv
