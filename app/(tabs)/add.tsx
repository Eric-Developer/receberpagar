import { db } from '@/database/database';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

export default function AddAluno() {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  function salvar() {
    if (!nome || !valor || !diaVencimento) return;

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
        placeholderTextColor="#6b7280"
        style={styles.input}
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        placeholder="Valor mensal"
        placeholderTextColor="#6b7280"
        keyboardType="numeric"
        style={styles.input}
        value={valor}
        onChangeText={setValor}
      />

      <TextInput
        placeholder="Dia de vencimento (1 a 31)"
        placeholderTextColor="#6b7280"
        keyboardType="numeric"
        style={styles.input}
        value={diaVencimento}
        onChangeText={setDiaVencimento}
      />

      <Text style={styles.label}>Mês</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={mes}
          onValueChange={setMes}
          mode="dropdown"
          dropdownIconColor="#2563eb"
          style={styles.picker}
        >
          {[
            'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
          ].map((m, i) => (
            <Picker.Item
              key={i + 1}
              label={m}
              value={i + 1}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Ano</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={ano}
          onValueChange={setAno}
          mode="dropdown"
          dropdownIconColor="#2563eb"
          style={styles.picker}
        >
          {[2024, 2025, 2026, 2027].map((a) => (
            <Picker.Item
              key={a}
              label={String(a)}
              value={a}
            />
          ))}
        </Picker>
      </View>

      <TouchableOpacity style={styles.botao} onPress={salvar}>
        <Text style={styles.botaoTexto}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f1f5f9',
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#0f172a',
  },

  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
    color: '#334155',
  },

  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 15,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: 16,
    color: '#0f172a',
  },

  pickerContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },

  picker: {
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },

  botao: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  botaoTexto: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
