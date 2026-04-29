const { Client, Events, GatewayIntentBits } = require('discord.js');
const { loadConfig } = require('./config');
const { buildDashboardPayload } = require('./discordView');
const { collectQuotaSnapshot } = require('./quotaService');
const { loadState, saveState } = require('./stateStore');

class QuotaBot {
  constructor(config) {
    this.config = config;
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
    this.lastPayloadJson = null;
    this.refreshTimer = null;
    this.refreshing = false;
  }

  async start() {
    this.client.once(Events.ClientReady, async (readyClient) => {
      console.log(`[Discord_Quota_Bot] Connecte: ${readyClient.user.tag}`);
      await this.refreshNow();
      this.scheduleNextRefresh();
    });

    await this.client.login(this.config.token);
  }

  stop() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.client.destroy();
  }

  scheduleNextRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refreshNow().catch((error) => {
        console.error('[Discord_Quota_Bot] Echec refresh:', error);
        this.scheduleNextRefresh();
      });
    }, this.config.refreshIntervalMs);
  }

  async refreshNow() {
    if (this.refreshing) {
      return;
    }

    this.refreshing = true;
    try {
      const snapshot = await collectQuotaSnapshot({
        sourceCodexHome: this.config.sourceCodexHome,
        accountConcurrency: this.config.accountConcurrency,
      });

      const channel = await this.client.channels.fetch(this.config.quotaChannelId);
      if (!channel?.isTextBased()) {
        throw new Error(`Salon invalide ou inaccessible: ${this.config.quotaChannelId}`);
      }

      const message = await this.ensureMonitorMessage(channel);
      const payload = buildDashboardPayload(snapshot);
      const payloadJson = JSON.stringify({
        content: payload.content,
        embeds: payload.embeds.map((embed) => embed.toJSON()),
      });

      if (this.lastPayloadJson !== payloadJson) {
        await message.edit(payload);
        this.lastPayloadJson = payloadJson;
      }

      console.log(
        `[Discord_Quota_Bot] Dashboard quota mis a jour. comptes=${snapshot.accounts.length}`
      );
    } finally {
      this.refreshing = false;
      this.scheduleNextRefresh();
    }
  }

  async ensureMonitorMessage(channel) {
    const state = loadState();
    if (state.messageId && state.channelId === channel.id) {
      try {
        return await channel.messages.fetch(state.messageId);
      } catch {
        // recreate below
      }
    }

    const message = await channel.send('Initialisation du tableau de bord quota...');
    saveState({
      messageId: message.id,
      channelId: channel.id,
    });
    return message;
  }
}

async function startBot() {
  const config = loadConfig();
  const bot = new QuotaBot(config);

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await bot.start();
}

module.exports = {
  QuotaBot,
  startBot,
};
