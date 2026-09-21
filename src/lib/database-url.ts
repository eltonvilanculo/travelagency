/**
 * Makes PostgreSQL's SSL behavior explicit for node-postgres/libpq.
 * Existing sslmode or uselibpqcompat parameters are respected verbatim.
 */
export function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  if (/[?&]sslmode=|[?&]uselibpqcompat=/i.test(value)) return value;
  return `${value}${value.includes("?") ? "&" : "?"}sslmode=verify-full`;
}
