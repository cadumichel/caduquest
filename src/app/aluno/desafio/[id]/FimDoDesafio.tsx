"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Aviso, BotaoLink } from "@/components/ui";
import { formatarAcertos, formatarPontos } from "@/lib/pontos";
import type { ResumoDesafio } from "@/lib/resumo-desafio";
import { resumoFinal } from "../../actions";

/**
 * Tela final do desafio: o que o aluno fez e ganhou, e o próximo passo.
 * Os números vêm do servidor; se a busca falhar, ficam só os botões.
 */
export function FimDoDesafio({ desafioId, aviso }: { desafioId: string; aviso?: string }) {
  const [resumo, setResumo] = useState<ResumoDesafio | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    resumoFinal(desafioId)
      .then((r) => vivo && setResumo(r))
      .catch(() => {})
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [desafioId]);

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6 text-center">
      {aviso && <Aviso>{aviso}</Aviso>}
      <div className="rounded-3xl bg-gradient-to-br from-marca-700 to-marca-950 p-6 text-white shadow-lg">
        <p className="text-6xl">🏆</p>
        <h1 className="mt-2 text-2xl font-extrabold">
          {resumo && !resumo.concluido ? "Desafio encerrado" : "Desafio concluído!"}
        </h1>
        {carregando && <p className="mt-3 text-sm text-marca-100">Somando seus pontos…</p>}
        {resumo && (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Numero valor={formatarPontos(resumo.pontos)} rotulo="pontos" />
              <Numero valor={formatarAcertos(resumo.acertos, resumo.total)} rotulo="acertos" />
              <Numero valor={`+${resumo.xp}`} rotulo="XP" />
            </div>
            <ul className="mt-4 space-y-2 text-left text-sm">
              {resumo.posicao !== null && (
                <Linha icone="📊">
                  Você está em <b>{resumo.posicao}º</b> de {resumo.alunosNaTurma} no ranking da temporada.
                </Linha>
              )}
              {resumo.sequencia > 0 && (
                <Linha icone="🔥">
                  Ofensiva: <b>{resumo.sequencia}</b> {resumo.sequencia === 1 ? "desafio" : "desafios seguidos"}
                  {resumo.bonusOfensiva > 0 && ` · +${resumo.bonusOfensiva} pts de bônus na temporada`}.
                </Linha>
              )}
              {resumo.subiuDeNivel && (
                <Linha icone="⭐">
                  Você subiu para o <b>nível {resumo.nivel}</b> ({resumo.nomeNivel})
                  {resumo.personagensNovos > 0 &&
                    ` e liberou ${resumo.personagensNovos} ${resumo.personagensNovos === 1 ? "personagem novo" : "personagens novos"}`}
                  .{" "}
                  {resumo.personagensNovos > 0 && (
                    <Link href="/aluno/perfil#visual" className="font-bold text-ouro-claro underline">
                      Ver
                    </Link>
                  )}
                </Linha>
              )}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {resumo?.proximo?.tipo === "desafio" && (
          <BotaoLink href={resumo.proximo.href} className="py-4 text-base">
            ▶ Próximo desafio: {resumo.proximo.titulo}
          </BotaoLink>
        )}
        {resumo?.proximo?.tipo === "revisao" && (
          <BotaoLink href={resumo.proximo.href} className="py-4 text-base">
            📚 Revisar meus erros ({resumo.proximo.titulo})
          </BotaoLink>
        )}
        <BotaoLink
          href={`/aluno/desafio/${desafioId}/resultado`}
          variante={resumo?.proximo ? "secundario" : "primario"}
        >
          Ver meu resultado
        </BotaoLink>
        <BotaoLink href="/aluno" variante="secundario">
          Voltar ao início
        </BotaoLink>
      </div>
    </div>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
      <p className="text-xl font-extrabold tabular-nums">{valor}</p>
      <p className="text-xs text-marca-100">{rotulo}</p>
    </div>
  );
}

function Linha({ icone, children }: { icone: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 rounded-xl bg-white/10 px-3 py-2">
      <span aria-hidden>{icone}</span>
      <span>{children}</span>
    </li>
  );
}
