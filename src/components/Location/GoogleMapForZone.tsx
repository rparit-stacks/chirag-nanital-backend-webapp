import { FC, useEffect, useRef } from "react";
import { DeliveryZone } from "@/types/ApiResponse";
import { useTheme } from "next-themes";
import { useSettings } from "@/contexts/SettingsContext";
import { TILE_LAYERS } from "@/config/constants";

interface GoogleMapForZoneProps {
  zone: DeliveryZone;
  className?: string;
}

const GoogleMapForZone: FC<GoogleMapForZoneProps> = ({
  zone,
  className = "",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<import("leaflet").Layer[]>([]);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);

  const theme = useTheme();
  const { currencySymbol } = useSettings();

  useEffect(() => {
    if (!mapRef.current || !zone) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      const centerLat = parseFloat(zone.center_latitude);
      const centerLng = parseFloat(zone.center_longitude);

      const lightTiles = TILE_LAYERS[4] ?? TILE_LAYERS[0];
      const darkTiles = TILE_LAYERS[5] ?? TILE_LAYERS[4] ?? TILE_LAYERS[0];
      const tileUrl =
        theme.resolvedTheme === "dark" ? darkTiles : lightTiles;

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 13,
          zoomControl: true,
        });
        mapInstanceRef.current = map;

        const tiles = L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        tileLayerRef.current = tiles;

        map.whenReady(() => {
          setTimeout(() => map.invalidateSize(), 100);
          setTimeout(() => map.invalidateSize(), 400);
          setTimeout(() => map.invalidateSize(), 900);
        });
      } else {
        mapInstanceRef.current.setView([centerLat, centerLng], 13);
        if (tileLayerRef.current) {
          tileLayerRef.current.setUrl(tileUrl);
        }
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      layersRef.current.forEach((layer) => {
        map.removeLayer(layer);
      });
      layersRef.current = [];

      const html = `
        <div class="p-3 min-w-[200px]">
          <div class="font-semibold text-gray-800 mb-2">${zone.name}</div>
          <div class="text-sm text-gray-600">
            <p>Delivery Charges: ${currencySymbol} ${zone.regular_delivery_charges}</p>
            ${zone.rush_delivery_enabled ? `<p>Rush Delivery: ${currencySymbol} ${zone.rush_delivery_charges}</p>` : ""}
            ${zone.free_delivery_amount ? `<p>Free Delivery Above: ${currencySymbol} ${zone.free_delivery_amount}</p>` : ""}
          </div>
        </div>
      `;

      const marker = L.marker([centerLat, centerLng], {
        title: zone.name,
      })
        .bindPopup(html)
        .addTo(map);

      layersRef.current.push(marker);
      marker.openPopup();

      let bounds: import("leaflet").LatLngBounds | null = null;

      if (zone.boundary_json && zone.boundary_json.length > 0) {
        const latlngs = zone.boundary_json.map((point) => [
          point.lat,
          point.lng,
        ]) as [number, number][];

        const polygon = L.polygon(latlngs, {
          color: "#4F46E5",
          weight: 2,
          opacity: 0.8,
          fillColor: "#4F46E5",
          fillOpacity: 0.35,
        }).addTo(map);

        layersRef.current.push(polygon);
        bounds = polygon.getBounds();
      } else if (zone.radius_km) {
        const circle = L.circle([centerLat, centerLng], {
          radius: zone.radius_km * 1000,
          color: "#4F46E5",
          weight: 2,
          opacity: 0.8,
          fillColor: "#4F46E5",
          fillOpacity: 0.35,
        }).addTo(map);

        layersRef.current.push(circle);
        bounds = circle.getBounds();
      }

      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [zone, theme.resolvedTheme, currencySymbol]);

  useEffect(() => {
    const tiles = tileLayerRef.current;
    if (!tiles || !mapInstanceRef.current) return;

    const lightTiles = TILE_LAYERS[4] ?? TILE_LAYERS[0];
    const darkTiles = TILE_LAYERS[5] ?? TILE_LAYERS[4] ?? TILE_LAYERS[0];
    const nextUrl =
      theme.resolvedTheme === "dark" ? darkTiles : lightTiles;
    tiles.setUrl(nextUrl);
  }, [theme.resolvedTheme]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      tileLayerRef.current = null;
      layersRef.current = [];
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className={`bg-gray-100 rounded-lg w-full h-[400px] ${className}`}
    />
  );
};

export default GoogleMapForZone;
