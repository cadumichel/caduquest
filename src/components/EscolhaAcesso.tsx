"use client";
import { useEffect, useRef, useState } from "react";
import { temMarca } from "./MarcaAparelho";

export type ModoAcesso = "entrar" | "cadastrar";

/**
 * Modo da tela de entrada. Abre em "Primeira vez aqui" quando o aparelho nunca
 * teve login; com a marca, abre em "Já tenho conta". Se o servidor avisar que o
 * apelido não existe, troca para o cadastro mantendo o que já foi digitado.
 */
export function useModoAcesso(chaveMarca: string, oferecerCadastro: boolean | undefined, estado: object) {
  const [modo, setModoBruto] = useState<ModoAcesso>("cadastrar");
  const [apelidoNaoAchado, setApelidoNaoAchado] = useState(false);
  const escolheu = useRef(false);

  useEffect(() => {
    if (!escolheu.current && temMarca(chaveMarca)) setModoBruto("entrar");
  }, [chaveMarca]);

  // Resposta nova do servidor com a oferta: ajusta o estado durante a renderização.
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    if (oferecerCadastro) {
      setModoBruto("cadastrar");
      setApelidoNaoAchado(true);
    }
  }

  const setModo = (m: ModoAcesso) => {
    escolheu.current = true;
    setApelidoNaoAchado(false);
    setModoBruto(m);
  };
  return { modo, setModo, apelidoNaoAchado };
}

/** Dois botões grandes lado a lado, no lugar da aba discreta. */
export function BotoesAcesso({ modo, setModo }: { modo: ModoAcesso; setModo: (m: ModoAcesso) => void }) {
  const opcoes = [
    { m: "cadastrar" as const, icone: "✨", titulo: "Primeira vez aqui", sub: "Criar minha conta" },
    { m: "entrar" as const, icone: "🔑", titulo: "Já tenho conta", sub: "Entrar com meu PIN" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Como você quer entrar">
      {opcoes.map(({ m, icone, titulo, sub }) => {
        const ativo = modo === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            aria-pressed={ativo}
            className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-3 text-center transition ${
              ativo
                ? "border-marca-600 bg-marca-600 text-white shadow-md"
                : "border-slate-200 bg-white text-slate-700 hover:border-marca-300 hover:bg-marca-50"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {icone}
            </span>
            <span className="text-base leading-tight font-bold">{titulo}</span>
            <span className={`text-xs ${ativo ? "text-marca-100" : "text-slate-500"}`}>{sub}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Aviso grande para anotar apelido e PIN, com a caixa de confirmação obrigatória. */
export function AvisoAnotar({ turma }: { turma: boolean }) {
  return (
    <div className="space-y-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-bold">📝 Anote e guarde seus dados de acesso</p>
      <p>
        Escreva {turma ? "o código da turma, " : ""}seu <strong>apelido</strong> e seu <strong>PIN</strong> no caderno
        ou na agenda. Você vai precisar deles <strong>toda vez</strong> que entrar no CaduQuest.
      </p>
      <p className="text-xs">
        {turma
          ? "Se esquecer o PIN, peça ao professor para redefinir."
          : "Não pedimos e-mail, então um PIN esquecido não tem como ser recuperado."}
      </p>
      <label className="flex items-start gap-2 font-semibold">
        <input type="checkbox" name="anotei" value="sim" required className="mt-0.5 size-4 accent-amber-600" />
        Anotei meu apelido e meu PIN
      </label>
    </div>
  );
}
