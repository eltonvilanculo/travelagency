const PAYEN_DEFAULT_BASE_URL = "https://payen.gestaosistema.com/v1";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getPayenBaseUrl(): string {
  const configured = process.env.PAYEN_BASE_URL?.trim();
  return normalizeBaseUrl(configured || PAYEN_DEFAULT_BASE_URL);
}

/** Zambi Tour uses exactly one Payen application/API key for every
 * reservation — never a key per tour, per agent, or per release. */
export function getPayenApiKey(): string {
  const key = process.env.PAYEN_API_KEY?.trim();
  if (!key) throw new Error("PAYEN_API_KEY is not set");
  return key;
}
