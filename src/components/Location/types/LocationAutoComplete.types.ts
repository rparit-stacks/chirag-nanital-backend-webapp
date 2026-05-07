export interface LocationAutoCompleteRef {
  setInputValue: (value: string) => void;
}

export interface MainText {
  text: string;
}

export interface SecondaryText {
  text: string;
}

export interface PlacePrediction {
  placeId: string;
  mainText: MainText | null;
  secondaryText: SecondaryText | null;
}

export interface PredictionItem {
  key: string;
  label: string;
  description: string;
  original: PlacePrediction | null;
  /** Present when suggestions come from Photon (direct pick, no extra geocode). */
  latLng?: { lat: number; lng: number };
}

export interface LocationAutoCompleteProps {
  onLocationSelect: (location: {
    placeName: string;
    latLng: { lat: number; lng: number };
    placeDescription: string;
  }) => void;
}

export interface UserLocation {
  lat: number;
  lng: number;
  placeName: string;
  placeDescription: string;
}
