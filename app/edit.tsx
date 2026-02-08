import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '@/database/database';
import { router, useLocalSearchParams } from 'expo-router';

type Aluno = {
  id: number;
  nome: string;
  valor: number;
  status: string;
};

export default function EditAluno() {
  const { id } = useLocalSearchParams<{ id: string }>(); // pega o ID do aluno da rota
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  useEffect(() => {
    if (!id) return;

    // Buscar aluno pelo ID
    const aluno = db.getAllSync<Aluno>('SELECT * FROM alunos WHERE id = ?', [id])[0];
    if (aluno) {
      setNome(aluno.nome);
      setValor(String(aluno.valor));
      setStatus(aluno.status as 'ATIVO' | 'INATIVO');
    }
  }, [id]);

  function salvar() {
    if (!nome || !valor) {
      Alert.alert('Erro', 'Preencha nome e valor');
      return;
    }

    db.runSync(
      `UPDATE alunos SET nome = ?, valor = ?, status = ? WHERE id = ?`,
      [nome, Number(valor), status, id]
    );

    Alert.alert('Sucesso', 'Aluno atualizado!');
    router.back(); // volta para lista
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Editar Aluno</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome do aluno"
      />

      <Text style={styles.label}>Valor Mensal</Text>
      <TextInput
        style={styles.input}
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
        placeholder="R$"
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.statusLinha}>
        {['ATIVO', 'INATIVO'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBotao, status === s && styles.statusAtivo]}
            onPress={() => setStatus(s as 'ATIVO' | 'INATIVO')}
          >
            <Text style={styles.statusTexto}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.botao} onPress={salvar}>
        <Text style={styles.botaoTexto}>Salvar Alterações</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
  },
  statusLinha: { flexDirection: 'row', marginVertical: 10 },
  statusBotao: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginRight: 10,
    alignItems: 'center',
  },
  statusAtivo: { backgroundColor: '#2563eb' },
  statusTexto: { color: '#fff', fontWeight: 'bold' },
  botao: {
    marginTop: 20,
    backgroundColor: '#16a34a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
