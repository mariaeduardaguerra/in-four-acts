import Faixas from "./Faixas";
import { useEffect, useState } from "react";
import "./App.css";
import { acessarApi } from "./api";



function exportarPlaylist(playlist) {
  function prepararCampo(valor) {
    let texto = String(valor ?? "");

    // Evita interpretar textos como fórmulas em planilhas.
    if (/^\s*[=+\-@]/.test(texto)) {
      texto = "'" + texto;
    }

    return `"${texto.replaceAll('"', '""')}"`;
  }

  const linhas = [["Ato", "Título", "Artista", "Álbum"]];

  for (const ato of playlist.atos) {
    for (const faixa of ato.faixas) {
      linhas.push([
        `${ato.numero} · ${ato.nome}`,
        faixa.titulo,
        faixa.artista,
        faixa.album,
      ]);
    }
  }

  const conteudo = linhas
    .map((linha) => linha.map(prepararCampo).join(","))
    .join("\r\n");

  const arquivo = new Blob(["\uFEFF", conteudo], {
    type: "text/csv;charset=utf-8;",
  });

  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  const nomeSeguro =
    playlist.nome
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .trim()
      .slice(0, 80) || "playlist";

  link.href = endereco;
  link.download = `${nomeSeguro}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(endereco), 1000);
}

function App() {
  const [status, setStatus] = useState("Conectando à API...");
  const [playlists, setPlaylists] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [erro, setErro] = useState("");

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [atmosfera, setAtmosfera] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function iniciar() {
      try {
        const saude = await acessarApi("/api/health", {
          signal: controlador.signal,
        });

        if (saude.servico !== "in-four-acts" || saude.status !== "ok") {
          throw new Error("A API respondeu com um serviço inesperado.");
        }

        const colecao = await acessarApi("/api/playlists", {
          signal: controlador.signal,
        });

        setPlaylists(colecao);
        setStatus("API conectada");
      } catch (falha) {
        if (falha.name !== "AbortError") {
          setStatus("Falha ao carregar");
          setErro(
            "Não foi possível carregar a coleção. " +
              "Confira o back-end e atualize a página.",
          );
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    iniciar();

    return () => controlador.abort();
  }, []);

  async function cadastrarPlaylist(evento) {
    evento.preventDefault();

    if (salvando) return;

    setErro("");
    setSalvando(true);

    try {
      const novaPlaylist = await acessarApi("/api/playlists", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          nome,
          descricao,
          atmosfera,
        }),
      });

      setPlaylists((colecao) => [...colecao, novaPlaylist]);

      setNome("");
      setDescricao("");
      setAtmosfera("");
    } catch (falha) {
      setErro(
        falha instanceof TypeError
          ? "Não foi possível conectar ao servidor."
          : falha.message,
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirPlaylist(playlist) {
    const confirmado = window.confirm(`Excluir a playlist "${playlist.nome}"?`);

    if (!confirmado || excluindo) return;

    setErro("");
    setExcluindo(playlist.id);

    try {
      await acessarApi(`/api/playlists/${playlist.id}`, {
        method: "DELETE",
      });

      setPlaylists((colecao) => {
        return colecao.filter((item) => item.id !== playlist.id);
      });
    } catch (falha) {
      setErro("Não foi possível excluir a playlist. Tente novamente.");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="app">
      <header className="cabecalho">
        <a className="marca" href="/">
          In Four Acts<span>✦</span>
        </a>

        <span className="status" role="status">
          {status}
        </span>
      </header>

      <main>
        <section className="apresentacao">
          <p className="sobretitulo">YOUR MUSIC. YOUR STORY.</p>

          <h1>
            Some stories
            <br />
            sound <em>better.</em>
          </h1>

          <p className="descricao">
            Uma abertura que seduz. Um conflito que fica. A catarse — e a última
            música antes do silêncio.
          </p>

          <span className="aviso">
            Uma coleção de histórias contadas em quatro atos.
          </span>
        </section>

        <section className="colecao">
          <form className="formulario" onSubmit={cadastrarPlaylist}>
            <p className="sobretitulo">A NEW STORY</p>
            <h2>Comece pela primeira nota.</h2>

            <label htmlFor="nome">Nome da playlist</label>

            <input
              id="nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              maxLength={100}
              placeholder="Ex.: Velvet Heartbreak"
              required
            />

            <label htmlFor="atmosfera">Atmosfera</label>

            <input
              id="atmosfera"
              value={atmosfera}
              onChange={(evento) => setAtmosfera(evento.target.value)}
              maxLength={60}
              placeholder="Ex.: melancólica, noturna, dramática"
            />

            <label htmlFor="descricao">Qual é a história?</label>

            <textarea
              id="descricao"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              maxLength={500}
              placeholder="Um amor que começou como segredo..."
            />

            <button
              className="botao-principal"
              disabled={carregando || salvando}
            >
              {salvando ? "Criando..." : "+ Criar playlist"}
            </button>
          </form>

          <section className="lista-playlists">
            <div className="titulo-colecao">
              <div>
                <p className="sobretitulo">YOUR COLLECTION</p>
                <h2>Histórias para ouvir.</h2>
              </div>

              <span>{playlists.length} playlist(s)</span>
            </div>

            {carregando && <p>Carregando coleção...</p>}

            {!carregando && playlists.length === 0 && (
              <p className="vazio">
                Sua primeira história começa no formulário ao lado.
              </p>
            )}

            {[...playlists].reverse().map((playlist) => (
              <article className="playlist" key={playlist.id}>
                <span className="sobretitulo">
                  {playlist.atmosfera || "A STORY IN FOUR ACTS"}
                </span>

                <h3>{playlist.nome}</h3>

                <p>{playlist.descricao || "Uma história ainda por contar."}</p>

                <div className="mini-atos">
                  {playlist.atos.map((ato) => (
                    <span key={ato.numero}>
                      Ato {ato.numero} · {ato.faixas.length} faixas
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className="botao-secundario"
                  onClick={() => exportarPlaylist(playlist)}
                  disabled={!playlist.atos.some((ato) => ato.faixas.length > 0)}
                >
                  Baixar playlist em CSV
                </button>

                <Faixas
                  playlist={playlist}
                  onAtualizar={(atualizar) => {
                    setPlaylists((colecao) =>
                      colecao.map((item) =>
                        item.id === playlist.id ? atualizar(item) : item,
                      ),
                    );
                  }}
                />

                <button
                  className="botao-excluir"
                  onClick={() => excluirPlaylist(playlist)}
                  disabled={Boolean(excluindo)}
                >
                  {excluindo === playlist.id ? "Excluindo..." : "Excluir"}
                </button>
              </article>
            ))}
          </section>
        </section>

        {erro && (
          <p className="erro-api" role="alert">
            {erro}
          </p>
        )}
      </main>

      <footer>
        In Four Acts · Versão local em desenvolvimento.
        <br />
        Suas playlists ficam salvas no banco de dados.
      </footer>
    </div>
  );
}

export default App;
