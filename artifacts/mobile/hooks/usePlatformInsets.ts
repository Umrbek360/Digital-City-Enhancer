import { Platform } from 'react-native';

export function topContentInset(safeAreaInset: number) {
  return Platform.OS === 'web' ? Math.max(safeAreaInset, 67) : safeAreaInset;
}

export function bottomContentInset(safeAreaInset: number) {
  return Platform.OS === 'web' ? Math.max(safeAreaInset, 34) : safeAreaInset;
}
