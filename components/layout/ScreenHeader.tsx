import Logo from '@/components/Logo';
import { Theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Mostrar logo ao lado do título */
  showLogo?: boolean;
  /** Botão voltar (usa router.back ou fallback para tabs) */
  showBack?: boolean;
  onBackPress?: () => void;
  rightAccessory?: ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  showLogo = true,
  showBack = false,
  onBackPress,
  rightAccessory,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(Theme.animations.duration.normal)}>
      <LinearGradient
        colors={[...Theme.colors.gradientHero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: Math.max(Theme.spacing.md, insets.top + 4) }]}
      >
        <View style={styles.row}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={26} color={Theme.colors.gray50} />
            </Pressable>
          ) : null}

          {showLogo ? <Logo size="small" onDark /> : null}

          <View
            style={[
              styles.titleBlock,
              showBack && styles.titleBlockWithBack,
              showLogo && !showBack && { marginLeft: Theme.spacing.sm },
            ]}
          >
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {rightAccessory ? <View style={styles.right}>{rightAccessory}</View> : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleBlockWithBack: {
    marginLeft: Theme.spacing.xs,
  },
  title: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.fontSize['2xl'],
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray50,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.headerSubtitle,
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
