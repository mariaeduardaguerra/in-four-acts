import { supabase } from "./supabase";

export async function acessarApi(caminho, opcoes = {}) {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        throw new Error("Não foi possível recuperar sua sessão.");
    }

    const cabecalhos = new Headers(opcoes.headers);

    if (data.session) {
        cabecalhos.set(
            "Authorization",
            `Bearer ${data.session.access_token}`
        );
    }

    const resposta = await fetch(caminho, {
        ...opcoes,
        headers: cabecalhos
    });

    if (resposta.status === 204) {
        return null;
    }

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            dados.erro || "Não foi possível concluir a operação."
        );
    }

    return dados;
}