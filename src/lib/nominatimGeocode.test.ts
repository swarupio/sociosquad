import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type GeocodeModule = typeof import("./nominatimGeocode");

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("geocodeLocation", () => {
  let mod: GeocodeModule;
  let fetchMock: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
    mod = await import("./nominatimGeocode");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns existing coords without fetching", async () => {
    const res = await mod.geocodeLocation("Park", "Pune", { existing: { latitude: 1, longitude: 2 } });
    expect(res).toEqual({ latitude: 1, longitude: 2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null coords for empty input without fetching", async () => {
    const res = await mod.geocodeLocation("  ", "");
    expect(res).toEqual({ latitude: null, longitude: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the cache on the second call", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ lat: "18.5", lon: "73.8" }]));
    const first = await mod.geocodeLocation("Central Park", "Pune");
    expect(first).toEqual({ latitude: 18.5, longitude: 73.8 });
    const second = await mod.geocodeLocation("central  park", "PUNE");
    expect(second).toEqual({ latitude: 18.5, longitude: 73.8 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops further requests after a 429", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    const first = await mod.geocodeLocation("Place A", "City");
    expect(first).toEqual({ latitude: null, longitude: null });
    const second = await mod.geocodeLocation("Place B", "City");
    expect(second).toEqual({ latitude: null, longitude: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
