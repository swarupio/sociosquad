const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

type NominatimResult = { lat?: string; lon?: string };

export async function geocodeLocation(
  location: string,
  city: string
): Promise<{ latitude: number | null; longitude: number | null }> {
  const parts = [location?.trim(), city?.trim()].filter(Boolean);
  if (parts.length === 0) {
    return { latitude: null, longitude: null };
  }

  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("q", parts.join(", "));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "SocioSquad-App/1.0",
      },
    });

    if (!res.ok) {
      return { latitude: null, longitude: null };
    }

    const data = (await res.json()) as NominatimResult[];
    const first = data[0];
    if (first?.lat == null || first?.lon == null) {
      return { latitude: null, longitude: null };
    }

    const latitude = Number.parseFloat(first.lat);
    const longitude = Number.parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { latitude: null, longitude: null };
    }

    return { latitude, longitude };
  } catch {
    return { latitude: null, longitude: null };
  }
}
