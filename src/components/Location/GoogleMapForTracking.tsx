"use client";
import { FC, useEffect, useRef, useCallback } from "react";

interface DeliveryBoyInfo {
  id: number;
  user_id: number;
  delivery_zone_id: number;
  status: string;
  full_name: string;
  address: string;
  driver_license: string[];
  driver_license_number: string;
  vehicle_type: string;
  vehicle_registration: string[];
  verification_status: string;
  verification_remark: string | null;
}

interface StoreLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
}

interface GoogleMapForTrackingProps {
  customerLocation: { lat: number; lng: number };
  riderLocation: { lat: number; lng: number } | null;
  storeLocations?: StoreLocation[];
  customerAddress: string;
  riderInfo?: DeliveryBoyInfo;
  isLoading: boolean;
}

// Build a smooth curved SVG polyline between two Leaflet points
function buildCurvedPolylinePoints(
  start: [number, number],
  end: [number, number],
  numPoints = 50
): [number, number][] {
  const points: [number, number][] = [];
  const latDiff = Math.abs(end[0] - start[0]);
  const lngDiff = Math.abs(end[1] - start[1]);
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  const curveHeight = distance * 0.25;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = start[0] + (end[0] - start[0]) * t;
    const lng = start[1] + (end[1] - start[1]) * t;
    const parabolaFactor = 4 * t * (1 - t);
    points.push([lat + curveHeight * parabolaFactor, lng]);
  }
  return points;
}

const GoogleMapForTracking: FC<GoogleMapForTrackingProps> = ({
  customerLocation,
  riderLocation,
  storeLocations = [],
  customerAddress,
  riderInfo,
  isLoading,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);

  const clearLayers = useCallback(() => {
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
  }, []);

  // Initialise map once
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      const map = L.map(mapRef.current).setView(
        [customerLocation.lat, customerLocation.lng],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      leafletMapRef.current = map;
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-draw markers + paths whenever locations change
  useEffect(() => {
    if (!leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      clearLayers();

      // ── Customer marker ────────────────────────────────────────────────
      const customerIcon = L.divIcon({
        className: "",
        html: `<div style="background:#DC2626;border:2px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.4);">🏠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const customerMarker = L.marker(
        [customerLocation.lat, customerLocation.lng],
        { icon: customerIcon }
      )
        .bindPopup(
          `<div style="min-width:200px"><strong style="color:#DC2626">Delivery Location</strong><br/><span style="font-size:12px">${customerAddress}</span></div>`
        )
        .addTo(map);
      layersRef.current.push(customerMarker);

      // ── Store markers ──────────────────────────────────────────────────
      storeLocations.forEach((store, idx) => {
        const storeIcon = L.divIcon({
          className: "",
          html: `<div style="background:#3B82F6;border:2px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.4);">${idx + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const storeMarker = L.marker([store.lat, store.lng], {
          icon: storeIcon,
        })
          .bindPopup(
            `<div style="min-width:200px"><strong>Store ${idx + 1}</strong><br/>${store.name}<br/><span style="font-size:12px;color:#666">${store.address}${store.city ? `, ${store.city}` : ""}</span></div>`
          )
          .addTo(map);
        layersRef.current.push(storeMarker);
      });

      // ── Rider marker + paths ───────────────────────────────────────────
      if (riderLocation) {
        const riderIcon = L.divIcon({
          className: "",
          html: `<div style="background:#10B981;border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,.4);">🏍️</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const riderMarker = L.marker(
          [riderLocation.lat, riderLocation.lng],
          { icon: riderIcon }
        )
          .bindPopup(
            `<div style="min-width:200px"><strong style="color:#10B981">Delivery Partner</strong><br/>${riderInfo?.full_name || "On the way"}${riderInfo?.vehicle_type ? `<br/><span style="font-size:12px;color:#666;text-transform:capitalize">${riderInfo.vehicle_type}</span>` : ""}</div>`
          )
          .addTo(map);
        layersRef.current.push(riderMarker);

        if (storeLocations.length > 0) {
          // Store → Rider path (green, completed leg)
          const pathToRider = buildCurvedPolylinePoints(
            [storeLocations[0].lat, storeLocations[0].lng],
            [riderLocation.lat, riderLocation.lng]
          );
          const polyToRider = L.polyline(pathToRider, {
            color: "#10B981",
            weight: 4,
            opacity: 0.7,
            dashArray: undefined,
          }).addTo(map);
          layersRef.current.push(polyToRider);

          // Rider → Customer path (indigo, pending leg)
          const pathToCustomer = buildCurvedPolylinePoints(
            [riderLocation.lat, riderLocation.lng],
            [customerLocation.lat, customerLocation.lng]
          );
          const polyToCustomer = L.polyline(pathToCustomer, {
            color: "#6366F1",
            weight: 3,
            opacity: 0.6,
            dashArray: "8 6",
          }).addTo(map);
          layersRef.current.push(polyToCustomer);

          // Store-to-store paths if multiple stores
          for (let i = 0; i < storeLocations.length - 1; i++) {
            const pathBetween = buildCurvedPolylinePoints(
              [storeLocations[i].lat, storeLocations[i].lng],
              [storeLocations[i + 1].lat, storeLocations[i + 1].lng]
            );
            const polyBetween = L.polyline(pathBetween, {
              color: "#3B82F6",
              weight: 2,
              opacity: 0.5,
            }).addTo(map);
            layersRef.current.push(polyBetween);
          }
        } else {
          // Simple rider → customer path
          const path = buildCurvedPolylinePoints(
            [riderLocation.lat, riderLocation.lng],
            [customerLocation.lat, customerLocation.lng]
          );
          const poly = L.polyline(path, {
            color: "#6366F1",
            weight: 4,
            opacity: 0.8,
            dashArray: "10 6",
          }).addTo(map);
          layersRef.current.push(poly);
        }

        // Fit all markers in view
        const bounds = L.latLngBounds([
          [customerLocation.lat, customerLocation.lng],
          [riderLocation.lat, riderLocation.lng],
          ...storeLocations.map((s) => [s.lat, s.lng] as [number, number]),
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([customerLocation.lat, customerLocation.lng], 13);
      }
    });
  }, [customerLocation, riderLocation, storeLocations, riderInfo, customerAddress, clearLayers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Updating location...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapForTracking;
