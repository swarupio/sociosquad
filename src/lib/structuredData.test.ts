import { describe, it, expect } from "vitest";
import {
  serializeJsonLd,
  toIsoWithIst,
  volunteerOpportunityJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  type JsonLdObject,
} from "./structuredData";

type J = JsonLdObject & {
  location: { geo?: { latitude: number }; };
  organizer: { name: string };
  potentialAction: { target: { urlTemplate: string } };
  itemListElement: { item: string }[];
  eventAttendanceMode: string;
  eventStatus: string;
  startDate: string;
  endDate: string;
};
const asJ = (o: JsonLdObject) => o as J;

describe("structuredData", () => {
  it("escapes script-closing sequences", () => {
    const out = serializeJsonLd({ a: "</script><script>alert(1)" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).a).toBe("</script><script>alert(1)");
  });
  it("adds IST offset to local date+time", () => {
    expect(toIsoWithIst("2026-12-01", "09:30")).toBe("2026-12-01T09:30:00+05:30");
    expect(toIsoWithIst("2026-12-01", "9:05:07")).toBe("2026-12-01T09:05:07+05:30");
    expect(toIsoWithIst("2026-12-01")).toBe("2026-12-01");
    expect(toIsoWithIst("2026-12-01T09:00:00Z")).toBe("2026-12-01T09:00:00Z");
    expect(toIsoWithIst("2026-12-01T09:00:00")).toBe("2026-12-01T09:00:00+05:30");
    expect(toIsoWithIst("garbage")).toBeUndefined();
    expect(toIsoWithIst(null)).toBeUndefined();
  });
  it("builds opportunity event", () => {
    const j = asJ(
      volunteerOpportunityJsonLd(
        {
          id: "1",
          title: "Clean",
          date: "2026-12-01",
          start_time: "09:00",
          end_time: "12:00",
          city: "Pune",
          latitude: 18.5,
          longitude: 73.8,
          organization_name: "NGO",
        },
        "https://x.com/",
      ),
    );
    expect(j["@type"]).toBe("Event");
    expect(j.startDate).toBe("2026-12-01T09:00:00+05:30");
    expect(j.endDate).toBe("2026-12-01T12:00:00+05:30");
    expect(j.location.geo?.latitude).toBe(18.5);
    expect(j.offers).toBeUndefined();
    expect(j.organizer.name).toBe("NGO");
  });
  it("omits geo when invalid and handles virtual/cancelled", () => {
    const j = asJ(volunteerOpportunityJsonLd({ id: "1", title: "T", latitude: 999, longitude: 1 }, "https://x.com"));
    expect(j.location.geo).toBeUndefined();
    const v = asJ(volunteerOpportunityJsonLd({ id: "2", title: "T", is_virtual: true, cancelled: true }, "https://x.com"));
    expect(v.eventAttendanceMode).toContain("Online");
    expect(v.eventStatus).toContain("Cancelled");
  });
  it("builds website and breadcrumb", () => {
    const w = asJ(websiteJsonLd("https://x.com"));
    expect(w.potentialAction.target.urlTemplate).toBe("https://x.com/opportunities?q={search_term_string}");
    const b = asJ(breadcrumbJsonLd([{ name: "Home", path: "/" }], "https://x.com"));
    expect(b.itemListElement[0].item).toBe("https://x.com/");
  });
});
