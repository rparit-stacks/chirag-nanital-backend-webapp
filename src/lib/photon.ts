/**
 * Photon geocoding (Komoot) — OSM-backed, no API key.
 * https://photon.komoot.io
 */

export type PhotonProps = {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
  locality?: string;
  district?: string;
  village?: string;
  town?: string;
  [key: string]: unknown;
};

export interface PhotonFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: PhotonProps;
}

type PhotonCollection = {
  type: "FeatureCollection";
  features: PhotonFeature[];
};

function joinAddressParts(p: PhotonProps): string {
  const road = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  return (
    road ||
    (typeof p.name === "string" ? p.name : "") ||
    (typeof p.locality === "string" ? p.locality : "") ||
    (typeof p.city === "string" ? p.city : "") ||
    ""
  );
}

export function photonFeatureToLatLng(f: PhotonFeature): {
  lat: number;
  lng: number;
} {
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lng: lon };
}

/** Build display lines for autocomplete list items */
export function photonFeatureLabels(f: PhotonFeature): {
  label: string;
  description: string;
} {
  const p = f.properties;
  const label =
    joinAddressParts(p) ||
    (typeof p.name === "string" ? p.name : "") ||
    (typeof p.city === "string" ? p.city : "Location");
  const city = p.city || p.town || p.village || p.locality;
  const tail = [city, p.state, p.country].filter(Boolean).join(", ");
  return { label, description: tail };
}

export async function photonSearch(
  query: string,
  options?: { countryCodes?: string[]; limit?: number },
): Promise<PhotonFeature[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(options?.limit ?? 10));
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as PhotonCollection;
  let features = data.features || [];

  const codes = options?.countryCodes?.map((c) => c.toLowerCase()) ?? [];
  if (codes.length > 0) {
    features = features.filter((f) => {
      const cc = f.properties.countrycode;
      if (typeof cc !== "string") return false;
      return codes.includes(cc.toLowerCase());
    });
  }

  return features;
}

export async function photonReverse(
  lat: number,
  lng: number,
): Promise<PhotonFeature | null> {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as PhotonCollection;
  const f = data.features?.[0];
  return f ?? null;
}

/** Parsed address fields for forms (similar to Google Geocoder breakdown). */
export function addressFieldsFromPhoton(feature: PhotonFeature | null): {
  formattedAddress: string;
  address_line1: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  zipcode: string;
} | null {
  if (!feature) return null;
  const p = feature.properties;

  const city =
    (typeof p.city === "string" && p.city) ||
    (typeof p.town === "string" && p.town) ||
    (typeof p.village === "string" && p.village) ||
    (typeof p.locality === "string" && p.locality) ||
    (typeof p.district === "string" && p.district) ||
    "";

  const state =
    (typeof p.state === "string" && p.state) ||
    (typeof p.region === "string" && p.region) ||
    "";

  const country = typeof p.country === "string" ? p.country : "";
  const zipcode = typeof p.postcode === "string" ? p.postcode : "";
  const ccRaw = typeof p.countrycode === "string" ? p.countrycode : "";
  const countryCode = ccRaw.length === 2 ? ccRaw.toUpperCase() : "";

  const line1 = joinAddressParts(p);
  const formattedAddress = [
    line1,
    city,
    state,
    zipcode,
    country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    formattedAddress: formattedAddress || line1 || city || "Selected location",
    address_line1: line1 || formattedAddress,
    city,
    state,
    country,
    countryCode,
    zipcode,
  };
}
