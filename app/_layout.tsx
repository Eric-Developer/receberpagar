import { Theme } from '@/constants/theme';
import { inicializarNotificacoesFluxo, sincronizarLembretesContasPendentes } from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../database/database';

SplashScreen.preventAutoHideAsync().catch(() => {});

function StackBackButton({ canGoBack }: { canGoBack: boolean }) {
  if (!canGoBack) return null;
  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [styles.stackBack, pressed && styles.stackBackPressed]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <Ionicons name="chevron-back" size={26} color={Theme.colors.gray50} />
    </Pressable>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        initDatabase();
        await inicializarNotificacoesFluxo();
        await sincronizarLembretesContasPendentes();
      } catch {
        // continua mesmo com erro de notificação / DB
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, []);

  // Esconder splash quando o app estiver pronto — NÃO depender só de onLayout
  // (onLayout pode não disparar de novo após setReady, e o app fica preso na splash).
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: true,
              headerStyle: {
                backgroundColor: Theme.colors.headerBackground,
              },
              headerTintColor: Theme.colors.gray50,
              headerTitleStyle: {
                fontFamily: Theme.typography.fontFamily,
                fontWeight: Theme.typography.fontWeight.semibold,
                fontSize: Theme.typography.fontSize.lg,
              },
              headerShadowVisible: false,
              headerLeft: ({ canGoBack }) => <StackBackButton canGoBack={!!canGoBack} />,
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="editar-conta"
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </Stack>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  stackBack: {
    marginLeft: Theme.spacing.sm,
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackBackPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
