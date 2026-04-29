const { EmbedBuilder } = require('discord.js');
const { formatDateTime, formatPercent, formatRemaining } = require('./format');

function buildAccountField(account) {
  const usedPercent = Number(account?.quotaSnapshot?.primary?.usedPercent);
  const resetsAtSeconds = Number(account?.quotaSnapshot?.primary?.resetsAt);
  const resetMs = Number.isFinite(resetsAtSeconds) ? resetsAtSeconds * 1000 : null;
  const remainingMs = Number.isFinite(resetMs) ? Math.max(0, resetMs - Date.now()) : null;
  const remainingPercent = Number.isFinite(usedPercent) ? 100 - usedPercent : null;
  const lines = [
    `Quota: ${remainingPercent !== null ? `${remainingPercent}%` : 'n/a'}`,
    `Reset: ${formatDateTime(resetMs)}`,
    `Reste: ${formatRemaining(remainingMs)}`,
    `Plan: ${account.planType || 'inconnu'}`,
    `Etat: ${account.quotaStatus}${account.isActive ? ' | actif' : ''}`,
  ];

  if (account.quotaError) {
    lines.push(`Erreur: ${account.quotaError}`);
  }

  return lines.join('\n');
}

function buildDashboardPayload(snapshot) {
  const total = snapshot.accounts.length;
  const available = snapshot.accounts.filter((account) => {
    const usedPercent = Number(account?.quotaSnapshot?.primary?.usedPercent);
    return Number.isFinite(usedPercent) && (100 - usedPercent) > 0;
  }).length;

  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle('Quota Codex multi-comptes')
    .setDescription(
      [
        'Lecture directe du multi-compte Codex via des homes temporaires dedies.',
        `Comptes OK: ${available}/${total}`,
        `Derniere collecte: ${formatDateTime(snapshot.collectedAtIso)}`,
      ].join('\n')
    )
    .setTimestamp(new Date(snapshot.collectedAtIso));

  if (total === 0) {
    embed.addFields({
      name: 'Etat',
      value: 'Aucun compte trouve dans accounts.json',
      inline: false,
    });
  } else {
    for (const account of snapshot.accounts.slice(0, 25)) {
      embed.addFields({
        name: `${account.isActive ? '[ACTIF] ' : ''}${account.email || account.accountId}`,
        value: buildAccountField(account),
        inline: false,
      });
    }
  }

  return {
    content: '',
    embeds: [embed],
    components: [],
  };
}

module.exports = {
  buildDashboardPayload,
};
