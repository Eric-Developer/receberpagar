import { openDatabaseSync } from "expo-sqlite";

export const db = openDatabaseSync("reforco.db");

export function initDatabase() {
  // TABELA ALUNOS (VERSÃO ATUALIZADA)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      dia_vencimento INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      status TEXT NOT NULL
    );
  `);

  // TABELA PAGAMENTOS
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      status TEXT NOT NULL,
      valor REAL,
      dia_vencimento INTEGER,
      UNIQUE (aluno_id, mes, ano)
    );
  `);
}
