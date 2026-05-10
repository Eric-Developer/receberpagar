import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { StatusPill, type MovementStatus } from '@/components/ui/StatusPill';
import { Theme } from '@/constants/theme';
import { db } from '@/database/database';
import {
  agendarLembreteVencimentoConta,
  cancelarNotificacaoAgendada,
  notificarMovimentoRegistrado,
} from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Item = {
  conta_id: number;
  tipo: 'RECEBER' | 'PAGAR';
  nome: string;
  pessoa: string;
  categoria: string;
  descricao: string;
  valor: number;
  parcelas: number;
  parcelas_pagas?: number;
  ativo?: number;
  status?: MovementStatus;
  status_calculado: MovementStatus;
  data_pagamento?: string;
  dia_vencimento: number;
  mes_inicio: number;
  ano_inicio: number;
  notification_id?: string;
};

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Mês abreviado — cabe melhor em telas estreitas */
const mesesAbrev = [
  'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
  'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
];

type AreaUi = 'ENTRADAS' | 'SAIDAS';

export default function MovimentacoesScreen() {
  const insets = useSafeAreaInsets();
  const hojeInicial = new Date();
  const [mes, setMes] = useState(hojeInicial.getMonth() + 1);
  const [ano, setAno] = useState(hojeInicial.getFullYear());
  const [fluxoArea, setFluxoArea] = useState<AreaUi>('ENTRADAS');
  const [statusFiltro, setStatusFiltro] = useState<MovementStatus | 'TODOS'>('TODOS');
  const [lista, setLista] = useState<Item[]>([]);
  const [proximosMeses, setProximosMeses] = useState<Record<number, boolean>>({});
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<{ receber: boolean; pagar: boolean }>({
    receber: true,
    pagar: true,
  });
  const fluxoAreaEfetiva: AreaUi =
    fluxosDisponiveis.receber && !fluxosDisponiveis.pagar
      ? 'ENTRADAS'
      : !fluxosDisponiveis.receber && fluxosDisponiveis.pagar
        ? 'SAIDAS'
        : fluxoArea;

  function getMonthIndex(anoRef: number, mesRef: number) {
    return anoRef * 12 + (mesRef - 1);
  }

  function proximoMesAno(mesBase: number, anoBase: number) {
    if (mesBase === 12) return { mes: 1, ano: anoBase + 1 };
    return { mes: mesBase + 1, ano: anoBase };
  }

  /** Valor que importa para o mês visível (parcela em saídas parceladas; valor mensal em entradas). */
  function getValorNoMes(item: Item) {
    if (item.tipo === 'PAGAR' && item.parcelas > 0) {
      return item.valor / item.parcelas;
    }
    return item.valor;
  }

  /** Total guardado na conta — em saídas parceladas é o valor total do contrato; em entradas, o valor da linha. */
  function getValorTotalContrato(item: Item) {
    return item.valor;
  }

  function carregar() {
    try {
      const hoje = new Date();
      const hojeDia = hoje.getDate();
      const hojeMes = hoje.getMonth() + 1;
      const hojeAno = hoje.getFullYear();

      const contas: Item[] = db.getAllSync<Item>(
        `SELECT a.id AS conta_id, a.tipo, a.nome, a.pessoa, a.categoria, a.descricao, a.valor, a.parcelas, a.parcelas_pagas, a.dia_vencimento,
                a.mes AS mes_inicio, a.ano AS ano_inicio, a.notification_id, a.ativo,
                p.status, p.data_pagamento
         FROM contas a
         LEFT JOIN pagamentos p
         ON a.id = p.conta_id AND p.mes = ? AND p.ano = ?
         WHERE a.tipo = 'PAGAR' OR (a.tipo = 'RECEBER' AND a.ativo = 1)
         ORDER BY a.tipo, a.nome`,
        [mes, ano]
      );

      const mesAtualIndex = getMonthIndex(ano, mes);
      const listaAtualizada = contas
        .filter((conta) => {
          const inicioIndex = getMonthIndex(conta.ano_inicio, conta.mes_inicio);
          const parcelasPagas = conta.parcelas_pagas || 0;

          if (conta.tipo === 'RECEBER') {
            return mesAtualIndex >= inicioIndex;
          }

          const fimIndex = inicioIndex + conta.parcelas - 1;
          if (mesAtualIndex < inicioIndex || mesAtualIndex > fimIndex) {
            return false;
          }

          return parcelasPagas < conta.parcelas;
        })
        .map((item) => {
          let status: MovementStatus = 'PENDENTE';

          if (item.status === 'PAGO') {
            status = 'PAGO';
          } else if (ano < hojeAno || (ano === hojeAno && mes < hojeMes)) {
            status = 'VENCIDO';
          } else if (ano === hojeAno && mes === hojeMes) {
            status = hojeDia > item.dia_vencimento ? 'VENCIDO' : 'PENDENTE';
          } else {
            status = 'PENDENTE';
          }

          return { ...item, status_calculado: status };
        });

      const temReceber = listaAtualizada.some((i) => i.tipo === 'RECEBER');
      const temPagar = listaAtualizada.some((i) => i.tipo === 'PAGAR');
      setFluxosDisponiveis({ receber: temReceber, pagar: temPagar });

      const areaEfetiva: AreaUi =
        temReceber && !temPagar ? 'ENTRADAS' : !temReceber && temPagar ? 'SAIDAS' : fluxoArea;

      const porStatus =
        statusFiltro === 'TODOS'
          ? listaAtualizada
          : listaAtualizada.filter((i) => i.status_calculado === statusFiltro);

      const tipoDb = areaEfetiva === 'ENTRADAS' ? 'RECEBER' : 'PAGAR';
      const porArea = porStatus.filter((i) => i.tipo === tipoDb);

      setLista(porArea);

      const contasMesmoFluxo = contas.filter((c) => c.tipo === tipoDb);
      verificarProximosMeses(contasMesmoFluxo);
    } catch (error) {
      console.log('ERRO AO CARREGAR:', error);
      Alert.alert('Erro', 'Falha ao carregar movimentações.');
    }
  }

  function verificarProximosMeses(contas: Item[]) {
    const proximos: Record<number, boolean> = {};

    for (let i = 1; i <= 3; i++) {
      let checkMes = mes + i;
      let checkAno = ano;

      if (checkMes > 12) {
        checkMes -= 12;
        checkAno++;
      }

      const temMovimentacao = contas.some((conta) => {
        const inicioIndex = getMonthIndex(conta.ano_inicio, conta.mes_inicio);
        const checkIndex = getMonthIndex(checkAno, checkMes);
        const parcelasPagas = conta.parcelas_pagas || 0;

        if (conta.tipo === 'RECEBER') {
          return checkIndex >= inicioIndex;
        }

        const fimIndex = inicioIndex + conta.parcelas - 1;
        if (checkIndex < inicioIndex || checkIndex > fimIndex) {
          return false;
        }

        return parcelasPagas < conta.parcelas;
      });

      if (temMovimentacao) {
        proximos[i] = true;
      }
    }

    setProximosMeses(proximos);
  }

  async function marcarComoPago(item: Item) {
    try {
      const dataPagamento = new Date().toISOString();
      const novasParcelas = (item.parcelas_pagas || 0) + 1;
      const valorParcela = item.tipo === 'PAGAR' ? item.valor / item.parcelas : item.valor;

      db.runSync(`UPDATE contas SET parcelas_pagas = ? WHERE id = ?`, [novasParcelas, item.conta_id]);

      if (item.notification_id) {
        await cancelarNotificacaoAgendada(item.notification_id);
        db.runSync(`UPDATE contas SET notification_id = '' WHERE id = ?`, [item.conta_id]);
      }

      db.runSync(
        `INSERT INTO pagamentos (conta_id, mes, ano, status, valor, data_pagamento)
         VALUES (?, ?, ?, 'PAGO', ?, ?)
         ON CONFLICT(conta_id, mes, ano)
         DO UPDATE SET status='PAGO', valor=?, data_pagamento=?`,
        [item.conta_id, mes, ano, valorParcela, dataPagamento, valorParcela, dataPagamento]
      );

      await notificarMovimentoRegistrado({
        tipo: item.tipo,
        nome: item.nome,
        valor: valorParcela,
      });

      const parcelasTotais = item.parcelas || 1;
      const encerrada = item.tipo === 'PAGAR' ? novasParcelas >= parcelasTotais : false;

      if (encerrada) {
        db.runSync(`UPDATE contas SET status = 'PAGO' WHERE id = ?`, [item.conta_id]);
      } else {
        const deveReagendar =
          (item.tipo === 'PAGAR' && novasParcelas < parcelasTotais) ||
          (item.tipo === 'RECEBER' && item.ativo === 1);

        if (deveReagendar) {
          const next = proximoMesAno(mes, ano);
          await agendarLembreteVencimentoConta({
            id: item.conta_id,
            tipo: item.tipo,
            nome: item.nome,
            valor: item.valor,
            parcelas: item.parcelas,
            dia_vencimento: item.dia_vencimento,
            mes: next.mes,
            ano: next.ano,
            status: 'PENDENTE',
          });
        }
      }

      carregar();
    } catch (error) {
      console.log('ERRO AO MARCAR COMO PAGO:', error);
      Alert.alert('Erro', 'Não foi possível marcar como pago.');
    }
  }

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;

    if (novoMes > 12) {
      novoMes = 1;
      novoAno++;
    }
    if (novoMes < 1) {
      novoMes = 12;
      novoAno--;
    }

    setMes(novoMes);
    setAno(novoAno);
  }

  async function exportarPDF() {
    try {
      if (lista.length === 0) {
        Alert.alert('Nenhum dado', 'Não há linhas para exportar neste filtro.');
        return;
      }

      const statusPdf: Record<MovementStatus, string> = {
        PAGO: Theme.status.PAGO.label,
        PENDENTE: Theme.status.PENDENTE.label,
        VENCIDO: Theme.status.VENCIDO.label,
      };

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; background: #f4f4f6; color: #18181b; }
              h1 { font-size: 22px; margin: 0 0 8px; }
              .periodo { color: #52525b; font-size: 14px; margin-bottom: 20px; }
              table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 12px; overflow: hidden; }
              th, td { border-bottom: 1px solid #e4e4e7; padding: 12px 14px; text-align: left; font-size: 13px; }
              th { background: #18181b; color: #fafafa; font-weight: 600; }
              .muted { color: #71717a; font-size: 12px; }
              .total { font-weight: 700; background: #fafafa; }
            </style>
          </head>
          <body>
            <h1>Fluxo · ${fluxoAreaEfetiva === 'ENTRADAS' ? 'Entradas' : 'Saídas'}</h1>
            <div class="periodo">${meses[mes - 1]} ${ano}</div>
            <table>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Parcelas</th>
                <th>Status</th>
                <th>Venc.</th>
              </tr>
              ${lista
                .map((i) => {
                  const noMes = getValorNoMes(i);
                  const totalContrato = getValorTotalContrato(i);
                  const valorCell =
                    i.tipo === 'PAGAR' && i.parcelas > 1
                      ? `Total R$ ${totalContrato.toFixed(2)} · Parcela R$ ${noMes.toFixed(2)}`
                      : `R$ ${noMes.toFixed(2)}`;
                  return `
                <tr>
                  <td>${i.nome}</td>
                  <td>${valorCell}</td>
                  <td>${i.parcelas_pagas || 0}/${i.parcelas}</td>
                  <td>${statusPdf[i.status_calculado]}</td>
                  <td>${String(i.dia_vencimento).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}</td>
                </tr>`;
                })
                .join('')}
              <tr class="total">
                <td>Total no mês</td>
                <td colspan="4">R$ ${lista.reduce((sum, i) => sum + getValorNoMes(i), 0).toFixed(2)}</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.log('ERRO AO EXPORTAR PDF:', error);
      Alert.alert('Erro', 'Falha ao exportar PDF.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [mes, ano, statusFiltro, fluxoArea])
  );

  function renderListItem({ item }: { item: Item }) {
    const valorMes = getValorNoMes(item);
    const totalContrato = getValorTotalContrato(item);
    const stripe =
      fluxoAreaEfetiva === 'ENTRADAS' ? Theme.flow.RECEBER.stripe : Theme.flow.PAGAR.stripe;
    const vencStr = `${String(item.dia_vencimento).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
    const ctaLabel =
      item.tipo === 'RECEBER' ? 'Registrar recebimento' : 'Registrar pagamento';
    const saidaParcelada = item.tipo === 'PAGAR' && item.parcelas > 1;

    return (
      <View style={[styles.card, { borderLeftColor: stripe }]}>
        <View style={styles.cardHead}>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.nome}
            </Text>
            {item.descricao ? (
              <Text style={styles.cardSub} numberOfLines={2}>
                {item.descricao}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statusRow}>
          <StatusPill status={item.status_calculado} prominent />
        </View>

        {item.tipo === 'PAGAR' ? (
          saidaParcelada ? (
            <>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Total do contrato</Text>
                <Text style={styles.metaValueStrong}>
                  {totalContrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Parcela neste mês</Text>
                <Text style={styles.metaValueSoft}>
                  {valorMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total</Text>
              <Text style={styles.metaValueStrong}>
                {totalContrato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Valor no mês</Text>
            <Text style={styles.metaValueSoft}>
              {valorMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        )}

        <View style={styles.inlineMeta}>
          {item.tipo === 'PAGAR' ? (
            <Text style={styles.inlineText}>
              Parcelas {(item.parcelas_pagas || 0)}/{item.parcelas}
            </Text>
          ) : (
            <Text style={styles.inlineText}>{item.ativo === 1 ? 'Recorrente ativo' : 'Inativo'}</Text>
          )}
          <Text style={styles.inlineDot}>·</Text>
          <Text style={styles.inlineText}>Vence {vencStr}</Text>
        </View>

        {item.status_calculado !== 'PAGO' ? (
          <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]} onPress={() => marcarComoPago(item)}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color={Theme.colors.white} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Movimentações"
        subtitle={
          fluxosDisponiveis.receber && !fluxosDisponiveis.pagar
            ? 'Entradas'
            : !fluxosDisponiveis.receber && fluxosDisponiveis.pagar
              ? 'Saídas'
              : fluxoAreaEfetiva === 'ENTRADAS'
                ? 'Entradas'
                : 'Saídas'
        }
        showBack={false}
        showLogo
      />

      {fluxosDisponiveis.receber && fluxosDisponiveis.pagar ? (
      <View style={styles.fluxoBar}>
        <Pressable
          onPress={() => setFluxoArea('ENTRADAS')}
          style={[styles.fluxoBtn, fluxoAreaEfetiva === 'ENTRADAS' && styles.fluxoBtnEntradaOn]}
        >
          <Text style={[styles.fluxoBtnText, fluxoAreaEfetiva === 'ENTRADAS' && styles.fluxoBtnTextOn]}>Entradas</Text>
        </Pressable>
        <Pressable
          onPress={() => setFluxoArea('SAIDAS')}
          style={[styles.fluxoBtn, fluxoAreaEfetiva === 'SAIDAS' && styles.fluxoBtnSaidaOn]}
        >
          <Text style={[styles.fluxoBtnText, fluxoAreaEfetiva === 'SAIDAS' && styles.fluxoBtnTextOn]}>Saídas</Text>
        </Pressable>
      </View>
      ) : null}

      <View style={styles.periodCard}>
        <View style={styles.monthBar}>
          <Pressable onPress={() => mudarMes(-1)} style={styles.monthNavBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Theme.colors.gray800} />
          </Pressable>
          <View style={styles.monthCenter} pointerEvents="none">
            <Text style={styles.monthPrimary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {mesesAbrev[mes - 1]} {ano}
            </Text>
            <Text style={styles.monthSecondary} numberOfLines={1}>
              {meses[mes - 1]}
            </Text>
          </View>
          <Pressable onPress={() => mudarMes(1)} style={styles.monthNavBtn} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.gray800} />
          </Pressable>
        </View>

        {Object.values(proximosMeses).some((v) => v) ? (
          <View style={styles.hintInline}>
            <Text style={styles.hintInlineLabel}>Próx.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hintScroll}>
              {[1, 2, 3].map((i) => {
                let nextMes = mes + i;
                let nextAno = ano;
                if (nextMes > 12) {
                  nextMes -= 12;
                  nextAno++;
                }
                const active = proximosMeses[i];
                return (
                  <View key={i} style={[styles.hintChip, active && styles.hintChipOn]}>
                    <Text style={[styles.hintChipText, active && styles.hintChipTextOn]} numberOfLines={1}>
                      {mesesAbrev[nextMes - 1]} {String(nextAno).slice(-2)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollInner}
        >
          {(['TODOS', 'PAGO', 'PENDENTE', 'VENCIDO'] as const).map((s) => {
            const active = statusFiltro === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatusFiltro(s)}
                style={[styles.filterPill, active && styles.filterChipOn]}
              >
                <Text style={[styles.filterPillText, active && styles.filterChipTextOn]}>
                  {s === 'TODOS' ? 'Todos' : Theme.status[s].label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Pressable style={styles.pdfBtn} onPress={exportarPDF} hitSlop={6}>
        <Ionicons name="document-text-outline" size={16} color={Theme.colors.gray700} />
        <Text style={styles.pdfBtnText}>PDF</Text>
      </Pressable>

      <FlatList
        data={lista}
        keyExtractor={(item) => `${item.conta_id}-${item.tipo}`}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={Theme.colors.gray400} />
            <Text style={styles.emptyText}>
              Sem {fluxoAreaEfetiva === 'ENTRADAS' ? 'entradas' : 'saídas'} neste período e filtros.
            </Text>
          </View>
        }
        renderItem={renderListItem}
        contentContainerStyle={[styles.listPad, { paddingBottom: Theme.spacing.xl + insets.bottom }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  fluxoBar: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
  },
  fluxoBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceAlt,
    alignItems: 'center',
  },
  fluxoBtnEntradaOn: {
    borderColor: Theme.flow.RECEBER.stripe,
    backgroundColor: Theme.flow.RECEBER.mutedBg,
  },
  fluxoBtnSaidaOn: {
    borderColor: Theme.flow.PAGAR.stripe,
    backgroundColor: Theme.flow.PAGAR.mutedBg,
  },
  fluxoBtnText: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  fluxoBtnTextOn: {
    color: Theme.colors.gray900,
  },
  periodCard: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderLight,
    overflow: 'hidden',
    ...Theme.shadows.sm,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.xs,
    backgroundColor: Theme.colors.surface,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexShrink: 0,
  },
  monthCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xs,
  },
  monthPrimary: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
  },
  monthSecondary: {
    marginTop: 2,
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
  },
  hintInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.borderLight,
    gap: Theme.spacing.sm,
  },
  hintInlineLabel: {
    fontSize: 10,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Theme.typography.fontFamily,
    flexShrink: 0,
  },
  hintScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: Theme.spacing.sm,
  },
  hintChip: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  hintChipOn: {
    backgroundColor: Theme.colors.gray800,
    borderColor: Theme.colors.gray800,
  },
  hintChipText: {
    fontSize: 11,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  hintChipTextOn: {
    color: Theme.colors.gray50,
  },
  filterBar: {
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.sm,
  },
  filterScrollInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipOn: {
    backgroundColor: Theme.colors.gray900,
    borderColor: Theme.colors.gray900,
  },
  filterPillText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  filterChipTextOn: {
    color: Theme.colors.gray50,
    fontWeight: Theme.typography.fontWeight.semibold,
  },
  pdfBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceAlt,
  },
  pdfBtnText: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray700,
    fontFamily: Theme.typography.fontFamily,
  },
  listPad: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
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
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
  },
  cardSub: {
    marginTop: 4,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
    lineHeight: 20,
  },
  statusRow: {
    marginTop: Theme.spacing.sm,
    alignItems: 'flex-start',
  },
  metaRow: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  metaLabel: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValueSoft: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  metaValueStrong: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
    flexWrap: 'wrap',
  },
  inlineText: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
  },
  inlineDot: {
    fontSize: Theme.typography.fontSize.xs,
    color: Theme.colors.gray300,
    marginHorizontal: 6,
  },
  cta: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.primary,
  },
  ctaText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.white,
    fontFamily: Theme.typography.fontFamily,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: Theme.spacing.sm,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textMuted,
    fontFamily: Theme.typography.fontFamily,
  },
});
