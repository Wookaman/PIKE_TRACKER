import { Alert, Platform } from 'react-native';

/** Native confirm dialog; window.confirm on web (dev preview). */
export function confirmDelete(message: string, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    const ask = (globalThis as { confirm?: (m: string) => boolean }).confirm;
    if (ask?.(message)) onConfirm();
    return;
  }
  Alert.alert(message, undefined, [
    { text: 'CANCEL', style: 'cancel' },
    { text: 'DELETE', style: 'destructive', onPress: onConfirm },
  ]);
}
