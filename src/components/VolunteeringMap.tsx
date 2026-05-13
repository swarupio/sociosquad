import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";

const MUMBAI_CENTER: [number, number] = [19.076, 72.8777];
const DEFAULT_ZOOM = 11;

type MapOpportunity = {
  id: string;
  title: string;
  time_commitment: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Fix default marker assets with Vite bundling (paths differ from Leaflet defaults)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type VolunteeringMapProps = {
  /** When set, the map fills the parent height (parent should set e.g. h-[600px]). */
  variant?: "default" | "fill";
};

export default function VolunteeringMap({ variant = "default" }: VolunteeringMapProps) {
  const fill = variant === "fill";
  const contentShell = fill ? "flex-1 min-h-0" : "h-[min(420px,55vh)]";
  const rootShell = fill ? "glass-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60" : "glass-card overflow-hidden rounded-2xl border border-border/60";

  const [mounted, setMounted] = useState(false);
  const [opportunities, setOpportunities] = useState<MapOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qError } = await supabase
        .from("opportunities")
        .select("id, title, time_commitment, latitude, longitude")
        .eq("status", "open");

      if (qError) {
        throw qError;
      }

      setOpportunities((data || []) as MapOpportunity[]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load map data";
      setError(message);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  const withCoords = opportunities.filter(
    (opp): opp is MapOpportunity & { latitude: number; longitude: number } =>
      opp.latitude != null && opp.longitude != null
  );

  if (!mounted) {
    return (
      <div
        className={
          fill
            ? "glass-card flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-xl border border-border/60"
            : "glass-card flex h-[min(420px,55vh)] items-center justify-center overflow-hidden rounded-2xl"
        }
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={rootShell}>
      <div className={`flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-secondary/30 px-4 py-3`}>
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Volunteering map</p>
            <p className="text-xs text-muted-foreground truncate">
              {loading
                ? "Loading pins…"
                : error
                  ? "Map data unavailable"
                  : `${withCoords.length} location${withCoords.length === 1 ? "" : "s"} on the map`}
            </p>
          </div>
        </div>
        {!loading && !error && (
          <Button type="button" variant="ghost" size="sm" className="shrink-0 rounded-lg text-xs" onClick={() => load()}>
            Refresh
          </Button>
        )}
      </div>

      {error ? (
        <div className={`${contentShell} flex flex-col items-center justify-center gap-2 px-6 text-center`}>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => load()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className={`relative ${contentShell} w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:z-0`}>
          {loading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <MapContainer center={MUMBAI_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withCoords.map((opp) => (
              <Marker key={opp.id} position={[opp.latitude, opp.longitude]}>
                <Popup>
                  <div className="min-w-[200px] space-y-2 p-0.5">
                    <p className="font-semibold text-sm leading-snug">{opp.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Time: {opp.time_commitment?.trim() ? opp.time_commitment : "Not specified"}
                    </p>
                    <Button asChild size="sm" className="w-full rounded-lg h-8 text-xs">
                      <Link to={`/opportunities/${opp.id}`}>View details</Link>
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
