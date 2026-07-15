import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';

export function tap(): void {
  if (!canBuzz) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function thud(): void {
  if (!canBuzz) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function success(): void {
  if (!canBuzz) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warn(): void {
  if (!canBuzz) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
