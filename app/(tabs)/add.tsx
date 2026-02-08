import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { db } from '@/database/database';
import { Picker } from '@react-native-picker/picker';

export default function AddAluno() {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  function salvar() {
    if (!nome || !valor || !diaVencimento) return;

    // converte para número
    const diaNum = Number(diaVencimento);
    const valorNum = Number(valor);

    db.runSync(
      `
      INSERT INTO alunos (nome, valor, dia_vencimento, mes, ano, status)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [nome, valorNum, diaNum, mes, ano, 'ATIVO']
    );

    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Adicionar Aluno</Text>

      <TextInput
        placeholder="Nome do aluno"
        style={styles.input}
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        placeholder="Valor mensal"
        keyboardType="numeric"
        style={styles.input}
        value={valor}
        onChangeText={setValor}
      />

      <TextInput
        placeholder="Dia de vencimento (1 a 31)"
        keyboardType="numeric"
        style={styles.input}
        value={diaVencimento}
        onChangeText={setDiaVencimento}
      />

      <Text style={styles.label}>Mês</Text>
      <Picker selectedValue={mes} onValueChange={setMes}>
        {[
          'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
        ].map((m, i) => (
          <Picker.Item key={i+1} label={m} value={i+1} />
        ))}
      </Picker>

      <Text style={styles.label}>Ano</Text>
      <Picker selectedValue={ano} onValueChange={setAno}>
        {[2024, 2025, 2026, 2027].map((a) => (
          <Picker.Item key={a} label={String(a)} value={a} />
        ))}
      </Picker>

      <TouchableOpacity style={styles.botao} onPress={salvar}>
        <Text style={styles.botaoTexto}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f6f8',
  },

  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: 'bold',
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  botao: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },

  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
