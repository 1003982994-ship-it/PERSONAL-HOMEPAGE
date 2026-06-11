import { kv } from "@vercel/kv";

const WORKBENCH_KEY = "teacher-workbench.backup.v1";

function hasCloudStore() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function isAuthorized(req, res) {
  const expectedToken = process.env.WORKBENCH_SYNC_TOKEN;
  if (!expectedToken) return true;

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (token === expectedToken) return true;

  res.status(401).send("同步口令不正确。请在设置页填写 Vercel 环境变量 WORKBENCH_SYNC_TOKEN 对应的口令。");
  return false;
}

function normalizeBody(body) {
  if (typeof body === "string") return JSON.parse(body || "{}");
  return body || {};
}

function normalizeBackup(body) {
  const backup = normalizeBody(body);
  if (!Array.isArray(backup.records)) {
    throw new Error("缺少 records 数组");
  }

  return {
    records: backup.records,
    weeklySummaries: backup.weeklySummaries && typeof backup.weeklySummaries === "object" && !Array.isArray(backup.weeklySummaries) ? backup.weeklySummaries : {},
    backupMetadata: backup.backupMetadata || null,
    updatedAt: new Date().toISOString(),
  };
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Vary", "Origin");
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!hasCloudStore()) {
    res.status(503).send("云端存储尚未配置。请在 Vercel 项目中添加 KV 数据库后重新部署。");
    return;
  }

  if (!isAuthorized(req, res)) return;

  try {
    if (req.method === "GET") {
      const backup = await kv.get(WORKBENCH_KEY);
      res.status(200).json(backup || null);
      return;
    }

    if (req.method === "PUT") {
      const backup = normalizeBackup(req.body);
      await kv.set(WORKBENCH_KEY, backup);
      res.status(200).json({ ok: true, updatedAt: backup.updatedAt });
      return;
    }

    res.setHeader("Allow", "GET, PUT");
    res.status(405).send("Method Not Allowed");
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : "云端同步失败");
  }
}
