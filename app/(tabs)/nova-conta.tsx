import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Theme } from '@/constants/theme';
import { db } from '@/database/database';
import { agendarLembreteVencimentoConta } from '@/services/notifications';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
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

export default function NovaContaScreen() {
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
  const [ativo, setAtivo] = useState(1);
  const [parcelas, setParcelas] = useState(1);
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<{ receber: boolean; pagar: boolean }>({
    receber: true,
    pagar: true,
  });

  useEffect(() => {
    const tipos = db.getAllSync<{ tipo: 'RECEBER' | 'PAGAR' }>(`SELECT DISTINCT tipo FROM contas`);
    const receber = tipos.some((t) => t.tipo === 'RECEBER');
    const pagar = tipos.some((t) => t.tipo === 'PAGAR');
    setFluxosDisponiveis({ receber, pagar });
    if (receber && !pagar) setTipo('RECEBER');
    if (!receber && pagar) setTipo('PAGAR');
  }, []);

  const valorNumerico = useMemo(() => {
    return Number(valor.replace(/\D/g, '')) / 100;
  }, [valor]);

  // Quando for PAGAR, o valor digitado é "por parcela".
  const valorTotal = useMemo(() => {
    return tipo === 'PAGAR' ? valorNumerico * Math.max(parcelas, 1) : valorNumerico;
  }, [parcelas, tipo, valorNumerico]);

  const valorParcela = useMemo(() => {
    if (tipo !== 'PAGAR') return valorNumerico;
    return valorNumerico;
  }, [tipo, valorNumerico]);

  const isDisabled = !nome.trim() || !valorNumerico || !diaVencimento.trim();

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

    let notificationTargetId: number | null = null;

    if (tipo === 'RECEBER') {
      const result = db.runSync(
        `INSERT INTO contas (tipo, status, nome, pessoa, categoria, descricao, valor, parcelas, parcelas_pagas, dia_vencimento, mes, ano, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`,
        [
          tipo,
          status,
          nome.trim(),
          pessoa.trim(),
          categoriaLimpa,
          descricao.trim(),
          valorTotal,
          parseInt(diaVencimento),
          mes,
          ano,
          ativo,
        ]
      );
      // Evita SELECT por campos (pode colidir). Usa o id inserido.
      // expo-sqlite retorna lastInsertRowId.
      notificationTargetId = (result as any)?.lastInsertRowId ?? null;
    } else {
      const result = db.runSync(
        `INSERT INTO contas (tipo, status, nome, pessoa, categoria, descricao, valor, parcelas, parcelas_pagas, dia_vencimento, mes, ano, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)`,
        [
          tipo,
          status,
          nome.trim(),
          pessoa.trim(),
          categoriaLimpa,
          descricao.trim(),
          valorTotal,
          parcelas,
          parseInt(diaVencimento),
          mes,
          ano,
        ]
      );
      notificationTargetId = (result as any)?.lastInsertRowId ?? null;
    }

    if (status === 'PENDENTE' && notificationTargetId) {
      await agendarLembreteVencimentoConta({
        id: notificationTargetId,
        tipo,
        nome,
        valor: valorTotal,
        parcelas: tipo === 'PAGAR' ? parcelas : 1,
        dia_vencimento: parseInt(diaVencimento),
        mes,
        ano,
        status,
      });
    }

    Alert.alert('Sucesso', `${tipo === 'RECEBER' ? 'Entrada' : 'Saída'} registrada.`);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Theme.colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Novo lançamento"
          subtitle="Fluxo"
          showBack
          showLogo={false}
          onBackPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />

        <View style={styles.conteudo}>
          {fluxosDisponiveis.receber && fluxosDisponiveis.pagar ? (
          <View style={styles.secao}>
            <Text style={styles.sectionHeading}>Tipo</Text>
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
              placeholder="Ex: Cliente, Fornecedor"
              placeholderTextColor={Theme.colors.gray400}
              value={nome}
              onChangeText={setNome}
            />
          </View>

          {/* Pessoa */}
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

          {/* Categoria */}
          <View style={styles.secao}>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categoria}
                onValueChange={(itemValue) => setCategoria(itemValue)}
                style={styles.picker}
                dropdownIconColor={Theme.colors.gray700}
              >
                {categorias.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} color={Theme.colors.gray900} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Descrição */}
          <View style={styles.secao}>
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Ex: Pagamento referente a..."
              placeholderTextColor={Theme.colors.gray400}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Valor */}
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
              <Text style={styles.infoTexto}>
                {tipo === 'PAGAR'
                  ? `Parcela: ${valor} • Total: ${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
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
                <Text style={styles.infoTexto}>
                  Cada parcela: {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
              <Text style={styles.infoTexto}>
                {ativo ? 'Aparecerá em todos os meses' : 'Apenas neste mês'}
              </Text>
            </View>
          )}

          {/* Data de Vencimento */}
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
            <Text style={styles.infoTexto}>Dia do mês (1-31)</Text>
          </View>

          {/* Mês e Ano */}
          <View style={styles.secao}>
            <Text style={styles.label}>Período de início</Text>
            <View style={styles.mesAnoContainer}>
              <View style={styles.mesAnoItem}>
                <Text style={styles.mesAnoLabel}>Mês</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={mes}
                    onValueChange={(itemValue) => setMes(itemValue)}
                    style={styles.picker}
                    dropdownIconColor={Theme.colors.gray700}
                  >
                    {meses.map((m, i) => (
                      <Picker.Item key={i} label={m} value={i + 1} color={Theme.colors.gray900} />
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
            <Text style={styles.infoTexto}>
              Vencimento: {String(parseInt(diaVencimento) || 1).padStart(2, '0')}/{String(mes).padStart(2, '0')}/{ano}
            </Text>
          </View>

          {/* Status */}
          <View style={styles.secao}>
            <Text style={styles.label}>Status inicial</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[styles.statusBotao, status === 'PENDENTE' && styles.statusBotaoAtivo]}
                onPress={() => setStatus('PENDENTE')}
              >
                <Text style={[styles.statusBotaoTexto, status === 'PENDENTE' && styles.statusBotaoTextoAtivo]}>
                  Pendente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBotao, status === 'PAGO' && styles.statusBotaoAtivo]}
                onPress={() => setStatus('PAGO')}
              >
                <Text style={[styles.statusBotaoTexto, status === 'PAGO' && styles.statusBotaoTextoAtivo]}>
                  Pago
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Resumo */}
          {nome && valorNumerico > 0 && (
            <View style={styles.resumo}>
              <Text style={styles.resumoTitulo}>Resumo</Text>
              <View style={styles.resumoLinhaContainer}>
                <Text style={styles.resumoLabel}>Fluxo</Text>
                <Text style={styles.resumoValor}>{tipo === 'RECEBER' ? 'Entradas' : 'Saídas'}</Text>
              </View>
              <View style={styles.resumoLinhaContainer}>
                <Text style={styles.resumoLabel}>Total:</Text>
                <Text style={styles.resumoValor}>{valor}</Text>
              </View>
              {tipo === 'PAGAR' ? (
                <View style={styles.resumoLinhaContainer}>
                  <Text style={styles.resumoLabel}>Parcelas:</Text>
                  <Text style={styles.resumoValor}>{parcelas}x de {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                </View>
              ) : (
                <View style={styles.resumoLinhaContainer}>
                  <Text style={styles.resumoLabel}>Recorrente:</Text>
                  <Text style={styles.resumoValor}>{ativo ? '✅ Ativo' : '❌ Inativo'}</Text>
                </View>
              )}
            </View>
          )}

          {/* Botões de Ação */}
          <View style={styles.botoes}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={() => router.back()}>
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botaoSalvar, isDisabled && styles.botaoDisabled]}
              onPress={salvar}
              disabled={isDisabled}
            >
              <Text style={styles.botaoSalvarTexto}>Adicionar</Text>
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
  },
  conteudo: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
    paddingBottom: Theme.spacing['3xl'],
  },
  secao: {
    marginBottom: Theme.spacing.xl,
  },
  label: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray700,
    marginBottom: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.gray900,
    backgroundColor: Theme.colors.surface,
    fontFamily: Theme.typography.fontFamily,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  anoInput: {
    textAlign: 'center',
  },
  infoTexto: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.gray500,
    marginTop: Theme.spacing.xs,
    fontStyle: 'italic',
    fontFamily: Theme.typography.fontFamily,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamily,
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
  },
  tipoBotaoAtivo: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  tipoBotaoTexto: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  tipoBotaoTextoAtivo: {
    color: Theme.colors.white,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surface,
  },
  picker: {
    height: 56,
    color: Theme.colors.gray900,
    backgroundColor: Theme.colors.surface,
  },
  parcelasContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    flexWrap: 'wrap',
  },
  parcelaBotao: {
    minWidth: 48,
    minHeight: 48,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
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
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray600,
    marginBottom: Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamily,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statusBotao: {
    flex: 1,
    minHeight: 56,
    paddingVertical: Theme.spacing.md,
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  statusBotaoAtivo: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  statusBotaoTexto: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.gray600,
    fontFamily: Theme.typography.fontFamily,
  },
  statusBotaoTextoAtivo: {
    color: Theme.colors.white,
  },
  resumo: {
    marginVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surfaceAlt,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
    ...Theme.shadows.sm,
  },
  resumoTitulo: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    marginBottom: Theme.spacing.sm,
    fontFamily: Theme.typography.fontFamily,
  },
  resumoLinhaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Theme.spacing.xs,
  },
  resumoLabel: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.gray600,
    fontWeight: Theme.typography.fontWeight.semibold,
    fontFamily: Theme.typography.fontFamily,
  },
  resumoValor: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.gray900,
    fontWeight: Theme.typography.fontWeight.bold,
    fontFamily: Theme.typography.fontFamily,
  },
  botoes: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing['2xl'],
  },
  botaoCancelar: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  botaoCancelarTexto: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.gray900,
    fontFamily: Theme.typography.fontFamily,
  },
  botaoSalvar: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
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
    opacity: 0.5,
  },
});
