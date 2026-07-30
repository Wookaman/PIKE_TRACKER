import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { getDb } from '../src/db';
import { Meal } from '../src/db/dao';
import { fetchOffByBarcode } from '../src/services/offSearch';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import * as haptics from '../src/ui/haptics';
import { c, dim, sp } from '../src/ui/theme';

type Status =
  | { kind: 'scanning' }
  | { kind: 'looking' }
  | { kind: 'notfound'; code: string }
  | { kind: 'error' };

export default function BarcodeScanScreen() {
  const router = useRouter();
  const { meal } = useLocalSearchParams<{ meal?: Meal }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const busy = useRef(false);

  const onScanned = async ({ data: code }: { data: string }) => {
    if (busy.current) return;
    busy.current = true;
    setStatus({ kind: 'looking' });
    try {
      const food = await fetchOffByBarcode(code);
      if (!food) {
        haptics.warn();
        setStatus({ kind: 'notfound', code });
        return;
      }
      const id = await getDb().foods.insert({
        name: food.name,
        brand: food.brand,
        barcode: food.barcode ?? code,
        source: 'off',
        per100: food.per100,
        micros: food.micros,
      });
      haptics.success();
      router.replace({ pathname: '/food-detail', params: { foodId: String(id), meal: meal ?? 'snacks' } });
    } catch {
      haptics.warn();
      setStatus({ kind: 'error' });
    }
  };

  const rescan = () => {
    busy.current = false;
    setStatus({ kind: 'scanning' });
  };

  // Web preview has no camera; scanning is device-only.
  if (Platform.OS === 'web') {
    return (
      <Screen>
        <Window title="SCAN BARCODE" onClose={() => router.back()}>
          <Text style={dim}>SCANNING NEEDS A DEVICE CAMERA — USE EXPO GO ON YOUR PHONE.</Text>
        </Window>
      </Screen>
    );
  }

  if (!permission) {
    return (
      <Screen>
        <Window title="SCAN BARCODE" onClose={() => router.back()}>
          <Text style={dim}>PREPARING CAMERA…</Text>
        </Window>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Window title="SCAN BARCODE" onClose={() => router.back()}>
          <Text style={[dim, { marginBottom: sp.m }]}>CAMERA ACCESS IS NEEDED TO SCAN BARCODES.</Text>
          <BevelButton title="GRANT CAMERA" onPress={requestPermission} />
        </Window>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Window title="SCAN BARCODE" onClose={() => router.back()}>
        <View style={{ height: 340, borderWidth: 2, borderColor: c.borderDark, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={status.kind === 'scanning' ? onScanned : undefined}
          />
        </View>
        <View style={{ marginTop: sp.m }}>
          {status.kind === 'scanning' ? <Text style={dim}>POINT AT A BARCODE…</Text> : null}
          {status.kind === 'looking' ? <Text style={dim}>LOOKING UP…</Text> : null}
          {status.kind === 'notfound' ? (
            <>
              <Text style={dim}>NOT FOUND · {status.code}</Text>
              <BevelButton title="SCAN AGAIN" small onPress={rescan} style={{ marginTop: sp.s }} />
            </>
          ) : null}
          {status.kind === 'error' ? (
            <>
              <Text style={dim}>LOOKUP FAILED — CHECK CONNECTION.</Text>
              <BevelButton title="SCAN AGAIN" small onPress={rescan} style={{ marginTop: sp.s }} />
            </>
          ) : null}
        </View>
      </Window>
    </Screen>
  );
}
