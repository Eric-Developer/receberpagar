import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Theme } from '@/constants/theme';
import { db } from '@/database/database';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type Tipo = 'RECEBER' | 'PAGAR';

type Row = {
  id: number;
  conta_id: number;
  mes: number;
  ano: number;
  status: string;
  valor: number | null;
  data_pagamento: string | null;
  tipo: Tipo;
  nome: string;
  pessoa: string;
  categoria: string;
};

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type AreaUi = 'ENTRADAS' | 'SAIDAS';

export default function HistoricoScreen() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [area, setArea] = useState<AreaUi>('ENTRADAS');
  const [rows, setRows] = useState<Row[]>([]);
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<{ receber: boolean; pagar: boolean }>({
    receber: true,
    pagar: true,
  });

  const anos = useMemo(() => {
    const base = hoje.getFullYear();
    return [base - 2, base - 1, base, base + 1, base + 2];
  }, [hoje]);

  const areaEfetiva: AreaUi =
    fluxosDisponiveis.receber && !fluxosDisponiveis.pagar
      ? 'ENTRADAS'
      : !fluxosDisponiveis.receber && fluxosDisponiveis.pagar
        ? 'SAIDAS'
        : area;
  const tipoDb: Tipo = areaEfetiva === 'ENTRADAS' ? 'RECEBER' : 'PAGAR';

  const carregar = useCallback(() => {
    const fluxoExistente = db.getAllSync<{ tipo: Tipo }>(
      `SELECT DISTINCT tipo FROM pagamentos p
       INNER JOIN contas a ON a.id = p.conta_id
       WHERE p.status = 'PAGO'`
    );
    setFluxosDisponiveis({
      receber: fluxoExistente.some((f) => f.tipo === 'RECEBER'),
      pagar: fluxoExistente.some((f) => f.tipo === 'PAGAR'),
    });

    const result = db.getAllSync<Row>(
      `
      SELECT
        p.id,
        p.conta_id,
        p.mes,
        p.ano,
        p.status,
        p.valor,
        p.data_pagamento,
        a.tipo,
        a.nome,
        a.pessoa,
        a.categoria
      FROM pagamentos p
      INNER JOIN contas a ON a.id = p.conta_id
      WHERE p.mes = ? AND p.ano = ? AND p.status = 'PAGO'
      AND a.tipo = ?
      ORDER BY p.data_pagamento DESC, a.nome
      `,
      [mes, ano, tipoDb]
    );

    setRows(result);
  }, [mes, ano, tipoDb]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const total = rows.reduce((sum, r) => sum + (r.valor || 0), 0);

  function formatDate(iso: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  }

  function renderItem({ item }: { item: Row }) {
    const stripe = Theme.flow[item.tipo].stripe;
    return (
      <View style={[styles.card, { borderLeftColor: stripe }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.nome}
            </Text>
            {item.pessoa ? <Text style={styles.cardMeta}>{item.pessoa}</Text> : null}
            {item.categoria ? <Text style={styles.cardMeta}>{item.categoria}</Text> : null}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.amount}>
            {(item.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
          <Text style={styles.date}>{formatDate(item.data_pagamento)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Histórico" subtitle="Lançamentos quitados" showBack={false} showLogo />

      {fluxosDisponiveis.receber && fluxosDisponiveis.pagar ? (
      <View style={styles.areaRow}>
        <Pressable
          style={[styles.areaBtn, areaEfetiva === 'ENTRADAS' && styles.areaBtnEntrada]}
          onPress={() => setArea('ENTRADAS')}
        >
          <Text style={[styles.areaBtnText, areaEfetiva === 'ENTRADAS' && styles.areaBtnTextOn]}>Entradas</Text>
        </Pressable>
        <Pressable
          style={[styles.areaBtn, areaEfetiva === 'SAIDAS' && styles.areaBtnSaida]}
          onPress={() => setArea('SAIDAS')}
        >
          <Text style={[styles.areaBtnText, areaEfetiva === 'SAIDAS' && styles.areaBtnTextOn]}>Saídas</Text>
        </Pressable>
      </View>
      ) : null}

      <View style={styles.filters}>
        <View style={styles.pickerBox}>
          <Picker selectedValue={mes} onValueChange={(v) => setMes(v)} style={styles.picker}>
            {meses.map((m, idx) => (
              <Picker.Item key={idx + 1} label={m} value={idx + 1} />
            ))}
          </Picker>
        </View>
        <View style={styles.pickerBox}>
          <Picker selectedValue={ano} onValueChange={(v) => setAno(v)} style={styles.picker}>
            {anos.map((y) => (
              <Picker.Item key={y} label={String(y)} value={y} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>
          Total · {areaEfetiva === 'ENTRADAS' ? 'Entradas' : 'Saídas'}
        </Text>
        <Text style={styles.totalValue} adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1}>
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nada quitado neste período.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  areaRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
    gap: Theme.spacing.md,
  },
  areaBtn: {
    flex: 1,
    minHeight: 56,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaBtnEntrada: {
    borderColor: Theme.flow.RECEBER.stripe,
    backgroundColor: Theme.flow.RECEBER.mutedBg,
  },
  areaBtnSaida: {
    borderColor: Theme.flow.PAGAR.stripe,
    backgroundColor: Theme.flow.PAGAR.mutedBg,
  },
  areaBtnText: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    includeFontPadding: false,
  },
  areaBtnTextOn: {
    color: Theme.colors.gray900,
  },

  filters: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  pickerBox: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceAlt,
    justifyContent: 'center',
  },
  picker: { height: 56, color: Theme.colors.gray900, backgroundColor: Theme.colors.surfaceAlt },

  totalBar: {
    marginHorizontal: Theme.spacing.md,
    marginVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  totalLabel: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    letterSpacing: 0.2,
    fontFamily: Theme.typography.fontFamily,
  },
  totalValue: {
    color: Theme.colors.gray900,
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.bold,
    fontFamily: Theme.typography.fontFamily,
    flexShrink: 0,
  },

  card: {
    marginHorizontal: Theme.spacing.md,
    marginVertical: 6,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surface,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    ...Theme.shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
  },
  cardMeta: {
    marginTop: 4,
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSize.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  cardBottom: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  amount: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  date: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
  },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: Theme.spacing.lg },
  emptyText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: Theme.typography.fontFamily,
  },
});
