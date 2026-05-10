import { HapticTab } from '@/components/haptic-tab';
import { Theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const baseHeight = 64;
  const bottomPad = Math.max(10, insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.colors.primaryDark,
        tabBarInactiveTintColor: Theme.colors.gray500,
        tabBarLabelStyle: {
          fontFamily: Theme.typography.fontFamily,
          fontWeight: '600' as any,
          fontSize: Theme.typography.fontSize.xs,
          marginBottom: 2,
        },
        tabBarStyle: {
          height: baseHeight + bottomPad,
          paddingTop: Theme.spacing.sm,
          paddingBottom: bottomPad,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          backgroundColor: Theme.colors.surface,
          ...Theme.shadows.sm,
        },
        tabBarButton: (props) => <HapticTab {...props} />,
        tabBarItemStyle: {
          paddingVertical: Theme.spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="pagamentos"
        options={{
          title: 'Movimentações',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "cash" : "cash-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="nova-conta"
        options={{
          title: 'Adicionar',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "add-circle" : "add-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="resumo"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "list" : "list-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
