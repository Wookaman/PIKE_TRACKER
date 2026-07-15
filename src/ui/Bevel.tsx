import { View, ViewProps } from 'react-native';
import { bevelDown, bevelUp } from './theme';

interface BevelViewProps extends ViewProps {
  sunken?: boolean;
}

/** Static raised (or sunken) chrome panel. */
export function BevelView({ sunken, style, ...rest }: BevelViewProps) {
  return <View style={[sunken ? bevelDown : bevelUp, style]} {...rest} />;
}
