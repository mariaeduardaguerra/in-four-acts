const path = require("node:path");

const express = require("express");
const banco = require("./banco");

const app = express();
const porta = Number(process.env.PORT) || 3001;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseChave = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseChave) {
    throw new Error("Preencha as configurações do Supabase no backend/.env.");
}

const nomesDosAtos = [
    "The Beginning",
    "The Conflict",
    "The Catharsis",
    "The Afterglow"
];

const formatoUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

function rotaAssincrona(funcao) {
    return (req, res, next) => {
        Promise.resolve(funcao(req, res, next)).catch(next);
    };
}

function formatarPlaylist(playlist, faixas = []) {
    return {
        id: playlist.id,
        nome: playlist.nome,
        descricao: playlist.descricao,
        atmosfera: playlist.atmosfera,
        favorita: playlist.favorita,
        criadaEm: playlist.criada_em,

        atos: nomesDosAtos.map((nome, indice) => ({
            numero: indice + 1,
            nome,
            faixas: faixas.filter(
                (faixa) => faixa.ato === indice + 1
            )
        }))
    };
}

// Valida a sessão diretamente com o Supabase.
async function exigirLogin(req, res, next) {
    const autorizacao = req.get("Authorization") || "";
    const resultado = /^Bearer\s+(\S+)$/i.exec(autorizacao);

    if (!resultado) {
        return res.status(401).json({
            erro: "Entre na sua conta para continuar."
        });
    }

    try {
        const resposta = await fetch(
            `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
            {
                headers: {
                    apikey: supabaseChave,
                    Authorization: `Bearer ${resultado[1]}`
                },
                signal: AbortSignal.timeout(10000)
            }
        );

        if (resposta.status === 401 || resposta.status === 403) {
            return res.status(401).json({
                erro: "Sua sessão expirou. Saia e entre novamente."
            });
        }

        if (!resposta.ok) {
            return res.status(503).json({
                erro: "Não foi possível verificar o login. Tente novamente."
            });
        }

        const usuario = await resposta.json();

        if (!formatoUuid.test(usuario.id || "")) {
            return res.status(401).json({
                erro: "Sessão inválida."
            });
        }

        req.usuarioId = usuario.id;
        next();
    } catch {
        res.status(503).json({
            erro: "O serviço de login está indisponível. Tente novamente."
        });
    }
}

// Serve o site gerado pelo Vite.
const pastaFrontend = path.join(
    __dirname,
    "..",
    "frontend",
    "dist"
);

app.use(express.static(pastaFrontend));

app.get("/api/health", rotaAssincrona(async (req, res) => {
    await banco.query("select 1");

    res.json({
        servico: "in-four-acts",
        status: "ok",
        banco: "conectado",
        horario: new Date().toISOString()
    });
}));

// Todas as rotas de playlists exigem uma sessão válida.
app.use("/api/playlists", exigirLogin);

app.param("id", (req, res, next, id) => {
    if (!formatoUuid.test(id)) {
        return res.status(400).json({
            erro: "Identificador de playlist inválido."
        });
    }

    next();
});

app.get("/api/playlists", rotaAssincrona(async (req, res) => {
    const playlists = await banco.query(
        `
            select *
            from in_four_acts.playlists
            where usuario_id = $1
            order by criada_em asc, id
        `,
        [req.usuarioId]
    );

    const faixas = await banco.query(
        `
            select f.*
            from in_four_acts.faixas f
            join in_four_acts.playlists p
                on p.id = f.playlist_id
            where p.usuario_id = $1
            order by f.ato, f.posicao
        `,
        [req.usuarioId]
    );

    res.json(
        playlists.rows.map((playlist) =>
            formatarPlaylist(
                playlist,
                faixas.rows.filter(
                    (faixa) => faixa.playlist_id === playlist.id
                )
            )
        )
    );
}));

app.post("/api/playlists", rotaAssincrona(async (req, res) => {
    const {
        nome,
        descricao = "",
        atmosfera = ""
    } = req.body || {};

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        nome.length > 100
    ) {
        return res.status(400).json({
            erro: "Informe um nome com até 100 caracteres."
        });
    }

    if (typeof descricao !== "string" || descricao.length > 500) {
        return res.status(400).json({
            erro: "A descrição deve ter até 500 caracteres."
        });
    }

    if (typeof atmosfera !== "string" || atmosfera.length > 60) {
        return res.status(400).json({
            erro: "A atmosfera deve ter até 60 caracteres."
        });
    }

    const resultado = await banco.query(
        `
            insert into in_four_acts.playlists (
                nome, descricao, atmosfera, usuario_id
            )
            values ($1, $2, $3, $4)
            returning *
        `,
        [
            nome.trim(),
            descricao.trim(),
            atmosfera.trim(),
            req.usuarioId
        ]
    );

    res.status(201).json(formatarPlaylist(resultado.rows[0]));
}));

app.delete("/api/playlists/:id", rotaAssincrona(async (req, res) => {
    const resultado = await banco.query(
        `
            delete from in_four_acts.playlists
            where id = $1 and usuario_id = $2
            returning id
        `,
        [req.params.id, req.usuarioId]
    );

    if (resultado.rowCount === 0) {
        return res.status(404).json({
            erro: "Playlist não encontrada."
        });
    }

    res.status(204).end();
}));

app.post(
    "/api/playlists/:id/faixas",
    rotaAssincrona(async (req, res) => {
        const {
            titulo,
            artista,
            album = "",
            ato
        } = req.body || {};

        if (
            typeof titulo !== "string" ||
            !titulo.trim() ||
            titulo.length > 150
        ) {
            return res.status(400).json({
                erro: "Informe o título com até 150 caracteres."
            });
        }

        if (
            typeof artista !== "string" ||
            !artista.trim() ||
            artista.length > 150
        ) {
            return res.status(400).json({
                erro: "Informe o artista com até 150 caracteres."
            });
        }

        if (typeof album !== "string" || album.length > 150) {
            return res.status(400).json({
                erro: "O álbum deve ter até 150 caracteres."
            });
        }

        if (!Number.isInteger(ato) || ato < 1 || ato > 4) {
            return res.status(400).json({
                erro: "Escolha um ato entre 1 e 4."
            });
        }

        const conexao = await banco.connect();

        try {
            await conexao.query("begin");

            const playlist = await conexao.query(
                `
                    select id
                    from in_four_acts.playlists
                    where id = $1 and usuario_id = $2
                    for update
                `,
                [req.params.id, req.usuarioId]
            );

            if (playlist.rowCount === 0) {
                await conexao.query("rollback");

                return res.status(404).json({
                    erro: "Playlist não encontrada."
                });
            }

            const resultado = await conexao.query(
                `
                    insert into in_four_acts.faixas (
                        playlist_id, titulo, artista, album, ato, posicao
                    )
                    select
                        $1, $2, $3, $4, $5,
                        coalesce(max(posicao), 0) + 1
                    from in_four_acts.faixas
                    where playlist_id = $1 and ato = $5
                    returning *
                `,
                [
                    req.params.id,
                    titulo.trim(),
                    artista.trim(),
                    album.trim(),
                    ato
                ]
            );

            await conexao.query("commit");
            res.status(201).json(resultado.rows[0]);
        } catch (erro) {
            await conexao.query("rollback");
            throw erro;
        } finally {
            conexao.release();
        }
    })
);

app.delete(
    "/api/playlists/:id/faixas/:faixaId",
    rotaAssincrona(async (req, res) => {
        if (!formatoUuid.test(req.params.faixaId)) {
            return res.status(400).json({
                erro: "Identificador de música inválido."
            });
        }

        const resultado = await banco.query(
            `
                delete from in_four_acts.faixas f
                using in_four_acts.playlists p
                where f.playlist_id = p.id
                    and f.id = $1
                    and p.id = $2
                    and p.usuario_id = $3
                returning f.id
            `,
            [
                req.params.faixaId,
                req.params.id,
                req.usuarioId
            ]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: "Música não encontrada."
            });
        }

        res.status(204).end();
    })
);

app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada."
    });
});

app.use((erro, req, res, next) => {
    if (erro.type === "entity.parse.failed") {
        return res.status(400).json({
            erro: "O conteúdo enviado não é um JSON válido."
        });
    }

    if (erro.type === "entity.too.large") {
        return res.status(413).json({
            erro: "O conteúdo enviado é muito grande."
        });
    }

    console.error("Erro na API:", erro.message);

    res.status(500).json({
        erro: "Não foi possível concluir a operação."
    });
});

const host = process.env.RENDER
    ? "0.0.0.0"
    : "127.0.0.1";

app.listen(porta, host, () => {
    console.log(`Servidor iniciado na porta ${porta}`);
});