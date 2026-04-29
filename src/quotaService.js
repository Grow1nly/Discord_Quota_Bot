const fs = require('node:fs');
const path = require('node:path');
const { fetchQuotaForAccount, loadSourceState } = require('./codexRpc');

const RUNTIME_DIR = path.join(__dirname, '..', 'data', 'runtime');

function compareAccounts(left, right) {
  const leftPercent = Number(left?.quotaSnapshot?.primary?.usedPercent);
  const rightPercent = Number(right?.quotaSnapshot?.primary?.usedPercent);

  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  if (Number.isFinite(leftPercent) && Number.isFinite(rightPercent) && leftPercent !== rightPercent) {
    return leftPercent - rightPercent;
  }

  return String(left.email || '').localeCompare(String(right.email || ''));
}

async function mapWithConcurrency(items, concurrency, iteratee) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIndex = cursor++;
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function collectQuotaSnapshot({ sourceCodexHome, accountConcurrency }) {
  const sourceState = loadSourceState(sourceCodexHome);
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  const accounts = await mapWithConcurrency(
    sourceState.accounts,
    accountConcurrency,
    (account) => fetchQuotaForAccount(sourceState, account, RUNTIME_DIR)
  );

  return {
    activeAccountId: sourceState.activeAccountId,
    collectedAtIso: new Date().toISOString(),
    accounts: accounts.sort(compareAccounts),
  };
}

module.exports = {
  collectQuotaSnapshot,
};
