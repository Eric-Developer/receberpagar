import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Theme } from '@/constants/theme';
import { db } from '@/database/database';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Conta = {
  id: number;
  tipo: 'RECEBER' | 'PAGAR';
  nome: string;
  pessoa: string;
  descricao: string;
  categoria: string;
  valor: number;
  parcelas?: number;
  parcelas_pagas?: number;
  ativo?: number;
  dia_vencimento: number;
  mes: number;
  ano: number;
  status: string;
};

/** Área da UI — não misturar listas */
type Area = 'ENTRADAS' | 'SAIDAS';
type EntradaSub = 'ATIVOS' | 'INATIVOS';

function getContaGroupKey(conta: Conta) {
  return `${conta.tipo}|${conta.nome}|${conta.pessoa}|${conta.categoria}|${conta.descricao}|${conta.valor}|${conta.dia_vencimento}|${conta.parcelas ?? 1}|${conta.ativo ?? 0}`;
}

export default function ContasScreen() {
  const insets = useSafeAreaInsets();
  const [contas, setContas] = useState<Conta[]>([]);
  const [area, setArea] = useState<Area>('ENTRADAS');
  const [entradaSub, setEntradaSub] = useState<EntradaSub>('ATIVOS');

  function carregarContas() {
    const result = db.getAllSync<Conta>(
      `SELECT * FROM contas
       WHERE tipo = 'RECEBER'
          OR (tipo = 'PAGAR' AND COALESCE(parcelas_pagas, 0) < COALESCE(parcelas, 1))
       ORDER BY tipo DESC, nome, ano, mes`
    );

    const seen = new Set<string>();
    const contasUnicas: Conta[] = [];

    result.forEach((conta) => {
      const key = getContaGroupKey(conta);
      if (!seen.has(key)) {
        seen.add(key);
        contasUnicas.push(conta);
      }
    });

    setContas(contasUnicas);
  }

  function excluirConta(id: number, nome: string) {
    Alert.alert(
      'Excluir registro',
      `Excluir "${nome}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const conta = db.getFirstSync<Conta>(`SELECT * FROM contas WHERE id = ?`, [id]);
            if (conta) {
              const params = [
                conta.tipo,
                conta.nome,
                conta.pessoa,
                conta.categoria,
                conta.descricao,
                conta.valor,
                conta.dia_vencimento,
                conta.parcelas ?? 1,
                conta.ativo ?? 0,
              ];

              db.runSync(
                `DELETE FROM pagamentos WHERE conta_id IN (
                   SELECT id FROM contas WHERE tipo = ? AND nome = ? AND pessoa = ? AND categoria = ? AND descricao = ? AND valor = ? AND dia_vencimento = ? AND parcelas = ? AND ativo = ?
                 )`,
                params
              );

              db.runSync(
                `DELETE FROM contas WHERE tipo = ? AND nome = ? AND pessoa = ? AND categoria = ? AND descricao = ? AND valor = ? AND dia_vencimento = ? AND parcelas = ? AND ativo = ?`,
                params
              );
            }

            carregarContas();
            Alert.alert('Sucesso', 'Registro excluído.');
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      carregarContas();
    }, [])
  );

  const totalEntradas = useMemo(
    () =>
      contas
        .filter((c) => c.tipo === 'RECEBER' && c.ativo === 1)
        .reduce((sum, c) => sum + c.valor, 0),
    [contas]
  );

  const totalSaidasAberto = useMemo(
    () =>
      contas
        .filter((c) => c.tipo === 'PAGAR')
        .reduce((sum, c) => {
          const parcelasTotais = c.parcelas || 1;
          const parcelasPagas = c.parcelas_pagas || 0;
          const parcelasRestantes = Math.max(parcelasTotais - parcelasPagas, 0);
          return sum + parcelasRestantes * (c.valor / parcelasTotais);
        }, 0),
    [contas]
  );

  const temEntradas = useMemo(() => contas.some((c) => c.tipo === 'RECEBER'), [contas]);
  const temSaidas = useMemo(() => contas.some((c) => c.tipo === 'PAGAR'), [contas]);
  const areaEfetiva: Area =
    temEntradas && !temSaidas ? 'ENTRADAS' : !temEntradas && temSaidas ? 'SAIDAS' : area;

  const listaFiltrada = useMemo(() => {
    if (areaEfetiva === 'SAIDAS') {
      return contas.filter((c) => c.tipo === 'PAGAR' && (c.parcelas_pagas || 0) < (c.parcelas || 1));
    }
    return contas.filter((c) => {
      if (c.tipo !== 'RECEBER') return false;
      return entradaSub === 'ATIVOS' ? c.ativo === 1 : c.ativo !== 1;
    });
  }, [contas, areaEfetiva, entradaSub]);

  const flowAtual = areaEfetiva === 'ENTRADAS' ? Theme.flow.RECEBER : Theme.flow.PAGAR;
  const valorHero =
    areaEfetiva === 'ENTRADAS' ? totalEntradas : totalSaidasAberto;

  const renderCardConta = (item: Conta) => {
    const isEntrada = item.tipo === 'RECEBER';
    const stripe = Theme.flow[item.tipo].stripe;
    const parcela = item.parcelas_pagas || 0;
    const totalParcelas = item.parcelas || 1;
    const parcelasRestantes = totalParcelas - parcela;
    const percentualPago = isEntrada ? 0 : (parcela / totalParcelas) * 100;

    return (
      <View style={[styles.card, { borderLeftColor: stripe }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardNome} numberOfLines={2}>
              {item.nome}
            </Text>
            {item.pessoa ? (
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.pessoa}
              </Text>
            ) : null}
          </View>
        </View>

        {item.descricao ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.descricao}
          </Text>
        ) : null}

        <View style={styles.cardMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Valor</Text>
            <Text style={styles.metricValue}>
              {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Vencimento</Text>
            <Text style={styles.metricValueMuted}>Dia {String(item.dia_vencimento).padStart(2, '0')}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{isEntrada ? 'Situação' : 'Parcelas'}</Text>
            <Text style={styles.metricValueMuted}>
              {isEntrada ? (item.ativo ? 'Ativa' : 'Inativa') : `${parcela} de ${totalParcelas}`}
            </Text>
          </View>
        </View>

        {item.categoria ? (
          <Text style={styles.categoriaChip} numberOfLines={1}>
            {item.categoria.trim()}
          </Text>
        ) : null}

        {!isEntrada && totalParcelas > 1 ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, percentualPago)}%` }]} />
            </View>
            <Text style={styles.progressCaption}>
              {parcelasRestantes} parcela{parcelasRestantes !== 1 ? 's' : ''} em aberto
            </Text>
          </View>
        ) : null}

        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
            onPress={() => router.push(`/editar-conta?id=${item.id}`)}
          >
            <Ionicons name="create-outline" size={18} color={Theme.colors.primaryDark} />
            <Text style={styles.btnGhostText}>Editar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnDangerGhost, pressed && styles.pressed]}
            onPress={() => excluirConta(item.id, item.nome)}
          >
            <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
            <Text style={styles.btnDangerText}>Excluir</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Fluxo" subtitle="Suas contas" showBack={false} showLogo />

      {temEntradas && temSaidas ? (
      <View style={styles.areaSwitch}>
        <Pressable
          onPress={() => setArea('ENTRADAS')}
          style={[styles.areaChip, areaEfetiva === 'ENTRADAS' && { ...styles.areaChipOn, borderColor: Theme.flow.RECEBER.stripe }]}
        >
          <Text
            style={[
              styles.areaChipText,
              areaEfetiva === 'ENTRADAS' && { color: Theme.flow.RECEBER.text, fontWeight: Theme.typography.fontWeight.bold },
            ]}
          >
            Entradas
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setArea('SAIDAS')}
          style={[styles.areaChip, areaEfetiva === 'SAIDAS' && { ...styles.areaChipOn, borderColor: Theme.flow.PAGAR.stripe }]}
        >
          <Text
            style={[
              styles.areaChipText,
              areaEfetiva === 'SAIDAS' && { color: Theme.flow.PAGAR.text, fontWeight: Theme.typography.fontWeight.bold },
            ]}
          >
            Saídas
          </Text>
        </Pressable>
      </View>
      ) : null}

      <View style={[styles.hero, { borderColor: flowAtual.border, backgroundColor: flowAtual.mutedBg }]}>
        <Text style={[styles.heroEyebrow, { color: flowAtual.accent }]}>
          {areaEfetiva === 'ENTRADAS' ? 'Previsto em entradas ativas' : 'Saldo restante em parcelas'}
        </Text>
        <Text style={styles.heroValue}>
          {valorHero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>

      {areaEfetiva === 'ENTRADAS' ? (
        <View style={styles.subSwitch}>
          <Pressable
            style={[styles.subChip, entradaSub === 'ATIVOS' && styles.subChipOn]}
            onPress={() => setEntradaSub('ATIVOS')}
          >
            <Text style={[styles.subChipText, entradaSub === 'ATIVOS' && styles.subChipTextOn]}>Ativas</Text>
          </Pressable>
          <Pressable
            style={[styles.subChip, entradaSub === 'INATIVOS' && styles.subChipOn]}
            onPress={() => setEntradaSub('INATIVOS')}
          >
            <Text style={[styles.subChipText, entradaSub === 'INATIVOS' && styles.subChipTextOn]}>Inativas</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.subPlaceholder} />
      )}

      <FlatList
        data={listaFiltrada}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={36} color={Theme.colors.gray400} />
            <Text style={styles.emptyTitle}>Nenhum item</Text>
            <Text style={styles.emptySub}>
              {areaEfetiva === 'ENTRADAS'
                ? entradaSub === 'ATIVOS'
                  ? 'Inclua uma entrada na aba Adicionar.'
                  : 'Não há entradas inativas.'
                : 'Inclua uma saída na aba Adicionar.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => renderCardConta(item)}
        contentContainerStyle={styles.listContent}
      />

      <Pressable
        style={[styles.fab, { bottom: Math.max(20, insets.bottom + 16) }]}
        onPress={() => router.push('/(tabs)/nova-conta')}
      >
        <Ionicons name="add" size={28} color={Theme.colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  areaSwitch: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  areaChip: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  areaChipOn: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 2,
  },
  areaChipText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  hero: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    ...Theme.shadows.sm,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: Theme.typography.fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: Theme.typography.fontFamily,
  },
  heroValue: {
    marginTop: Theme.spacing.sm,
    fontSize: Theme.typography.fontSize['2xl'],
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    letterSpacing: -0.5,
    fontFamily: Theme.typography.fontFamily,
  },
  subSwitch: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  subChip: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
  },
  subChipOn: {
    backgroundColor: Theme.colors.gray900,
    borderColor: Theme.colors.gray900,
  },
  subChipText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  subChipTextOn: {
    color: Theme.colors.gray50,
    fontWeight: Theme.typography.fontWeight.semibold,
  },
  subPlaceholder: {
    height: Theme.spacing.sm,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: 120,
    paddingTop: Theme.spacing.md,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
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
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardNome: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  cardDesc: {
    marginTop: Theme.spacing.sm,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 20,
  },
  cardMetrics: {
    flexDirection: 'row',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    gap: Theme.spacing.sm,
  },
  metric: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Theme.typography.fontFamily,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray800,
    fontFamily: Theme.typography.fontFamily,
  },
  metricValueMuted: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  categoriaChip: {
    alignSelf: 'flex-start',
    marginTop: Theme.spacing.sm,
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
  },
  progressBlock: {
    marginTop: Theme.spacing.md,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Theme.colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 2,
  },
  progressCaption: {
    marginTop: 6,
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  btnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceAlt,
  },
  btnGhostText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.primaryDark,
    fontFamily: Theme.typography.fontFamily,
  },
  btnDangerGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.status.VENCIDO.border,
    backgroundColor: Theme.status.VENCIDO.bg,
  },
  btnDangerText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.danger,
    fontFamily: Theme.typography.fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyTitle: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray800,
    fontFamily: Theme.typography.fontFamily,
  },
  emptySub: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: Theme.typography.fontFamily,
  },
  fab: {
    position: 'absolute',
    right: Theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.lg,
  },
});
