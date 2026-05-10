import { Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  gradient = false,
}: ButtonProps) {
  const buttonStyles = StyleSheet.flatten([
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ]);

  const variantTextStyle =
    variant === 'outline'
      ? styles.outlineText
      : variant === 'ghost'
        ? styles.ghostText
        : variant === 'secondary'
          ? styles.secondaryText
          : styles.primaryText;

  const textStyles = StyleSheet.flatten([
    styles.textBase,
    variantTextStyle,
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ]);

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  const content = (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? Theme.colors.secondaryDark : Theme.colors.white}
          style={styles.loader}
        />
      )}
      <Text style={textStyles}>{title}</Text>
    </>
  );

  if (gradient && variant === 'primary') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={disabled || loading} style={styles.gradientContainer}>
        <LinearGradient
          colors={Theme.colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={buttonStyles}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled || loading} style={buttonStyles}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Theme.shadows.sm,
  },
  gradientContainer: {
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  secondary: {
    backgroundColor: Theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: Theme.colors.secondaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  sm: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.6,
  },
  textBase: {
    fontFamily: Theme.typography.fontFamily,
    fontWeight: Theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  primaryText: {
    color: Theme.colors.white,
  },
  secondaryText: {
    color: Theme.colors.secondaryDark,
  },
  outlineText: {
    color: Theme.colors.primary,
  },
  ghostText: {
    color: Theme.colors.primary,
  },
  smText: {
    fontSize: Theme.typography.fontSize.sm,
  },
  mdText: {
    fontSize: Theme.typography.fontSize.base,
  },
  lgText: {
    fontSize: Theme.typography.fontSize.lg,
  },
  disabledText: {
    opacity: 0.6,
  },
  loader: {
    marginRight: Theme.spacing.sm,
  },
});