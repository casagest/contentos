#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://contentos-project.vercel.app";
const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * @typedef {Object} SyntheticCheck
 * @property {string} name
 * @property {"GET"|"POST"} method
 * @property {string} path
 * @property {number[]} expectedStatuses
 * @property {number} warnMs
 * @property {number} critMs
 * @property {Record<string,string>} [headers]
 * @property {unknown} [body]
 */

/**
 * @typedef {Object} CheckResult
 * @property {string} name
 * @property {string} path
 * @property {string} method
 * @property {number|null} status
 * @property {number} latencyMs
 * @property {"ok"|"warn"|"critical"} severity
 * @property {string} reason
 */

function resolveBaseUrl() {
  const raw = process.env.MONITOR_BASE_URL?.trim();
  return raw || DEFAULT_BASE_URL;
}

function resolveTimeoutMs() {
  const parsed = Number(process.env.MONITOR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed < 1000) return DEFAULT_TIMEOUT_MS;
  return parsed;
}

function deepHealthHeaders() {
  const token = process.env.MONITORING_API_KEY?.trim();
  if (!token) return undefined;
  return { "x-monitoring-key": token };
}

/**
 * @param {SyntheticCheck} check
 * @param {string} baseUrl
 * @param {number} timeoutMs
 * @returns {Promise<CheckResult>}
 */
async function runCheck(check, baseUrl, timeoutMs) {
  const url = `${baseUrl.replace(/\/+$/, "")}${check.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: check.method,
      headers: {
        "Content-Type": "application/json",
        ...(check.headers || {}),
      },
      body: check.body ? JSON.stringify(check.body) : undefined,
      redirect: "follow",
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;
    const statusOk = check.expectedStatuses.includes(response.status);
    const latencyCritical = latencyMs > check.critMs;
    const latencyWarn = latencyMs > check.warnMs;

    let severity = "ok";
    let reason = "ok";

    if (!statusOk) {
      severity = "critical";
      reason = `unexpected_status:${response.status}`;
    } else if (latencyCritical) {
      severity = "critical";
      reason = `latency_critical:${latencyMs}ms>${check.critMs}ms`;
    } else if (latencyWarn) {
      severity = "warn";
      reason = `latency_warn:${latencyMs}ms>${check.warnMs}ms`;
    }

    return {
      name: check.name,
      path: check.path,
      method: check.method,
      status: response.status,
      latencyMs,
      severity,
      reason,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      name: check.name,
      path: check.path,
      method: check.method,
      status: null,
      latencyMs,
      severity: "critical",
      reason: isAbort ? `timeout>${timeoutMs}ms` : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildChecks() {
  /** @type {SyntheticCheck[]} */
  const checks = [
    {
      name: "home_page",
      method: "GET",
      path: "/",
      expectedStatuses: [200],
      warnMs: 1200,
      critMs: 3000,
    },
    {
      name: "health_liveness",
      method: "GET",
      path: "/api/health",
      expectedStatuses: [200],
      warnMs: 300,
      critMs: 800,
    },
    {
      name: "ai_score_auth_gate",
      method: "POST",
      path: "/api/ai/score",
      expectedStatuses: [401],
      warnMs: 900,
      critMs: 2500,
      body: { content: "smoke", platform: "facebook" },
    },
    {
      name: "ai_generate_auth_gate",
      method: "POST",
      path: "/api/ai/generate",
      expectedStatuses: [401],
      warnMs: 900,
      critMs: 2500,
      body: {
        input: "smoke",
        platforms: ["facebook"],
        objective: "engagement",
      },
    },
    {
      name: "ai_coach_auth_gate",
      method: "POST",
      path: "/api/ai/coach",
      expectedStatuses: [401],
      warnMs: 900,
      critMs: 2500,
      body: { question: "smoke" },
    },
    {
      name: "ai_braindump_auth_gate",
      method: "POST",
      path: "/api/ai/braindump",
      expectedStatuses: [401],
      warnMs: 1100,
      critMs: 3000,
      body: {
        rawInput: "smoke",
        platforms: ["facebook"],
        objective: "engagement",
      },
    },
    {
      name: "ai_research_auth_gate",
      method: "POST",
      path: "/api/ai/research",
      expectedStatuses: [401],
      warnMs: 900,
      critMs: 2500,
      body: {
        url: "https://example.com",
        platform: "facebook",
      },
    },
  ];

  const headers = deepHealthHeaders();
  if (headers) {
    checks.push({
      name: "health_readiness_deep",
      method: "GET",
      path: "/api/health?deep=1",
      expectedStatuses: [200],
      warnMs: 900,
      critMs: 2500,
      headers,
    });
  }

  return checks;
}

function printResults(baseUrl, results) {
  console.log(`Synthetic monitor target: ${baseUrl}`);
  console.log("");
  for (const row of results) {
    const statusLabel = row.status === null ? "n/a" : String(row.status);
    console.log(
      `[${row.severity.toUpperCase()}] ${row.name} ${row.method} ${row.path} status=${statusLabel} latency=${row.latencyMs}ms reason=${row.reason}`
    );
  }
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = resolveTimeoutMs();
  const checks = buildChecks();

  const results = [];
  for (const check of checks) {
    // Sequential execution keeps logs deterministic and easier to debug.
    // Monitoring frequency is high enough, speed here is not critical.
    // eslint-disable-next-line no-await-in-loop
    const row = await runCheck(check, baseUrl, timeoutMs);
    results.push(row);
  }

  printResults(baseUrl, results);

  const criticalCount = results.filter((r) => r.severity === "critical").length;
  const warnCount = results.filter((r) => r.severity === "warn").length;

  console.log("");
  console.log(
    `Summary: total=${results.length} critical=${criticalCount} warn=${warnCount}`
  );

  if (criticalCount > 0) {
    process.exitCode = 1;
    return;
  }
}

main().catch((error) => {
  console.error("Synthetic monitoring runner crashed:", error);
  process.exit(1);
});
