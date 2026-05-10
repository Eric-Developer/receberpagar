import { Theme } from '@/constants/theme';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  ...props
}, ref) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          style={[styles.input, inputStyle]}
          placeholderTextColor={Theme.colors.gray400}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.gray700,
    marginBottom: Theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    minHeight: 48,
    ...Theme.shadows.sm,
  },
  inputContainerError: {
    borderColor: Theme.colors.danger,
  },
  input: {
    flex: 1,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
    paddingVertical: Theme.spacing.sm,
  },
  leftIcon: {
    marginRight: Theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: Theme.spacing.sm,
  },
  error: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.danger,
    marginTop: Theme.spacing.xs,
  },
});