import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { db } from '@/database/database';
import { router, useFocusEffect } from 'expo-router';

type Aluno = {
  id: number;
  nome: string;
  valor: number;
  status: string;
};

export default function AlunosScreen() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  // Carrega alunos do banco
  function carregarAlunos() {
    const result = db.getAllSync<Aluno>(
      `SELECT * FROM alunos ORDER BY nome`
    );
    setAlunos(result);
  }

  // Excluir aluno
  function excluirAluno(id: number) {
    Alert.alert(
      "Excluir Aluno",
      "Tem certeza que deseja excluir este aluno?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: () => {
            db.runSync(`DELETE FROM alunos WHERE id = ?`, [id]);
            carregarAlunos();
          } 
        }
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      carregarAlunos();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Meus Alunos</Text>

      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum aluno cadastrado</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.valor}>R$ {item.valor.toFixed(2)}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
            </View>

            <View style={styles.botoesLinha}>
              <TouchableOpacity
                style={[styles.botaoCard, styles.botaoEditar]}
               onPress={() => router.push(`/edit?id=${item.id}`)}

              >
                <Text style={styles.botaoTextoCard}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botaoCard, styles.botaoExcluir]}
                onPress={() => excluirAluno(item.id)}
              >
                <Text style={styles.botaoTextoCard}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.botao}
        onPress={() => router.push('/(tabs)/add')}
      >
        <Text style={styles.botaoTexto}>+ Adicionar Aluno</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  info: {
    marginBottom: 10,
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  valor: {
    marginTop: 4,
    fontSize: 16,
  },
  status: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
  },
  botoesLinha: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  botaoCard: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 10,
  },
  botaoEditar: {
    backgroundColor: '#fbbf24',
  },
  botaoExcluir: {
    backgroundColor: '#dc2626',
  },
  botaoTextoCard: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  vazio: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#777',
  },
  botao: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
