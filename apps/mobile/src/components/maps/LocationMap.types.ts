import type { StyleProp, ViewStyle } from 'react-native';

export type LocationMapProps = {
  lat: number | null;
  lng: number | null;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPick: (lat: number, lng: number) => void;
};
