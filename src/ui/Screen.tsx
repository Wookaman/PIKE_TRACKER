import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, sp } from './theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
}

/** Page container: dark desktop, safe-area padding. */
export function Screen({ children, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = {
    flex: 1,
    backgroundColor: c.bg,
    paddingTop: insets.top + sp.m,
  };

  if (!scroll) {
    return <View style={pad}>{children}</View>;
  }
  return (
    <View style={pad}>
      <ScrollView
        contentContainerStyle={{ padding: sp.m, paddingBottom: sp.xl * 2, gap: sp.m }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}
