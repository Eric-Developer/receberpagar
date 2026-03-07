import { openDatabaseSync } from "expo-sqlite";

export const db = openDatabaseSync("reforco.db");

export function initDatabase() {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        valor REAL NOT NULL,
        dia_vencimento INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        aluno_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        status TEXT NOT NULL,
        valor REAL,
        data_pagamento TEXT,
        UNIQUE(aluno_id, mes, ano)
      );
    `);

    // 🔥 MIGRAÇÃO
    const colunas = db.getAllSync<{ name: string }>(
      "PRAGMA table_info(pagamentos)"
    );

    const temDataPagamento = colunas.some(
      (col) => col.name === "data_pagamento"
    );

    if (!temDataPagamento) {
      db.execSync(`
        ALTER TABLE pagamentos ADD COLUMN data_pagamento TEXT;
      `);
      console.log("Coluna data_pagamento adicionada via migração");
    }

    console.log("Banco verificado com sucesso");
  } catch (error) {
    console.log("Erro ao criar banco:", error);
  }
}
