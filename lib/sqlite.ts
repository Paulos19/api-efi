import sqlite3 from 'sqlite3';
import path from 'path';

// Garante que o caminho seja resolvido corretamente a partir da raiz do projeto
const dbPath = path.resolve(process.cwd(), 'Database.sqlite');

// Cria uma instância do banco de dados (modo verbose para mais logs)
// Usamos OPEN_READWRITE para permitir leitura e escrita.
// OPEN_CREATE criaria o arquivo se ele não existisse, mas como ele já existe, não é estritamente necessário.
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    // Habilitar Foreign Keys (se você usar relacionamentos no SQLite)
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error("Erro ao habilitar foreign keys no SQLite:", pragmaErr.message);
      } else {
        console.log("Foreign keys habilitadas no SQLite.");
      }
    });
  }
});

// Tipagem para o resultado da função 'run'
interface RunResult {
  lastID: number;
  changes: number;
}

// Função para executar queries que retornam múltiplos resultados (SELECT)
// Usamos 'any[]' para os parâmetros e 'T' como tipo genérico para o retorno
export const queryAll = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows: T[]) => { // Especifica o tipo do retorno
      if (err) {
        console.error('Erro na query SQLite (all):', sql, params, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Função para executar queries que retornam um único resultado (SELECT com LIMIT 1)
export const queryOne = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: T) => { // Especifica o tipo do retorno
      if (err) {
        console.error('Erro na query SQLite (get):', sql, params, err.message);
        reject(err);
      } else {
        resolve(row); // Retorna 'undefined' se não encontrar nada
      }
    });
  });
};

// Função para executar queries que modificam dados (INSERT, UPDATE, DELETE)
export const run = (sql: string, params: any[] = []): Promise<RunResult> => {
  return new Promise((resolve, reject) => {
    // Usar function() para ter acesso ao 'this' do sqlite3.Statement
    db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        console.error('Erro na query SQLite (run):', sql, params, err.message);
        reject(err);
      } else {
        // Retorna o ID da última linha inserida e o número de linhas afetadas
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Considerações sobre fechamento da conexão em ambiente Next.js/Serverless:
// Em ambientes serverless, manter uma conexão global aberta pode não ser ideal.
// Uma abordagem alternativa seria abrir e fechar a conexão a cada requisição,
// ou usar um pool de conexões se a carga for alta.
// Para simplificar inicialmente, manteremos a conexão global, mas esteja ciente disso.

// Exemplo de como fechar a conexão (não recomendado para serverless):
// process.on('SIGINT', () => {
//   db.close((err) => {
//     if (err) {
//       return console.error("Erro ao fechar SQLite:", err.message);
//     }
//     console.log('Conexão SQLite fechada.');
//     process.exit(0);
//   });
// });

// Exporta a instância do DB caso precise de acesso direto (use com cautela)
// export { db };