import { Theme } from '@/constants/theme';
import { Image, StyleSheet, Text, View } from 'react-native';

type LogoSize = 'small' | 'medium' | 'large';

const logoConfig: Record<LogoSize, { size: number; fontSize: number }> = {
  small: { size: 44, fontSize: 18 },
  medium: { size: 60, fontSize: 24 },
  large: { size: 84, fontSize: 30 },
};

interface LogoProps {
  size?: LogoSize;
  showLabel?: boolean;
  /** Header escuro: borda e fundo compatíveis com contraste */
  onDark?: boolean;
}

/**
 * Logo centralizado na área segura: círculo fixo + imagem com padding interno
 * (evita “vazar” no splash / headers com notch).
 */
export default function Logo({ size = 'medium', showLabel = false, onDark = false }: LogoProps) {
  const config = logoConfig[size];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.logoOuter,
          onDark && styles.logoOuterOnDark,
          {
            width: config.size,
            height: config.size,
            borderRadius: config.size / 2,
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo_pagar_e_receber.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { fontSize: config.fontSize }]}>Fluxo</Text>
          <Text style={[styles.labelSub, { fontSize: config.fontSize * 0.58 }]}>Finanças pessoais</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoOuter: {
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.sm,
  },
  logoOuterOnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  logoImage: {
    width: '72%',
    height: '72%',
  },
  labelContainer: {
    marginLeft: Theme.spacing.md,
    alignItems: 'flex-start',
    maxWidth: '70%',
  },
  label: {
    fontFamily: Theme.typography.fontFamily,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    lineHeight: Theme.typography.lineHeight.tight,
  },
  labelSub: {
    fontFamily: Theme.typography.fontFamily,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.gray600,
    lineHeight: Theme.typography.lineHeight.tight,
    marginTop: 2,
  },
});
