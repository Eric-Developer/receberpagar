import { db } from "@/database/database";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Resumo() {
  const hoje = new Date();

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const [totalEsperado, setTotalEsperado] = useState(0);
  const [totalRecebido, setTotalRecebido] = useState(0);

  function carregarResumo() {
    // TOTAL ESPERADO (somente alunos que EXISTEM)
    const total = db.getFirstSync<{ total: number }>(
      `
      SELECT SUM(valor) AS total
      FROM alunos
      WHERE status = 'ATIVO'
      `
    );

    // TOTAL RECEBIDO (somente pagamentos ligados a alunos existentes)
    const recebido = db.getFirstSync<{ recebido: number }>(
      `
      SELECT SUM(p.valor) AS recebido
      FROM pagamentos p
      INNER JOIN alunos a ON a.id = p.aluno_id
      WHERE p.mes = ?
        AND p.ano = ?
        AND p.status = 'PAGO'
      `,
      [mes, ano]
    );

    setTotalEsperado(total?.total || 0);
    setTotalRecebido(recebido?.recebido || 0);
  }

  // Atualiza quando muda mês/ano
  React.useEffect(() => {
    carregarResumo();
  }, [mes, ano]);

  // Atualiza quando volta para tela
  useFocusEffect(
    useCallback(() => {
      carregarResumo();
    }, [mes, ano])
  );

  const faltaReceber = totalEsperado - totalRecebido;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>📊 Resumo Financeiro</Text>

      {/* FILTROS */}
      <View style={styles.filtros}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={mes}
            onValueChange={(v) => setMes(v)}
            style={styles.picker}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <Picker.Item
                key={i + 1}
                label={`Mês ${String(i + 1).padStart(2, "0")}`}
                value={i + 1}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={ano}
            onValueChange={(v) => setAno(v)}
            style={styles.picker}
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <Picker.Item key={a} label={String(a)} value={a} />
            ))}
          </Picker>
        </View>
      </View>

      {/* CARDS */}
      <View style={styles.card}>
        <Text style={styles.label}>💰 Total esperado</Text>
        <Text style={styles.valor}>
          R$ {totalEsperado.toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>✅ Total recebido</Text>
        <Text style={[styles.valor, { color: "#16a34a" }]}>
          R$ {totalRecebido.toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>❌ Falta receber</Text>
        <Text
          style={[
            styles.valor,
            { color: faltaReceber > 0 ? "#dc2626" : "#16a34a" },
          ]}
        >
          R$ {faltaReceber.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f1f5f9",
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0f172a",
  },
  filtros: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    overflow: "hidden",
  },
  picker: {
    height: 55,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    color: "#64748b",
  },
  valor: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 6,
    color: "#0f172a",
  },
});
