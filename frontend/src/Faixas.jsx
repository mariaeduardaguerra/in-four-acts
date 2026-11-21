import { useState } from "react";
import { acessarApi as enviarRequisicao } from "./api";

export default function Faixas({ playlist, onAtualizar }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [artista, setArtista] = useState("");
  const [album, setAlbum] = useState("");
  const [ato, setAto] = useState("1");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");



  async function cadastrarMusica(evento) {
    evento.preventDefault();

    if (ocupado) return;

    setOcupado(true);
    setErro("");

    try {
      const faixa = await enviarRequisicao(
        `/api/playlists/${playlist.id}/faixas`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            titulo,
            artista,
            album,
            ato: Number(ato),
          }),
        },
      );

      onAtualizar((atual) => ({
        ...atual,

        atos: atual.atos.map((item) => {
          if (item.numero !== faixa.ato) {
            return item;
          }

          return {
            ...item,
            faixas: [...item.faixas, faixa],
          };
        }),
      }));

      setTitulo("");
      setArtista("");
      setAlbum("");
    } catch (falha) {
      setErro(
        falha instanceof TypeError
          ? "Não foi possível conectar ao servidor."
          : falha.message,
      );
    } finally {
      setOcupado(false);
    }
  }

  async function excluirMusica(faixa) {
    if (ocupado) return;

    const confirmado = window.confirm(`Remover "${faixa.titulo}" da playlist?`);

    if (!confirmado) return;

    setOcupado(true);
    setErro("");

    try {
      await enviarRequisicao(
        `/api/playlists/${playlist.id}/faixas/${faixa.id}`,
        { method: "DELETE" },
      );

      onAtualizar((atual) => ({
        ...atual,

        atos: atual.atos.map((item) => ({
          ...item,

          faixas: item.faixas.filter((musica) => musica.id !== faixa.id),
        })),
      }));
    } catch (falha) {
      setErro(
        falha instanceof TypeError
          ? "Não foi possível conectar ao servidor."
          : falha.message,
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="musicas">
      <button
        type="button"
        className="botao-secundario"
        aria-expanded={aberto}
        aria-controls={`musicas-${playlist.id}`}
        onClick={() => setAberto(!aberto)}
      >
        {aberto ? "Fechar músicas" : "Abrir músicas"}
      </button>

      <div id={`musicas-${playlist.id}`} hidden={!aberto}>
        <form className="formulario-faixa" onSubmit={cadastrarMusica}>
          <h4>Uma nova nota na história.</h4>

          <label>
            Título da música
            <input
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              maxLength={150}
              placeholder="Ex.: Born to Die"
              required
            />
          </label>

          <label>
            Artista
            <input
              value={artista}
              onChange={(evento) => setArtista(evento.target.value)}
              maxLength={150}
              placeholder="Ex.: Lana Del Rey"
              required
            />
          </label>

          <label>
            Álbum · opcional
            <input
              value={album}
              onChange={(evento) => setAlbum(evento.target.value)}
              maxLength={150}
              placeholder="Ex.: Born to Die"
            />
          </label>

          <label>
            Ato
            <select
              value={ato}
              onChange={(evento) => setAto(evento.target.value)}
            >
              {playlist.atos.map((item) => (
                <option key={item.numero} value={item.numero}>
                  {item.numero} · {item.nome}
                </option>
              ))}
            </select>
          </label>

          <button className="botao-principal" disabled={ocupado}>
            {ocupado ? "Aguarde..." : "+ Adicionar música"}
          </button>
        </form>

        {erro && (
          <p className="erro-api" role="alert">
            {erro}
          </p>
        )}

        <div className="lista-atos">
          {playlist.atos.map((item) => (
            <section className="ato-musical" key={item.numero}>
              <p className="sobretitulo">ATO {item.numero}</p>

              <h4>{item.nome}</h4>

              {item.faixas.length === 0 ? (
                <p className="vazio">Este ato espera sua primeira música.</p>
              ) : (
                <ol className="lista-faixas">
                  {item.faixas.map((faixa) => (
                    <li key={faixa.id}>
                      <div>
                        <strong>{faixa.titulo}</strong>

                        <span>{faixa.artista}</span>

                        {faixa.album && <small>{faixa.album}</small>}
                      </div>

                      <button
                        type="button"
                        className="remover-faixa"
                        onClick={() => excluirMusica(faixa)}
                        disabled={ocupado}
                        aria-label={`Remover ${faixa.titulo}`}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
