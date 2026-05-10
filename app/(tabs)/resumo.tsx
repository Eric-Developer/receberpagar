import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Theme } from '@/constants/theme';
import { db } from '@/database/database';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Painel = 'ENTRADAS' | 'SAIDAS';

function money(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Resumo() {
  const hoje = new Date();

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [painel, setPainel] = useState<Painel>('ENTRADAS');

  const [totalReceber, setTotalReceber] = useState(0);
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [totalPagar, setTotalPagar] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<{ receber: boolean; pagar: boolean }>({
    receber: true,
    pagar: true,
  });

  function carregarResumo() {
    const monthIndex = ano * 12 + (mes - 1);

    const receberRows = db.getAllSync<{
      valor: number;
      mes: number;
      ano: number;
      ativo?: number;
    }>(`SELECT valor, mes, ano, ativo FROM contas WHERE tipo = 'RECEBER' AND ativo = 1`);

    const pagarRows = db.getAllSync<{
      valor: number;
      parcelas: number;
      parcelas_pagas?: number;
      mes: number;
      ano: number;
    }>(`SELECT valor, parcelas, parcelas_pagas, mes, ano FROM contas WHERE tipo = 'PAGAR'`);

    const recebido = db.getFirstSync<{ total: number }>(
      `SELECT SUM(p.valor) AS total
       FROM pagamentos p
       INNER JOIN contas a ON a.id = p.conta_id
       WHERE a.tipo = 'RECEBER' AND a.ativo = 1 AND p.mes = ? AND p.ano = ? AND p.status = 'PAGO'`,
      [mes, ano]
    );

    const pago = db.getFirstSync<{ total: number }>(
      `SELECT SUM(p.valor) AS total
       FROM pagamentos p
       INNER JOIN contas a ON a.id = p.conta_id
       WHERE a.tipo = 'PAGAR' AND p.mes = ? AND p.ano = ? AND p.status = 'PAGO'`,
      [mes, ano]
    );

    const totalReceberMes = receberRows.reduce((sum, row) => {
      const startIndex = row.ano * 12 + (row.mes - 1);
      return monthIndex >= startIndex ? sum + (row.valor || 0) : sum;
    }, 0);

    const totalPagarMes = pagarRows.reduce((sum, row) => {
      const startIndex = row.ano * 12 + (row.mes - 1);
      const parcelas = row.parcelas || 1;
      const endIndex = startIndex + parcelas - 1;
      if (monthIndex < startIndex || monthIndex > endIndex) {
        return sum;
      }
      const parcelasPagas = row.parcelas_pagas || 0;
      if (parcelasPagas >= parcelas) {
        return sum;
      }
      return sum + (row.valor || 0) / parcelas;
    }, 0);

    setTotalReceber(totalReceberMes);
    setTotalRecebido(recebido?.total || 0);
    setTotalPagar(totalPagarMes);
    setTotalPago(pago?.total || 0);
    setFluxosDisponiveis({
      receber: receberRows.length > 0 || (recebido?.total || 0) > 0,
      pagar: pagarRows.length > 0 || (pago?.total || 0) > 0,
    });
  }

  React.useEffect(() => {
    carregarResumo();
  }, [mes, ano]);

  useFocusEffect(
    useCallback(() => {
      carregarResumo();
    }, [mes, ano])
  );

  const faltaReceber = totalReceber - totalRecebido;
  const faltaPagar = totalPagar - totalPago;
  const fr = Theme.flow.RECEBER;
  const fp = Theme.flow.PAGAR;
  const painelEfetivo: Painel =
    fluxosDisponiveis.receber && !fluxosDisponiveis.pagar
      ? 'ENTRADAS'
      : !fluxosDisponiveis.receber && fluxosDisponiveis.pagar
        ? 'SAIDAS'
        : painel;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Resumo" subtitle="Fluxo do período" showBack={false} showLogo />

      <View style={styles.periodRow}>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={mes} onValueChange={(v) => setMes(v)} style={styles.picker}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Picker.Item key={i + 1} label={meses[i]} value={i + 1} />
            ))}
          </Picker>
        </View>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={ano} onValueChange={(v) => setAno(v)} style={styles.picker}>
            {Array.from({ length: 4 }).map((_, i) => {
              const anoValue = hoje.getFullYear() + i;
              return <Picker.Item key={anoValue} label={String(anoValue)} value={anoValue} />;
            })}
          </Picker>
        </View>
      </View>

      {fluxosDisponiveis.receber && fluxosDisponiveis.pagar ? (
      <View style={styles.painelSwitch}>
        <Pressable
          style={[styles.painelBtn, painelEfetivo === 'ENTRADAS' && { borderColor: fr.stripe, backgroundColor: fr.mutedBg }]}
          onPress={() => setPainel('ENTRADAS')}
        >
          <Text
            style={[styles.painelBtnText, painelEfetivo === 'ENTRADAS' && { color: fr.text, fontWeight: Theme.typography.fontWeight.bold }]}
          >
            Entradas
          </Text>
        </Pressable>
        <Pressable
          style={[styles.painelBtn, painelEfetivo === 'SAIDAS' && { borderColor: fp.stripe, backgroundColor: fp.mutedBg }]}
          onPress={() => setPainel('SAIDAS')}
        >
          <Text
            style={[styles.painelBtnText, painelEfetivo === 'SAIDAS' && { color: fp.text, fontWeight: Theme.typography.fontWeight.bold }]}
          >
            Saídas
          </Text>
        </Pressable>
      </View>
      ) : null}

      {painelEfetivo === 'ENTRADAS' ? (
        <View style={[styles.moduleCard, { borderColor: fr.border, backgroundColor: fr.mutedBg }]}>
          <Text style={[styles.moduleHeading, { color: fr.accent }]}>Entradas no mês</Text>
          <Row label="Previsto" value={money(totalReceber)} emphasis />
          <Row label="Confirmado" value={money(totalRecebido)} valueColor={Theme.status.PAGO.text} />
          <View style={styles.divider} />
          <Row
            label="Diferença"
            value={money(faltaReceber)}
            emphasis
            valueColor={faltaReceber > 0 ? Theme.status.PENDENTE.text : Theme.status.PAGO.text}
          />
        </View>
      ) : (
        <View style={[styles.moduleCard, { borderColor: fp.border, backgroundColor: fp.mutedBg }]}>
          <Text style={[styles.moduleHeading, { color: fp.accent }]}>Saídas no mês</Text>
          <Row label="Comprometido" value={money(totalPagar)} emphasis />
          <Row label="Quitado" value={money(totalPago)} valueColor={Theme.status.PAGO.text} />
          <View style={styles.divider} />
          <Row
            label="Diferença"
            value={money(faltaPagar)}
            emphasis
            valueColor={faltaPagar > 0 ? Theme.status.PENDENTE.text : Theme.status.PAGO.text}
          />
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  emphasis,
  valueColor,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  periodRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  pickerWrap: {
    flex: 1,
    minHeight: 56,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceAlt,
    justifyContent: 'center',
  },
  picker: {
    height: 56,
    color: Theme.colors.gray900,
  },
  painelSwitch: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
    gap: Theme.spacing.md,
  },
  painelBtn: {
    flex: 1,
    minHeight: 56,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  painelBtnText: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    includeFontPadding: false,
  },
  moduleCard: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    padding: Theme.spacing.lg,
    ...Theme.shadows.sm,
  },
  moduleHeading: {
    fontSize: 11,
    fontWeight: Theme.typography.fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.md,
    fontFamily: Theme.typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    minHeight: 48,
  },
  rowLabel: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: Theme.spacing.sm,
  },
  rowValue: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
    flexShrink: 0,
    textAlign: 'right',
  },
  rowValueEmphasis: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.xs,
  },
});
