export const SITE_NAME = "SocioSquad";

export function buildTitle(title?: string | null): string {
  const t = (title ?? "").trim();
  if (!t || t === SITE_NAME) return SITE_NAME;
  return `${t} | ${SITE_NAME}`;
}

export function truncateDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s.,;:!-]+$/, "")}…`;
}

export function absoluteUrl(pathOrUrl: string, origin: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = origin.replace(/\/+$/, "");
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${p}`;
}
