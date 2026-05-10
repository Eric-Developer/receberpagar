import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gradientColors?: string[];
}

export function Card({
  children,
  style,
  variant = 'default',
  padding = 'md',
  gradientColors,
}: CardProps) {
  const cardStyles = [
    styles.base,
    styles[variant],
    styles[padding],
    style,
  ];

  if (variant === 'gradient' && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyles}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Theme.colors.surface,
  },
  default: {
    ...Theme.shadows.md,
  },
  elevated: {
    ...Theme.shadows.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  flat: {
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    ...Theme.shadows.sm,
  },
  gradient: {
    // Gradient handled by LinearGradient
  },
  none: {
    padding: 0,
  },
  sm: {
    padding: Theme.spacing.sm,
  },
  md: {
    padding: Theme.spacing.md,
  },
  lg: {
    padding: Theme.spacing.lg,
  },
});