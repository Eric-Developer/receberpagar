import { Theme } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type Flow = 'RECEBER' | 'PAGAR';

export function FlowBadge({ flow, compact }: { flow: Flow; compact?: boolean }) {
  const t = Theme.flow[flow];
  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        { backgroundColor: t.mutedBg, borderColor: t.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: t.stripe }]} />
      <Text style={[styles.text, { color: t.text }]}>{t.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  wrapCompact: {
    paddingVertical: 3,
    paddingHorizontal: Theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});
