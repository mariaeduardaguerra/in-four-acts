const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const banco = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,

    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(
            path.join(__dirname, "supabase-ca.crt"),
            "utf8"
        )
    },

    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

banco.on("error", (erro) => {
    console.error("Erro na conexão com o banco:", erro.message);
});

module.exports = banco;