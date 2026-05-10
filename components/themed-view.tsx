import React from 'react';
import {
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = Omit<ViewProps, 'style'> & {
  lightColor?: string;
  darkColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background'
  );

  return (
    <View
      style={[{ backgroundColor }, style]}
      {...otherProps}
    />
  );
}