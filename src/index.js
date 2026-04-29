const { startBot } = require('./bot');

startBot().catch((error) => {
  console.error('[Discord_Quota_Bot] Erreur fatale:', error);
  process.exit(1);
});
