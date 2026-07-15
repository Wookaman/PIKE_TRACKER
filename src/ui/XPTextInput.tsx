import { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { c, mono, wellStyle } from './theme';

/** Sunken text field. Mono face — typing feels like a terminal. */
export const XPTextInput = forwardRef<TextInput, TextInputProps>(function XPTextInput(
  { style, ...rest },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.textFaint}
      selectionColor={c.white}
      style={[
        wellStyle,
        {
          color: c.text,
          fontFamily: mono,
          fontSize: 14,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
        style,
      ]}
      {...rest}
    />
  );
});
