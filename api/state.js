const DEFAULT_TABLE = "app_state";
const DEFAULT_STATE_ID = "main";

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function readBody(request) {
  if (request.body && typeof request.body === "object") return Promise.resolve(request.body);
  if (typeof request.body === "string") return Promise.resolve(JSON.parse(request.body || "{}"));
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 4_000_000) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(raw ? JSON.parse(raw) : {}));
    request.on("error", reject);
  });
}

function envConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const table = process.env.KMS_STATE_TABLE || DEFAULT_TABLE;
  const stateId = process.env.KMS_STATE_ID || DEFAULT_STATE_ID;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables");
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error("Invalid KMS_STATE_TABLE");
  }

  return {
    restUrl: `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`,
    supabaseKey,
    stateId
  };
}

async function supabaseFetch(path, options = {}) {
  const { restUrl, supabaseKey } = envConfig();
  return fetch(`${restUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      ...options.headers
    }
  });
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  try {
    const { stateId } = envConfig();

    if (request.method === "GET") {
      const result = await supabaseFetch(`?id=eq.${encodeURIComponent(stateId)}&select=data,updated_at&limit=1`, {
        headers: { Accept: "application/json" }
      });
      if (!result.ok) throw new Error(`Supabase read failed: ${result.status} ${await result.text()}`);
      const rows = await result.json();
      if (!rows.length) {
        sendJson(response, 404, { data: null });
        return;
      }
      sendJson(response, 200, rows[0]);
      return;
    }

    if (request.method === "PUT") {
      const body = await readBody(request);
      if (!body || typeof body.data !== "object" || Array.isArray(body.data)) {
        sendJson(response, 400, { error: "Expected JSON body with object field: data" });
        return;
      }
      const result = await supabaseFetch("?on_conflict=id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify([{ id: stateId, data: body.data }])
      });
      if (!result.ok) throw new Error(`Supabase save failed: ${result.status} ${await result.text()}`);
      const rows = await result.json();
      sendJson(response, 200, rows[0] || { id: stateId, data: body.data });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "State sync failed" });
  }
};
