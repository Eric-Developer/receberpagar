import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { onPressIn, ...rest } = props;

  return (
    <Pressable
      {...rest}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(ev);
      }}
    />
  );
}
