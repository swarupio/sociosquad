export type JsonLdObject = Record<string, unknown>;

/** JSON.stringify then escape "<" so the output can never close a script tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028))
    .join("\\u2028")
    .split(String.fromCharCode(0x2029))
    .join("\\u2029");
}

const IST = "+05:30";

/** Returns ISO string; appends the Asia/Kolkata offset when only local date/time is known. */
export function toIsoWithIst(date?: string | null, time?: string | null): string | undefined {
  if (!date) return undefined;
  const d = date.trim();
  if (/T/.test(d)) {
    return /(Z|[+-]\d{2}:?\d{2})$/.test(d) ? d : `${d}${IST}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return undefined;
  if (!time) return d;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(time.trim());
  if (!m) return d;
  const hh = m[1].padStart(2, "0");
  return `${d}T${hh}:${m[2]}:${m[3] ?? "00"}${IST}`;
}

export interface OpportunityLike {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  end_date?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_virtual?: boolean | null;
  cancelled?: boolean | null;
  image_url?: string | null;
  organization_name?: string | null;
  organization_id?: string | null;
}

const validCoord = (n: unknown, max: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= max;

export function volunteerOpportunityJsonLd(opp: OpportunityLike, origin: string): JsonLdObject {
  const base = origin.replace(/\/+$/, "");
  const virtual = !!opp.is_virtual;
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: opp.title,
    url: `${base}/opportunities/${opp.id}`,
    eventAttendanceMode: virtual
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: opp.cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
  };
  if (opp.description) data.description = opp.description;
  const start = toIsoWithIst(opp.date, opp.start_time);
  if (start) data.startDate = start;
  const end = toIsoWithIst(opp.end_date ?? opp.date, opp.end_time);
  if (end && start && end !== start) data.endDate = end;
  if (opp.image_url) data.image = opp.image_url;

  if (!virtual) {
    const place: JsonLdObject = { "@type": "Place", name: opp.location || opp.city || "Venue" };
    const address: JsonLdObject = { "@type": "PostalAddress", addressCountry: "IN" };
    if (opp.location) address.streetAddress = opp.location;
    if (opp.city) address.addressLocality = opp.city;
    if (opp.state) address.addressRegion = opp.state;
    place.address = address;
    if (validCoord(opp.latitude, 90) && validCoord(opp.longitude, 180)) {
      place.geo = { "@type": "GeoCoordinates", latitude: opp.latitude, longitude: opp.longitude };
    }
    data.location = place;
  } else {
    data.location = { "@type": "VirtualLocation", url: `${base}/opportunities/${opp.id}` };
  }

  if (opp.organization_name) {
    const org: JsonLdObject = { "@type": "Organization", name: opp.organization_name };
    if (opp.organization_id) org.url = `${base}/organizations/${opp.organization_id}`;
    data.organizer = org;
  }
  return data;
}

export function organizationJsonLd(
  org: { name: string; description?: string | null; logo?: string | null; url?: string | null; sameAs?: string[] },
  origin: string,
): JsonLdObject {
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: org.url || origin.replace(/\/+$/, ""),
  };
  if (org.description) data.description = org.description;
  if (org.logo) data.logo = org.logo;
  if (org.sameAs?.length) data.sameAs = org.sameAs;
  return data;
}

export function websiteJsonLd(origin: string, name = "SocioSquad"): JsonLdObject {
  const base = origin.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/opportunities?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], origin: string): JsonLdObject {
  const base = origin.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: /^https?:\/\//.test(it.path) ? it.path : `${base}${it.path.startsWith("/") ? "" : "/"}${it.path}`,
    })),
  };
}
