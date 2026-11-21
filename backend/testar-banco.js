const fs = require("node:fs");

const path = require("node:path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const banco = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(path.join(__dirname, "supabase-ca.crt"), "utf8"),
  },
});

async function testarConexao() {
  try {
    const resultado = await banco.query(`
            select
                to_regclass('in_four_acts.playlists') as playlists,
                to_regclass('in_four_acts.faixas') as faixas
        `);

    console.log("Conexão com o banco realizada!");
    console.table(resultado.rows);
  } catch (erro) {
    console.error("Falha na conexão:", erro.message);
    process.exitCode = 1;
  } finally {
    await banco.end();
  }
}

testarConexao();
