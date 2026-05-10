import { openDatabaseSync } from "expo-sqlite";

export const db = openDatabaseSync("reforco.db");

export function initDatabase() {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
    `);

    // Instalações antigas usavam a tabela `alunos`; renomear antes do CREATE IF NOT EXISTS.
    const legacyAlunos = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='alunos'"
    );
    if (legacyAlunos.length > 0) {
      db.execSync(`ALTER TABLE alunos RENAME TO contas`);
    }

    db.execSync(`
      CREATE TABLE IF NOT EXISTS contas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL DEFAULT 'RECEBER',
        nome TEXT NOT NULL,
        pessoa TEXT DEFAULT '',
        descricao TEXT DEFAULT '',
        categoria TEXT DEFAULT '',
        valor REAL NOT NULL,
        parcelas INTEGER NOT NULL DEFAULT 1,
        dia_vencimento INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        status TEXT NOT NULL,
        notification_id TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conta_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        status TEXT NOT NULL,
        valor REAL,
        data_pagamento TEXT,
        UNIQUE(conta_id, mes, ano)
      );
    `);

    const pagamentoCols = db.getAllSync<{ name: string }>(
      "PRAGMA table_info(pagamentos)"
    );
    const temAlunoId = pagamentoCols.some((col) => col.name === "aluno_id");
    if (temAlunoId) {
      db.execSync(
        `ALTER TABLE pagamentos RENAME COLUMN aluno_id TO conta_id`
      );
    }

    const contaCols = db.getAllSync<{ name: string }>(
      "PRAGMA table_info(contas)"
    );

    const needsTipo = !contaCols.some((col) => col.name === "tipo");
    const needsPessoa = !contaCols.some((col) => col.name === "pessoa");
    const needsDescricao = !contaCols.some((col) => col.name === "descricao");
    const needsCategoria = !contaCols.some((col) => col.name === "categoria");
    const needsParcelas = !contaCols.some((col) => col.name === "parcelas");
    const needsNotificationId = !contaCols.some((col) => col.name === "notification_id");
    const needsParcelasPagas = !contaCols.some((col) => col.name === "parcelas_pagas");
    const needsAtivo = !contaCols.some((col) => col.name === "ativo");

    if (needsTipo) {
      db.execSync(`ALTER TABLE contas ADD COLUMN tipo TEXT NOT NULL DEFAULT 'RECEBER';`);
    }
    if (needsPessoa) {
      db.execSync(`ALTER TABLE contas ADD COLUMN pessoa TEXT DEFAULT '';`);
    }
    if (needsDescricao) {
      db.execSync(`ALTER TABLE contas ADD COLUMN descricao TEXT DEFAULT '';`);
    }
    if (needsCategoria) {
      db.execSync(`ALTER TABLE contas ADD COLUMN categoria TEXT DEFAULT '';`);
    }
    if (needsParcelas) {
      db.execSync(`ALTER TABLE contas ADD COLUMN parcelas INTEGER NOT NULL DEFAULT 1;`);
    }
    if (needsNotificationId) {
      db.execSync(`ALTER TABLE contas ADD COLUMN notification_id TEXT DEFAULT '';`);
    }
    if (needsParcelasPagas) {
      db.execSync(`ALTER TABLE contas ADD COLUMN parcelas_pagas INTEGER NOT NULL DEFAULT 0;`);
    }
    if (needsAtivo) {
      db.execSync(`ALTER TABLE contas ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1;`);
    }

    const pagColsAfter = db.getAllSync<{ name: string }>(
      "PRAGMA table_info(pagamentos)"
    );

    const temDataPagamento = pagColsAfter.some(
      (col) => col.name === "data_pagamento"
    );

    if (!temDataPagamento) {
      db.execSync(`ALTER TABLE pagamentos ADD COLUMN data_pagamento TEXT;`);
    }
  } catch (error) {
    console.log("Erro ao criar banco:", error);
  }
}
