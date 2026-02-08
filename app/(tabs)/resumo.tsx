import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { db } from "@/database/database";
import { Picker } from "@react-native-picker/picker";

export default function Resumo() {
  const hoje = new Date();

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const [totalEsperado, setTotalEsperado] = useState(0);
  const [totalRecebido, setTotalRecebido] = useState(0);

  useEffect(() => {
    const total = db.getFirstSync<{ total: number }>(
      `
      SELECT SUM(valor) AS total
      FROM alunos
      WHERE status = 'ATIVO'
        AND (
          ano < ?
          OR (ano = ? AND mes <= ?)
        )
      `,
      [ano, ano, mes]
    );

    // TOTAL RECEBIDO NO MÊS
    const recebido = db.getFirstSync<{ recebido: number }>(
      `
      SELECT SUM(valor) AS recebido
      FROM pagamentos
      WHERE mes = ?
        AND ano = ?
        AND status = 'PAGO'
      `,
      [mes, ano]
    );

    setTotalEsperado(total?.total || 0);
    setTotalRecebido(recebido?.recebido || 0);
  }, [mes, ano]);

  const faltaReceber = totalEsperado - totalRecebido;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>📊 Resumo Financeiro</Text>

      {/* FILTROS */}
      <View style={styles.filtros}>
        <Picker
          selectedValue={mes}
          style={styles.picker}
          onValueChange={(v) => setMes(v)}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <Picker.Item
              key={i + 1}
              label={`Mês ${String(i + 1).padStart(2, "0")}`}
              value={i + 1}
            />
          ))}
        </Picker>

        <Picker
          selectedValue={ano}
          style={styles.picker}
          onValueChange={(v) => setAno(v)}
        >
          {[2024, 2025, 2026, 2027].map((a) => (
            <Picker.Item key={a} label={String(a)} value={a} />
          ))}
        </Picker>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>💰 Total esperado</Text>
        <Text style={styles.valor}>R$ {totalEsperado.toFixed(2)}</Text>
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
    padding: 20,
    backgroundColor: "#f4f6f8",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  filtros: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 2,
  },
  picker: {
    flex: 1,
    height: 60,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  valor: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 4,
  },
});
