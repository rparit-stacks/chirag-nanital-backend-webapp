import type { Settings } from "@/types/ApiResponse";

type Props = {
  settings: Settings | null;
};

/** Maps UI uses Leaflet + Photon; Google Maps script is no longer loaded. */
export default function GoogleMapsHeadScript(_props: Props) {
  return null;
}
