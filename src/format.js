function formatRemaining(ms) {
  if (!Number.isFinite(ms)) {
    return 'inconnu';
  }

  if (ms <= 0) {
    return 'reset atteint';
  }

  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}j ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value}%` : 'n/a';
}

function formatDateTime(value) {
  if (!Number.isFinite(value) && typeof value !== 'string') {
    return 'inconnu';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'inconnu';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

module.exports = {
  formatDateTime,
  formatPercent,
  formatRemaining,
};
