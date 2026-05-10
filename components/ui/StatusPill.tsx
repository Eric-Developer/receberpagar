import { Theme } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export type MovementStatus = 'PAGO' | 'PENDENTE' | 'VENCIDO';

export function StatusPill({ status, prominent }: { status: MovementStatus; prominent?: boolean }) {
  const s = Theme.status[status];
  return (
    <View
      style={[
        styles.wrap,
        prominent && styles.wrapProminent,
        { backgroundColor: s.bg, borderColor: s.border },
      ]}
    >
      <Text style={[styles.text, prominent && styles.textProminent, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  wrapProminent: {
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.md,
  },
  text: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.semibold,
    letterSpacing: 0.15,
  },
  textProminent: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
  },
});
