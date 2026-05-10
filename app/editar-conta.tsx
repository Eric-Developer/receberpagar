import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Theme } from '@/constants/theme';
import { db } from '@/database/database';
import {
  agendarLembreteVencimentoConta,
  cancelarNotificacaoAgendada,
  notificarMovimentoRegistrado,
} from '@/services/notifications';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const categorias = [
  'Aula',
  'Aluguel',
  'Material',
  'Internet',
  'Energia',
  'Salário',
  'Transferência',
  'Outros',
];

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function normalizeCategoria(raw: string) {
  const t = raw.trim();
  if (categorias.includes(t)) return t;
  const tail = t.split(/\s+/).filter(Boolean).pop() || '';
  if (categorias.includes(tail)) return tail;
  return 'Outros';
}

export default function EditarContaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hoje = new Date();

  const [tipo, setTipo] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
  const [status, setStatus] = useState<'PENDENTE' | 'PAGO'>('PENDENTE');
  const [nome, setNome] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [parcelas, setParcelas] = useState(1);
  const [ativo, setAtivo] = useState(1);
  const [notificationId, setNotificationId] = useState('');
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<{ receber: boolean; pagar: boolean }>({
    receber: true,
    pagar: true,
  });

  const valorNumerico = useMemo(() => Number(valor.replace(/\D/g, '')) / 100, [valor]);

  const valorParcela = useMemo(() => valorNumerico, [valorNumerico]);

  const valorTotal = useMemo(
    () => (tipo === 'PAGAR' ? valorNumerico * Math.max(parcelas, 1) : valorNumerico),
    [parcelas, tipo, valorNumerico]
  );

  const anoVencimento = useMemo(() => {
    const dia = Number(diaVencimento);
    const anoAtual = hoje.getFullYear();

    if (!diaVencimento) return ano;
    if (ano > anoAtual) return ano;

    const mesAtual = hoje.getMonth() + 1;
    if (mes < mesAtual || (mes === mesAtual && dia < hoje.getDate())) {
      return anoAtual + 1;
    }
    return anoAtual;
  }, [diaVencimento, mes, ano, hoje]);

  useEffect(() => {
    const tipos = db.getAllSync<{ tipo: 'RECEBER' | 'PAGAR' }>(`SELECT DISTINCT tipo FROM contas`);
    const receber = tipos.some((t) => t.tipo === 'RECEBER');
    const pagar = tipos.some((t) => t.tipo === 'PAGAR');
    setFluxosDisponiveis({ receber, pagar });
    if (receber && !pagar) setTipo('RECEBER');
    if (!receber && pagar) setTipo('PAGAR');

    if (!id) return;

    const conta = db.getFirstSync<{
      tipo: 'RECEBER' | 'PAGAR';
      status: string;
      nome: string;
      pessoa: string;
      categoria: string;
      descricao: string;
      valor: number;
      parcelas: number;
      dia_vencimento: number;
      mes: number;
      ano: number;
      ativo: number;
      notification_id?: string;
    }>('SELECT * FROM contas WHERE id = ?', [id]);

    if (conta) {
      setTipo(conta.tipo);
      setStatus(conta.status === 'PAGO' ? 'PAGO' : 'PENDENTE');
      setNome(conta.nome);
      setPessoa(conta.pessoa);
      setCategoria(normalizeCategoria(conta.categoria || ''));
      setDescricao(conta.descricao);
      const parcelasConta = conta.parcelas || 1;
      const valorPorParcela = conta.tipo === 'PAGAR' ? conta.valor / parcelasConta : conta.valor;
      setValor(
        valorPorParcela.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      );
      setDiaVencimento(String(conta.dia_vencimento));
      setMes(conta.mes);
      setAno(conta.ano);
      setParcelas(conta.parcelas || 1);
      setAtivo(conta.ativo ?? 1);
      setNotificationId(conta.notification_id || '');
    }
  }, [id]);

  function formatarValor(text: string) {
    const numeros = text.replace(/\D/g, '');
    const numero = Number(numeros) / 100;
    setValor(
      numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    );
  }

  async function salvar() {
    if (!nome.trim() || !valorNumerico || !diaVencimento.trim()) {
      Alert.alert('Erro', 'Preencha nome, valor e dia de vencimento');
      return;
    }

    const categoriaLimpa = categoria.trim();
    const total = tipo === 'PAGAR' ? valorNumerico * Math.max(parcelas, 1) : valorNumerico;

    db.runSync(
      `UPDATE contas SET tipo = ?, status = ?, nome = ?, pessoa = ?, categoria = ?, descricao = ?, valor = ?, parcelas = ?, dia_vencimento = ?, mes = ?, ano = ?, ativo = ? WHERE id = ?`,
      [
        tipo,
        status,
        nome.trim(),
        pessoa.trim(),
        categoriaLimpa,
        descricao.trim(),
        total,
        tipo === 'PAGAR' ? parcelas : 1,
        Number(diaVencimento),
        mes,
        anoVencimento,
        tipo === 'PAGAR' ? 1 : ativo,
        id,
      ]
    );

    if (notificationId) {
      await cancelarNotificacaoAgendada(notificationId);
    }

    if (status === 'PAGO') {
      const dataPagamento = new Date().toISOString();
      db.runSync(
        `INSERT INTO pagamentos (conta_id, mes, ano, status, valor, data_pagamento)
         VALUES (?, ?, ?, 'PAGO', ?, ?)
         ON CONFLICT(conta_id, mes, ano)
         DO UPDATE SET status='PAGO', valor=?, data_pagamento=?`,
        [Number(id), mes, anoVencimento, total, dataPagamento, total, dataPagamento]
      );

      await notificarMovimentoRegistrado({
        tipo,
        nome: nome.trim(),
        valor: total,
      });
      db.runSync(`UPDATE contas SET notification_id = '' WHERE id = ?`, [id]);
    }

    if (status === 'PENDENTE') {
      await agendarLembreteVencimentoConta({
        id: Number(id),
        tipo,
        nome: nome.trim(),
        valor: total,
        parcelas: tipo === 'PAGAR' ? parcelas : 1,
        dia_vencimento: Number(diaVencimento),
        mes,
        ano: anoVencimento,
        status,
      });
    }

    Alert.alert('Sucesso', 'Lançamento atualizado.');
    router.back();
  }

  const isDisabled = !nome.trim() || !valorNumerico || !diaVencimento.trim();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Editar lançamento"
          subtitle="Fluxo"
          showBack
          showLogo
        />

        <View style={styles.conteudo}>
          {fluxosDisponiveis.receber && fluxosDisponiveis.pagar ? (
          <View style={styles.secao}>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tipoContainer}>
              <TouchableOpacity
                style={[
                  styles.tipoBotao,
                  tipo === 'RECEBER' && {
                    backgroundColor: Theme.flow.RECEBER.mutedBg,
                    borderColor: Theme.flow.RECEBER.border,
                  },
                ]}
                onPress={() => {
                  setTipo('RECEBER');
                  setParcelas(1);
                }}
              >
                <Text
                  style={[
                    styles.tipoBotaoTexto,
                    tipo === 'RECEBER' && { color: Theme.flow.RECEBER.text, fontWeight: Theme.typography.fontWeight.bold },
                  ]}
                >
                  Entradas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tipoBotao,
                  tipo === 'PAGAR' && {
                    backgroundColor: Theme.flow.PAGAR.mutedBg,
                    borderColor: Theme.flow.PAGAR.border,
                  },
                ]}
                onPress={() => {
                  setTipo('PAGAR');
                  setAtivo(1);
                }}
              >
                <Text
                  style={[
                    styles.tipoBotaoTexto,
                    tipo === 'PAGAR' && { color: Theme.flow.PAGAR.text, fontWeight: Theme.typography.fontWeight.bold },
                  ]}
                >
                  Saídas
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : null}

          <View style={styles.secao}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Cliente, fornecedor"
              placeholderTextColor={Theme.colors.gray400}
              value={nome}
              onChangeText={setNome}
            />
          </View>

          <View style={styles.secao}>
            <Text style={styles.label}>Pessoa (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: João Silva"
              placeholderTextColor={Theme.colors.gray400}
              value={pessoa}
              onChangeText={setPessoa}
            />
          </View>

          <View style={styles.secao}>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categoria}
                onValueChange={setCategoria}
                style={styles.picker}
                dropdownIconColor={Theme.colors.gray700}
              >
                {categorias.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} color={Theme.colors.gray900} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.secao}>
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Ex: Pagamento referente a…"
              placeholderTextColor={Theme.colors.gray400}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.secao}>
            <Text style={styles.label}>{tipo === 'PAGAR' ? 'Valor por parcela' : 'Valor'}</Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={Theme.colors.gray400}
              value={valor}
              onChangeText={formatarValor}
              keyboardType="numeric"
            />
            {valorNumerico > 0 && (
              <Text style={styles.infoText}>
                {tipo === 'PAGAR'
                  ? `Parcela: ${valor} · Total: ${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : `Valor: ${valor}`}
              </Text>
            )}
          </View>

          {tipo === 'PAGAR' ? (
            <View style={styles.secao}>
              <Text style={styles.label}>Parcelas</Text>
              <View style={styles.parcelasContainer}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.parcelaBotao, parcelas === p && styles.parcelaBotaoAtivo]}
                    onPress={() => setParcelas(p)}
                  >
                    <Text style={[styles.parcelaBotaoTexto, parcelas === p && styles.parcelaBotaoTextoAtivo]}>
                      {p}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {parcelas > 1 && (
                <Text style={styles.infoText}>
                  Cada parcela:{' '}
                  {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.secao}>
              <Text style={styles.label}>Recorrência</Text>
              <View style={styles.tipoContainer}>
                <TouchableOpacity
                  style={[styles.tipoBotao, ativo === 1 && styles.tipoBotaoAtivo]}
                  onPress={() => setAtivo(1)}
                >
                  <Text style={[styles.tipoBotaoTexto, ativo === 1 && styles.tipoBotaoTextoAtivo]}>Ativo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tipoBotao, ativo === 0 && styles.tipoBotaoAtivo]}
                  onPress={() => setAtivo(0)}
                >
                  <Text style={[styles.tipoBotaoTexto, ativo === 0 && styles.tipoBotaoTextoAtivo]}>Inativo</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.infoText}>
                {ativo ? 'Aparece em todos os meses' : 'Apenas neste mês'}
              </Text>
            </View>
          )}

          <View style={styles.secao}>
            <Text style={styles.label}>Dia do vencimento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 15"
              placeholderTextColor={Theme.colors.gray400}
              value={diaVencimento}
              onChangeText={(text) => setDiaVencimento(text.replace(/\D/g, '').slice(0, 2))}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={styles.infoText}>Dia do mês (1–31)</Text>
          </View>

          <View style={styles.secao}>
            <Text style={styles.label}>Período</Text>
            <View style={styles.mesAnoContainer}>
              <View style={styles.mesAnoItem}>
                <Text style={styles.mesAnoLabel}>Mês</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={mes}
                    onValueChange={(v) => setMes(v)}
                    style={styles.picker}
                    dropdownIconColor={Theme.colors.gray700}
                  >
                    {meses.map((m, index) => (
                      <Picker.Item key={index} label={m} value={index + 1} color={Theme.colors.gray900} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.mesAnoItem}>
                <Text style={styles.mesAnoLabel}>Ano</Text>
                <TextInput
                  style={[styles.input, styles.anoInput]}
                  value={String(ano)}
                  onChangeText={(text) => setAno(Number(text) || hoje.getFullYear())}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>
            <Text style={styles.infoText}>
              Vencimento: {String(parseInt(diaVencimento, 10) || 1).padStart(2, '0')}/
              {String(mes).padStart(2, '0')}/{anoVencimento}
            </Text>
          </View>

          <View style={styles.secao}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.tipoContainer}>
              <TouchableOpacity
                style={[styles.tipoBotao, status === 'PENDENTE' && styles.tipoBotaoAtivo]}
                onPress={() => setStatus('PENDENTE')}
              >
                <Text style={[styles.tipoBotaoTexto, status === 'PENDENTE' && styles.tipoBotaoTextoAtivo]}>
                  Pendente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoBotao, status === 'PAGO' && styles.tipoBotaoAtivo]}
                onPress={() => setStatus('PAGO')}
              >
                <Text style={[styles.tipoBotaoTexto, status === 'PAGO' && styles.tipoBotaoTextoAtivo]}>
                  Pago
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {nome && valorNumerico > 0 && (
            <View style={styles.resumo}>
              <Text style={styles.resumoTitulo}>Resumo</Text>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Tipo</Text>
                <Text style={styles.resumoValor}>{tipo === 'RECEBER' ? 'Entradas' : 'Saídas'}</Text>
              </View>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Valor exibido</Text>
                <Text style={styles.resumoValor}>{valor}</Text>
              </View>
              {tipo === 'PAGAR' ? (
                <View style={styles.resumoLinha}>
                  <Text style={styles.resumoLabel}>Parcelas</Text>
                  <Text style={styles.resumoValor}>
                    {parcelas}x de{' '}
                    {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
              ) : (
                <View style={styles.resumoLinha}>
                  <Text style={styles.resumoLabel}>Recorrente</Text>
                  <Text style={styles.resumoValor}>{ativo ? 'Sim' : 'Não'}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.botoes}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={() => router.back()}>
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botaoSalvar, isDisabled && styles.botaoDisabled]}
              onPress={salvar}
              disabled={isDisabled}
            >
              <Text style={styles.botaoSalvarTexto}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Theme.spacing['2xl'],
  },
  conteudo: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  secao: {
    marginBottom: Theme.spacing.xl,
  },
  label: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray700,
    marginBottom: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.gray900,
    backgroundColor: Theme.colors.surface,
    fontFamily: Theme.typography.fontFamily,
    ...Theme.shadows.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 88,
  },
  anoInput: {
    textAlign: 'center',
  },
  infoText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.gray500,
    marginTop: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  tipoBotao: {
    flex: 1,
    minHeight: 56,
    paddingVertical: Theme.spacing.md,
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  tipoBotaoAtivo: {
    backgroundColor: Theme.colors.gray900,
    borderColor: Theme.colors.gray900,
  },
  tipoBotaoTexto: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray600,
    fontFamily: Theme.typography.fontFamily,
  },
  tipoBotaoTextoAtivo: {
    color: Theme.colors.white,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.sm,
  },
  picker: {
    height: 56,
    color: Theme.colors.gray900,
    backgroundColor: Theme.colors.surface,
  },
  parcelasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  parcelaBotao: {
    minWidth: 48,
    minHeight: 48,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.sm,
  },
  parcelaBotaoAtivo: {
    backgroundColor: Theme.colors.gray900,
    borderColor: Theme.colors.gray900,
  },
  parcelaBotaoTexto: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray600,
    fontFamily: Theme.typography.fontFamily,
  },
  parcelaBotaoTextoAtivo: {
    color: Theme.colors.white,
  },
  mesAnoContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  mesAnoItem: {
    flex: 1,
  },
  mesAnoLabel: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray500,
    marginBottom: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamily,
  },
  resumo: {
    marginVertical: Theme.spacing.md,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.md,
  },
  resumoTitulo: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    marginBottom: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  resumoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  resumoLabel: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.gray500,
    fontFamily: Theme.typography.fontFamily,
  },
  resumoValor: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.gray900,
    fontWeight: Theme.typography.fontWeight.semibold,
    fontFamily: Theme.typography.fontFamily,
  },
  botoes: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  botaoCancelar: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  botaoCancelarTexto: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray800,
    fontFamily: Theme.typography.fontFamily,
  },
  botaoSalvar: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    ...Theme.shadows.md,
  },
  botaoSalvarTexto: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.white,
    fontFamily: Theme.typography.fontFamily,
  },
  botaoDisabled: {
    opacity: 0.45,
  },
});
