import { useEffect, useRef, useState } from "react";
import type { GoogleMapProps } from "./types/GoogleMap.types";
import { useTheme } from "next-themes";
import StoreMarkerPopup from "./StoreMarkerPopup";
import { Store, DeliveryZone, type BoundaryPoint } from "@/types/ApiResponse";
import { TILE_LAYERS, staticLat, staticLng } from "@/config/constants";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Layer,
  TileLayer,
  LeafletMouseEvent,
} from "leaflet";

const SAME_LOCATION_THRESHOLD = 0.00005;
const STORE_MARKER_OFFSET = 0.00015;

function isSameLocation(
  storeLat: number,
  storeLng: number,
  current: { lat: number; lng: number },
): boolean {
  return (
    Math.abs(storeLat - current.lat) <= SAME_LOCATION_THRESHOLD &&
    Math.abs(storeLng - current.lng) <= SAME_LOCATION_THRESHOLD
  );
}

function getStoreMarkerPosition(
  storeLat: number,
  storeLng: number,
  currentLatLng: { lat: number; lng: number } | null,
): { lat: number; lng: number } {
  if (currentLatLng && isSameLocation(storeLat, storeLng, currentLatLng)) {
    return {
      lat: storeLat + STORE_MARKER_OFFSET,
      lng: storeLng + STORE_MARKER_OFFSET,
    };
  }
  return { lat: storeLat, lng: storeLng };
}

function createUserIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "google-map-user-marker",
    html: `<div style="width:22px;height:22px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createStoreIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "store-marker-leaflet",
    html: `<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;cursor:pointer">
      <img src="/logos/store-icon.png" alt="" style="width:100%;height:100%;object-fit:contain" />
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
  });
}

function GoogleMap(props: GoogleMapProps) {
  const {
    latLng,
    onLocationUpdate,
    onBoundsChange,
    onZoomChange,
    height = 400,
    stores = [],
    zones = [],
    onMapLoad,
    disableRedirect,
  } = props;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const storeMarkersRef = useRef<LeafletMarker[]>([]);
  const zoneLayersRef = useRef<Layer[]>([]);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const storeIconRef = useRef<ReturnType<typeof createStoreIcon> | null>(null);
  const userIconRef = useRef<ReturnType<typeof createUserIcon> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDragging = useRef(false);
  const isMarkerClickRef = useRef(false);
  const isPopupOpenRef = useRef(false);
  const prevLatLngKeyRef = useRef("");
  const storesIdsRef = useRef<Set<number>>(new Set());
  const storeDataMapRef = useRef<Map<number, Store>>(new Map());
  const callbacksRef = useRef({ onBoundsChange, onZoomChange, onLocationUpdate, onMapLoad });
  const prevLatLngPropRef = useRef<{ lat: number; lng: number } | null>(null);

  const [hoveredStore, _setHoveredStore] = useState<Store | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const setHoveredStore = (store: Store | null) => {
    isPopupOpenRef.current = !!store;
    _setHoveredStore(store);
  };

  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const theme = useTheme();

  useEffect(() => {
    callbacksRef.current = { onBoundsChange, onZoomChange, onLocationUpdate, onMapLoad };
  }, [onBoundsChange, onZoomChange, onLocationUpdate, onMapLoad]);

  useEffect(() => {
    if (!mapRef.current) return;

    let destroyed = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (destroyed || !mapRef.current) return;

      LRef.current = L;
      storeIconRef.current = createStoreIcon(L);
      userIconRef.current = createUserIcon(L);

      const lightTiles = TILE_LAYERS[4] ?? TILE_LAYERS[0];
      const darkTiles = TILE_LAYERS[5] ?? TILE_LAYERS[4] ?? TILE_LAYERS[0];
      const tileUrl =
        theme.resolvedTheme === "dark" ? darkTiles : lightTiles;

      const startCenter = latLng
        ? ([latLng.lat, latLng.lng] as [number, number])
        : ([staticLat, staticLng] as [number, number]);

      const map = L.map(mapRef.current, {
        center: startCenter,
        zoom: latLng ? 16 : 12,
        zoomControl: true,
        attributionControl: true,
      });

      const tiles = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      tileLayerRef.current = tiles;
      mapInstanceRef.current = map;

      // ResizeObserver keeps the map aligned as modal/container animates open
      if (typeof ResizeObserver !== "undefined" && mapRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => map.invalidateSize());
        resizeObserverRef.current.observe(mapRef.current);
      }

      map.whenReady(() => {
        setTimeout(() => map.invalidateSize(), 50);
        setTimeout(() => map.invalidateSize(), 300);
        setTimeout(() => map.invalidateSize(), 700);
        if (callbacksRef.current.onMapLoad) callbacksRef.current.onMapLoad();
        setMapReady(true);
      });

      const emitBounds = () => {
        const b = map.getBounds();
        if (!b || !callbacksRef.current.onBoundsChange) return;
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        callbacksRef.current.onBoundsChange({
          ne: { lat: ne.lat, lng: ne.lng },
          sw: { lat: sw.lat, lng: sw.lng },
        });
        if (callbacksRef.current.onZoomChange) {
          const z = map.getZoom();
          if (z !== undefined) callbacksRef.current.onZoomChange(z);
        }
      };

      map.on("moveend", emitBounds);
      map.on("zoomend", emitBounds);

      map.on("movestart", () => setHoveredStore(null));
      map.on("zoomstart", () => setHoveredStore(null));

      map.on("click", (e: LeafletMouseEvent) => {
        if (isMarkerClickRef.current) {
          isMarkerClickRef.current = false;
          return;
        }
        if (isPopupOpenRef.current) {
          setHoveredStore(null);
          return;
        }
        if (isDragging.current) return;

        const { lat, lng } = e.latlng;
        const pos = { lat, lng };

        if (!userIconRef.current) return;

        if (!markerRef.current) {
          markerRef.current = L.marker([lat, lng], {
            icon: userIconRef.current,
            draggable: true,
            zIndexOffset: 500,
          }).addTo(map);

          markerRef.current.on("dragstart", () => {
            isDragging.current = true;
            setHoveredStore(null);
          });
          markerRef.current.on("dragend", (ev) => {
            const ll = ev.target.getLatLng();
            setTimeout(() => {
              isDragging.current = false;
            }, 100);
            if (callbacksRef.current.onLocationUpdate) {
              callbacksRef.current.onLocationUpdate({ lat: ll.lat, lng: ll.lng });
            }
          });
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }

        if (callbacksRef.current.onLocationUpdate) {
          callbacksRef.current.onLocationUpdate(pos);
        }
      });
    })();

    return () => {
      destroyed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      tileLayerRef.current = null;
      storeMarkersRef.current = [];
      zoneLayersRef.current = [];
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; latLng synced in other effects
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    const tiles = tileLayerRef.current;
    if (!map || !L || !tiles) return;

    const lightTiles = TILE_LAYERS[4] ?? TILE_LAYERS[0];
    const darkTiles = TILE_LAYERS[5] ?? TILE_LAYERS[4] ?? TILE_LAYERS[0];
    const nextUrl =
      theme.resolvedTheme === "dark" ? darkTiles : lightTiles;
    tiles.setUrl(nextUrl);
  }, [theme.resolvedTheme]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || !userIconRef.current) return;

    if (!latLng) return;

    const latLngChanged =
      !prevLatLngPropRef.current ||
      Math.abs(prevLatLngPropRef.current.lat - latLng.lat) > 0.00001 ||
      Math.abs(prevLatLngPropRef.current.lng - latLng.lng) > 0.00001;

    if (!markerRef.current) {
      markerRef.current = L.marker([latLng.lat, latLng.lng], {
        icon: userIconRef.current,
        draggable: true,
        zIndexOffset: 500,
      }).addTo(map);

      markerRef.current.on("dragstart", () => {
        isDragging.current = true;
        setHoveredStore(null);
      });
      markerRef.current.on("dragend", (ev) => {
        const ll = ev.target.getLatLng();
        setTimeout(() => {
          isDragging.current = false;
        }, 100);
        if (callbacksRef.current.onLocationUpdate) {
          callbacksRef.current.onLocationUpdate({ lat: ll.lat, lng: ll.lng });
        }
      });
      map.panTo([latLng.lat, latLng.lng]);
    } else if (!isDragging.current && latLngChanged) {
      markerRef.current.setLatLng([latLng.lat, latLng.lng]);
      const c = map.getCenter();
      const distanceToCenter =
        Math.abs(c.lat - latLng.lat) > 0.0001 ||
        Math.abs(c.lng - latLng.lng) > 0.0001;
      if (distanceToCenter) {
        map.panTo([latLng.lat, latLng.lng]);
      }
    }

    prevLatLngPropRef.current = latLng;
  }, [latLng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    const icon = storeIconRef.current;
    if (!map || !L || !icon || !mapReady) return;

    const validStores = stores.filter(
      (s: Store) => s.id && (s.lat || s.latitude),
    );
    const newStoreIds = new Set(validStores.map((s: Store) => s.id));

    const currentIds = Array.from(storesIdsRef.current).sort().join(",");
    const incomingIds = Array.from(newStoreIds).sort().join(",");
    const latLngKey = latLng
      ? `${latLng.lat.toFixed(6)},${latLng.lng.toFixed(6)}`
      : "";

    if (currentIds === incomingIds && latLngKey === prevLatLngKeyRef.current) {
      return;
    }
    prevLatLngKeyRef.current = latLngKey;

    storeMarkersRef.current.forEach((m) => {
      m.remove();
    });
    storeMarkersRef.current = [];

    storeDataMapRef.current.clear();
    validStores.forEach((store: Store) => {
      storeDataMapRef.current.set(store.id, store);
    });

    validStores.forEach((store: Store) => {
      const lat = Number(store.lat || store.latitude);
      const lng = Number(store.lng || store.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const position = getStoreMarkerPosition(lat, lng, latLng);

      const marker = L.marker([position.lat, position.lng], {
        icon,
        zIndexOffset: 400,
      }).addTo(map);

      marker.on("click", (e: LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        isMarkerClickRef.current = true;
        const storeData = storeDataMapRef.current.get(store.id);
        if (storeData) {
          const el = marker.getElement();
          const mapRect = mapRef.current?.getBoundingClientRect();
          if (el && mapRect) {
            const rect = el.getBoundingClientRect();
            setPopupPosition({
              x: rect.left - mapRect.left + rect.width / 2,
              y: rect.top - mapRect.top + rect.height / 2,
            });
            setHoveredStore(storeData);
          }
        }
        setTimeout(() => {
          isMarkerClickRef.current = false;
        }, 300);
      });

      const el = marker.getElement();
      if (el) {
        el.style.cursor = "pointer";
      }

      storeMarkersRef.current.push(marker);
    });

    storesIdsRef.current = new Set<number>(newStoreIds as Set<number>);
  }, [stores, latLng, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || !mapReady) return;

    zoneLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    zoneLayersRef.current = [];

    zones.forEach((zone: DeliveryZone) => {
      const center = {
        lat: parseFloat(zone.center_latitude),
        lng: parseFloat(zone.center_longitude),
      };

      let points: BoundaryPoint[] = [];
      const raw = zone.boundary_json as BoundaryPoint[] | string | undefined;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            points = parsed as BoundaryPoint[];
          }
        } catch {
          points = [];
        }
      } else if (Array.isArray(raw)) {
        points = raw;
      }

      if (points.length > 0) {
        const latlngs = points.map((point) => [
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

        zoneLayersRef.current.push(polygon);
      } else if (zone.radius_km) {
        const circle = L.circle([center.lat, center.lng], {
          radius: Number(zone.radius_km) * 1000,
          color: "#4F46E5",
          weight: 2,
          opacity: 0.8,
          fillColor: "#4F46E5",
          fillOpacity: 0.35,
        }).addTo(map);

        zoneLayersRef.current.push(circle);
      }
    });
  }, [zones, mapReady]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ height: `${height}px` }}
    >
      <div ref={mapRef} className="bg-gray-100 w-full h-full z-0" />
      {hoveredStore && (
        <StoreMarkerPopup
          store={hoveredStore}
          position={popupPosition}
          mapHeight={height}
          disableRedirect={disableRedirect}
        />
      )}
    </div>
  );
}

export default GoogleMap;
