import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import App from "./App";
import "./App.css";

export default function Acesso() {
    const [sessao, setSessao] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [cadastro, setCadastro] = useState(false);

    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");

    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange(
            (evento, novaSessao) => {
                setSessao(novaSessao);
                setCarregando(false);
            }
        );

        return () => data.subscription.unsubscribe();
    }, []);

    async function enviarFormulario(evento) {
        evento.preventDefault();

        if (ocupado) return;

        setOcupado(true);
        setErro("");
        setMensagem("");

        try {
            const credenciais = {
                email: email.trim(),
                password: senha
            };

            const resultado = cadastro
                ? await supabase.auth.signUp(credenciais)
                : await supabase.auth.signInWithPassword(credenciais);

            if (resultado.error) {
                throw resultado.error;
            }

            setSenha("");

            if (cadastro && !resultado.data.session) {
                setMensagem(
                    "Confira seu e-mail para confirmar o cadastro. " +
                    "Depois volte aqui e entre na sua conta."
                );
            }
        } catch (falha) {
            setErro(
                falha.message === "Invalid login credentials"
                    ? "E-mail ou senha incorretos."
                    : falha.message === "Email not confirmed"
                      ? "Confirme seu e-mail antes de entrar."
                      : falha.message || "Não foi possível acessar sua conta."
            );
        } finally {
            setOcupado(false);
        }
    }

    async function sair() {
        setOcupado(true);
        setErro("");

        try {
            const { error } = await supabase.auth.signOut({
                scope: "local"
            });

            if (error) throw error;
        } catch {
            setErro("Não foi possível sair. Tente novamente.");
        } finally {
            setOcupado(false);
        }
    }

    if (carregando) {
        return (
            <div className="app">
                <p role="status">Verificando sua sessão...</p>
            </div>
        );
    }

    if (sessao) {
        return (
            <>
                <div className="barra-conta">
                    <span>{sessao.user.email}</span>

                    <button
                        type="button"
                        className="botao-secundario"
                        onClick={sair}
                        disabled={ocupado}
                    >
                        {ocupado ? "Saindo..." : "Sair"}
                    </button>

                    {erro && <p role="alert">{erro}</p>}
                </div>

                <App key={sessao.user.id} />
            </>
        );
    }

    return (
        <main className="tela-acesso">
            <section className="formulario">
                <p className="sobretitulo">IN FOUR ACTS</p>

                <h1>
                    Sua próxima história
                    <br />
                    começa aqui.
                </h1>

                <p className="texto-acesso">
                    {cadastro
                        ? "Crie sua conta para começar sua coleção."
                        : "Entre para continuar sua coleção."}
                </p>

                <form onSubmit={enviarFormulario}>
                    <label htmlFor="email-acesso">E-mail</label>

                    <input
                        id="email-acesso"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(evento) =>
                            setEmail(evento.target.value)
                        }
                        required
                    />

                    <label htmlFor="senha-acesso">Senha</label>

                    <input
                        id="senha-acesso"
                        type="password"
                        autoComplete={
                            cadastro ? "new-password" : "current-password"
                        }
                        minLength={8}
                        value={senha}
                        onChange={(evento) =>
                            setSenha(evento.target.value)
                        }
                        required
                    />

                    {cadastro && (
                        <p className="texto-acesso">
                            Use pelo menos 8 caracteres.
                        </p>
                    )}

                    {erro && (
                        <p className="erro-api" role="alert">
                            {erro}
                        </p>
                    )}

                    {mensagem && (
                        <p className="texto-acesso" role="status">
                            {mensagem}
                        </p>
                    )}

                    <button
                        className="botao-principal"
                        disabled={ocupado}
                    >
                        {ocupado
                            ? "Aguarde..."
                            : cadastro
                              ? "Criar conta"
                              : "Entrar"}
                    </button>

                    <button
                        type="button"
                        className="alternar-acesso"
                        disabled={ocupado}
                        onClick={() => {
                            setCadastro(!cadastro);
                            setSenha("");
                            setErro("");
                            setMensagem("");
                        }}
                    >
                        {cadastro
                            ? "Já tenho conta"
                            : "Ainda não tenho conta"}
                    </button>
                </form>
            </section>
        </main>
    );
}