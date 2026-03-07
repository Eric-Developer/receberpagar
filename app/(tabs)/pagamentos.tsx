import { db } from "@/database/database";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Status = "PAGO" | "PENDENTE" | "ATRASADO";

type Item = {
  aluno_id: number;
  nome: string;
  valor: number;
  status?: Status;
  status_calculado: Status;
  data_pagamento?: string;
  dia_vencimento: number;
  mes_inicio: number;
  ano_inicio: number;
};

const statusColor: Record<Status, string> = {
  PAGO: "#16a34a",
  PENDENTE: "#f59e0b",
  ATRASADO: "#dc2626",
};

export default function Pagamentos() {
  const hojeInicial = new Date();
  const [mes, setMes] = useState(hojeInicial.getMonth() + 1);
  const [ano, setAno] = useState(hojeInicial.getFullYear());
  const [statusFiltro, setStatusFiltro] =
    useState<Status | "TODOS">("TODOS");
  const [lista, setLista] = useState<Item[]>([]);

  function carregar() {
    try {
      const hoje = new Date();
      const hojeDia = hoje.getDate();
      const hojeMes = hoje.getMonth() + 1;
      const hojeAno = hoje.getFullYear();

      const alunos: Item[] = db.getAllSync<Item>(
        `SELECT a.id AS aluno_id, a.nome, a.valor, a.dia_vencimento,
                a.mes AS mes_inicio, a.ano AS ano_inicio,
                p.status, p.data_pagamento
         FROM alunos a
         LEFT JOIN pagamentos p
         ON a.id = p.aluno_id AND p.mes = ? AND p.ano = ?
         WHERE a.status = 'ATIVO'
         ORDER BY a.nome`,
        [mes, ano]
      );

      const listaAtualizada = alunos
        .filter((aluno) => {
          if (ano < aluno.ano_inicio) return false;
          if (ano === aluno.ano_inicio && mes < aluno.mes_inicio)
            return false;
          return true;
        })
        .map((item) => {
          let status: Status = "PENDENTE";

          if (item.status === "PAGO") {
            status = "PAGO";
          } else {
            if (
              ano < hojeAno ||
              (ano === hojeAno && mes < hojeMes)
            ) {
              status = "ATRASADO";
            } else if (
              ano === hojeAno &&
              mes === hojeMes
            ) {
              status =
                hojeDia > item.dia_vencimento
                  ? "ATRASADO"
                  : "PENDENTE";
            } else {
              status = "PENDENTE";
            }
          }

          return { ...item, status_calculado: status };
        });

      const filtered =
        statusFiltro === "TODOS"
          ? listaAtualizada
          : listaAtualizada.filter(
              (i) => i.status_calculado === statusFiltro
            );

      setLista(filtered);
    } catch (error) {
      console.log("ERRO AO CARREGAR:", error);
      Alert.alert("Erro", "Falha ao carregar pagamentos.");
    }
  }

  function marcarComoPago(item: Item) {
    try {
      const dataPagamento = new Date().toISOString();

      db.runSync(
        `INSERT INTO pagamentos (aluno_id, mes, ano, status, valor, data_pagamento)
         VALUES (?, ?, ?, 'PAGO', ?, ?)
         ON CONFLICT(aluno_id, mes, ano)
         DO UPDATE SET status='PAGO', valor=?, data_pagamento=?`,
        [
          item.aluno_id,
          mes,
          ano,
          item.valor,
          dataPagamento,
          item.valor,
          dataPagamento,
        ]
      );

      carregar();
    } catch (error) {
      console.log("ERRO AO MARCAR COMO PAGO:", error);
      Alert.alert("Erro", "Não foi possível marcar como pago.");
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
        Alert.alert("Nenhum dado para exportar");
        return;
      }

      const html = `
        <h1>Pagamentos ${String(mes).padStart(
          2,
          "0"
        )}/${ano}</h1>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <tr>
            <th>Aluno</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Dia Vencimento</th>
          </tr>
          ${lista
            .map(
              (i) => `
            <tr>
              <td>${i.nome}</td>
              <td>R$ ${i.valor.toFixed(2)}</td>
              <td>${i.status_calculado}</td>
              <td>${i.dia_vencimento}/${String(mes).padStart(
                2,
                "0"
              )}/${ano}</td>
            </tr>
          `
            )
            .join("")}
        </table>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
      });

      await Sharing.shareAsync(uri);
    } catch (error) {
      console.log("ERRO AO EXPORTAR PDF:", error);
      Alert.alert("Erro", "Falha ao exportar PDF.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [mes, ano, statusFiltro])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>
        Pagamentos • {String(mes).padStart(2, "0")}/{ano}
      </Text>

      <View style={styles.filtroLinha}>
        <TouchableOpacity onPress={() => mudarMes(-1)}>
          <Text style={styles.filtroBotao}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.filtroTexto}>
          {String(mes).padStart(2, "0")}/{ano}
        </Text>

        <TouchableOpacity onPress={() => mudarMes(1)}>
          <Text style={styles.filtroBotao}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtroStatus}>
        {["TODOS", "PAGO", "PENDENTE", "ATRASADO"].map(
          (s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBotao,
                statusFiltro === s &&
                  styles.statusAtivo,
              ]}
              onPress={() =>
                setStatusFiltro(s as any)
              }
            >
              <Text style={styles.statusTexto}>
                {s}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <TouchableOpacity
        style={styles.botaoPDF}
        onPress={exportarPDF}
      >
        <Text style={styles.botaoTexto}>
          📄 Exportar PDF
        </Text>
      </TouchableOpacity>

      {lista.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.semDados}>
            Nenhum pagamento para mostrar
          </Text>
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) =>
            item.aluno_id.toString()
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.nome}>
                {item.nome}
              </Text>
              <Text style={styles.valor}>
                R$ {item.valor.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.status,
                  {
                    color:
                      statusColor[
                        item.status_calculado
                      ],
                  },
                ]}
              >
                ● {item.status_calculado}
              </Text>

              {item.status_calculado !==
                "PAGO" && (
                <TouchableOpacity
                  style={styles.botaoPago}
                  onPress={() =>
                    marcarComoPago(item)
                  }
                >
                  <Text
                    style={styles.botaoTexto}
                  >
                    Marcar como pago
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
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
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  filtroLinha: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  filtroBotao: {
    fontSize: 22,
    paddingHorizontal: 20,
  },
  filtroTexto: {
    fontSize: 18,
    fontWeight: "bold",
  },
  filtroStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBotao: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  statusAtivo: {
    backgroundColor: "#c7d2fe",
  },
  statusTexto: {
    fontSize: 12,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 4,
  },
  nome: {
    fontSize: 18,
    fontWeight: "bold",
  },
  valor: {
    fontSize: 16,
    marginTop: 4,
  },
  status: {
    marginTop: 8,
    fontWeight: "bold",
  },
  botaoPago: {
    marginTop: 12,
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  botaoPDF: {
    marginVertical: 10,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  semDados: {
    fontSize: 16,
    textAlign: "center",
    color: "#888",
  },
});
