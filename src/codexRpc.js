const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

function getCodexCommand() {
  const appData = process.env.APPDATA || '';
  const candidate = path.join(appData, 'npm', 'codex.cmd');
  if (candidate && fs.existsSync(candidate)) {
    return candidate;
  }

  throw new Error('[Discord_Quota_Bot] codex.cmd introuvable dans %APPDATA%\\npm.');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return;
  }

  spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

async function invokeCodexRpc(codexHome, timeoutMs = 20000) {
  const codexCommand = getCodexCommand();
  const child = spawn('cmd.exe', ['/d', '/s', '/c', `"${codexCommand}" app-server`], {
    cwd: codexHome,
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    windowsVerbatimArguments: true,
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let nextId = 1;
  let stdoutBuffer = '';
  let stderrBuffer = '';
  const pending = new Map();
  let childExitError = null;

  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        try {
          const message = JSON.parse(line);
          if (message && Object.prototype.hasOwnProperty.call(message, 'id')) {
            const handler = pending.get(message.id);
            if (handler) {
              pending.delete(message.id);
              if (message.error) {
                handler.reject(new Error(message.error.message || 'RPC error'));
              } else {
                handler.resolve(message.result);
              }
            }
          }
        } catch {
          // Ignore non JSON lines.
        }
      }

      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  child.stderr.on('data', (chunk) => {
    stderrBuffer += chunk;
  });

  child.once('exit', (code) => {
    if (pending.size === 0) {
      return;
    }

    childExitError = new Error(stderrBuffer.trim() || `codex app-server exited with code ${code}`);
    for (const { reject } of pending.values()) {
      reject(childExitError);
    }
    pending.clear();
  });

  const send = (payload) => {
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  };

  const request = (method, params) => {
    const id = nextId++;
    const promise = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
    send({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });
    return promise;
  };

  const timeoutRef = setTimeout(() => {
    for (const { reject } of pending.values()) {
      reject(new Error(`RPC timeout after ${timeoutMs}ms`));
    }
    pending.clear();
    child.kill();
  }, timeoutMs);

  try {
    const exitPromise = new Promise((resolve) => {
      child.once('error', (error) => {
        childExitError = error;
        resolve();
      });
      child.once('exit', () => {
        resolve();
      });
    });

    const initializeResult = await request('initialize', {
      clientInfo: {
        name: 'discord-quota-bot',
        version: '1.0.0',
      },
      capabilities: {
        experimentalApi: true,
      },
    });

    send({
      jsonrpc: '2.0',
      method: 'initialized',
    });

    const quota = await request('account/rateLimits/read', null);
    const account = await request('account/read', { refreshToken: false });

    try {
      child.stdin.end();
    } catch {}

    await Promise.race([exitPromise, wait(1000)]);

    if (childExitError && pending.size > 0) {
      throw childExitError;
    }

    return {
      initializeResult,
      quota,
      account,
      stderr: stderrBuffer.trim() || null,
    };
  } finally {
    clearTimeout(timeoutRef);
    killProcessTree(child.pid);
  }
}

function selectQuotaBucket(quotaPayload) {
  if (!quotaPayload || typeof quotaPayload !== 'object') {
    return null;
  }

  if (quotaPayload.rateLimitsByLimitId?.codex) {
    return quotaPayload.rateLimitsByLimitId.codex;
  }

  if (quotaPayload.rateLimits) {
    return quotaPayload.rateLimits;
  }

  return null;
}

function extractAccountEmail(accountPayload, fallbackEmail = null) {
  return (
    accountPayload?.account?.email
    || accountPayload?.account?.profile?.email
    || fallbackEmail
    || null
  );
}

function createEphemeralCodexHome(rootDir, sourceState, sourceAccount) {
  fs.mkdirSync(rootDir, { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'accounts', sourceAccount.storageId), { recursive: true });

  const sourceAuthPath = path.join(
    sourceState.sourceCodexHome,
    'accounts',
    sourceAccount.storageId,
    'auth.json'
  );

  if (!fs.existsSync(sourceAuthPath)) {
    throw new Error(`auth.json introuvable pour storageId=${sourceAccount.storageId}`);
  }

  fs.copyFileSync(sourceAuthPath, path.join(rootDir, 'auth.json'));
  fs.copyFileSync(sourceAuthPath, path.join(rootDir, 'accounts', sourceAccount.storageId, 'auth.json'));

  writeJsonFile(path.join(rootDir, 'accounts.json'), {
    activeAccountId: sourceAccount.accountId,
    accounts: [
      {
        accountId: sourceAccount.accountId,
        storageId: sourceAccount.storageId,
        authMode: sourceAccount.authMode || 'chatgpt',
        email: sourceAccount.email || null,
        planType: sourceAccount.planType || null,
      },
    ],
  });
}

async function fetchQuotaForAccount(sourceState, sourceAccount, runtimeBaseDir) {
  const tempDir = path.join(runtimeBaseDir, sourceAccount.accountId);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    createEphemeralCodexHome(tempDir, sourceState, sourceAccount);
    const rpcResult = await invokeCodexRpc(tempDir);
    const bucket = selectQuotaBucket(rpcResult.quota);

    return {
      accountId: sourceAccount.accountId,
      storageId: sourceAccount.storageId,
      email: extractAccountEmail(rpcResult.account, sourceAccount.email),
      planType: bucket?.planType || sourceAccount.planType || null,
      quotaStatus: 'ready',
      quotaError: null,
      quotaSnapshot: bucket,
      quotaUpdatedAtIso: new Date().toISOString(),
      isActive: sourceState.activeAccountId === sourceAccount.accountId,
    };
  } catch (error) {
    return {
      accountId: sourceAccount.accountId,
      storageId: sourceAccount.storageId,
      email: sourceAccount.email || null,
      planType: sourceAccount.planType || null,
      quotaStatus: 'error',
      quotaError: error.message,
      quotaSnapshot: sourceAccount.quotaSnapshot || null,
      quotaUpdatedAtIso: new Date().toISOString(),
      isActive: sourceState.activeAccountId === sourceAccount.accountId,
    };
  }
}

function loadSourceState(sourceCodexHome) {
  const accountsFile = path.join(sourceCodexHome, 'accounts.json');
  if (!fs.existsSync(accountsFile)) {
    throw new Error(`[Discord_Quota_Bot] accounts.json introuvable: ${accountsFile}`);
  }

  const parsed = readJsonFile(accountsFile);
  return {
    sourceCodexHome,
    activeAccountId: typeof parsed?.activeAccountId === 'string' ? parsed.activeAccountId : null,
    accounts: Array.isArray(parsed?.accounts) ? parsed.accounts : [],
  };
}

module.exports = {
  fetchQuotaForAccount,
  loadSourceState,
};
