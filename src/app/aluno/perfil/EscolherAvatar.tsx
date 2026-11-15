"use client";
import { useState, useTransition } from "react";
import { Avatar, CORES_AVATAR } from "@/components/Avatar";
import { Aviso, Botao } from "@/components/ui";
import {
  BASICOS_POR_DESAFIO,
  BASICOS_POR_DESAFIO_BOM,
  type Desbloqueios,
  INICIAIS,
  lendariosLiberados,
  numeroDoLendario,
  ORDEM_BASICOS,
  ORDEM_ESPECIAIS,
  PERSONAGENS,
  personagemLiberado,
  TOTAL_PERSONAGENS,
} from "@/lib/personagens";
import { CURIOSIDADE_PERSONAGEM } from "@/lib/personagens-curiosidades";
import { salvarPerfil } from "../actions";

export function EscolherAvatar({
  avatarAtual,
  corAtual,
  medalhas,
  desbloqueios,
}: {
  avatarAtual: number;
  corAtual: number;
  medalhas: number;
  desbloqueios: Desbloqueios;
}) {
  const [avatar, setAvatar] = useState(avatarAtual);
  // Personagem em destaque no álbum: o escolhido ou um bloqueado que o aluno tocou.
  const [visto, setVisto] = useState(avatarAtual);
  const [cor, setCor] = useState(corAtual);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string }>();
  const [pendente, iniciar] = useTransition();
  const mudou = avatar !== avatarAtual || cor !== corAtual;
  const liberado = (i: number) => i === avatarAtual || personagemLiberado(i, desbloqueios);
  const naColecao = PERSONAGENS.filter((_, i) => liberado(i)).length;
  const escolher = (i: number) => {
    setAvatar(i);
    setVisto(i);
  };
  const p = PERSONAGENS[visto % TOTAL_PERSONAGENS];
  const vistoLiberado = liberado(visto);
  const lendarioVisto = (ORDEM_ESPECIAIS as readonly number[]).includes(visto);

  return (
    <div id="visual" className="scroll-mt-4 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold">Mudar visual</h2>
        <p className="text-sm text-slate-600">
          📖 Seu álbum: {naColecao} de {TOTAL_PERSONAGENS} personagens. Toque num personagem para ler a curiosidade.
        </p>
      </div>

      <div
        aria-live="polite"
        className={`flex items-center gap-4 rounded-2xl p-3 ${
          lendarioVisto
            ? "bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 text-white ring-1 ring-amber-300/50"
            : "bg-amber-50 ring-1 ring-amber-200"
        }`}
      >
        <span className="relative shrink-0">
          <Avatar
            avatar={visto}
            cor={cor}
            medalhas={visto === avatar ? medalhas : 0}
            tamanho={84}
            className={vistoLiberado ? "" : lendarioVisto ? "brightness-[0.35]" : "opacity-40 grayscale"}
          />
          {!vistoLiberado && <span className="absolute inset-0 flex items-center justify-center text-2xl">🔒</span>}
        </span>
        <div className="min-w-0">
          <p
            className={`text-[11px] font-bold tracking-widest uppercase ${lendarioVisto ? "text-amber-300" : "text-amber-800"}`}
          >
            {lendarioVisto ? "✦ Lendário" : "Personagem"}
            {vistoLiberado && visto === avatar ? " · escolhido" : ""}
          </p>
          <p className="font-extrabold">
            {vistoLiberado ? p.nome : "???"} <span className="text-xs font-normal opacity-75">· {p.epoca}</span>
          </p>
          <p className={`mt-0.5 text-xs leading-snug ${lendarioVisto ? "text-amber-50" : "text-slate-700"}`}>
            {vistoLiberado
              ? CURIOSIDADE_PERSONAGEM[p.nome]
              : lendarioVisto
                ? "Complete uma temporada com pelo menos 50% de acerto ou vença um desafio para liberar os lendários, em ordem."
                : "Conclua desafios para liberar este personagem e a curiosidade dele."}
          </p>
        </div>
      </div>

      <section>
        <h3 className="font-semibold">Personagens</h3>
        <p className="mb-2 text-sm text-slate-600">
          Você começa com {INICIAIS.length}. Cada desafio que você termina libera mais: {BASICOS_POR_DESAFIO_BOM} se
          acertar mais da metade, {BASICOS_POR_DESAFIO} se acertar metade ou menos.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ORDEM_BASICOS.map((i) =>
            liberado(i) ? (
              <OpcaoPersonagem key={i} indice={i} cor={cor} escolhido={avatar === i} onEscolher={escolher} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => setVisto(i)}
                aria-pressed={visto === i}
                title="Conclua desafios para liberar"
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 ${
                  visto === i ? "ring-2 ring-amber-400" : ""
                }`}
              >
                <span className="text-lg">🔒</span>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="-mx-2 rounded-2xl bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 p-3 text-white">
        <h3 className="font-extrabold text-amber-300">✦ Lendários</h3>
        <p className="mb-3 text-sm text-amber-50">
          Faça todos os desafios de uma temporada com pelo menos 50% de acerto e ganhe um lendário quando ela encerrar.
          Vencer um desafio (maior pontuação da turma) também libera um. Você já liberou{" "}
          {lendariosLiberados(desbloqueios)} de {ORDEM_ESPECIAIS.length}.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ORDEM_ESPECIAIS.map((i) =>
            liberado(i) ? (
              <OpcaoPersonagem key={i} indice={i} cor={cor} escolhido={avatar === i} onEscolher={escolher} lendario />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => setVisto(i)}
                aria-pressed={visto === i}
                title={`${numeroDoLendario(i)}º lendário`}
                className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-300/25 to-amber-700/30 text-amber-200 ring-1 ring-amber-300/50 ${
                  visto === i ? "ring-2 ring-amber-300" : ""
                }`}
              >
                <span className="text-lg">🔒</span>
                <span className="text-[10px] font-semibold">{numeroDoLendario(i)}º</span>
              </button>
            ),
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Cor da moldura</h3>
        <div className="flex flex-wrap gap-2">
          {CORES_AVATAR.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(i)}
              aria-label={`Cor ${i + 1}`}
              aria-pressed={cor === i}
              className={`size-10 rounded-full transition ${cor === i ? "ring-4 ring-slate-800 ring-offset-2" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </section>

      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <Botao
        className="w-full py-3 text-base"
        disabled={!mudou || pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvarPerfil(avatar, cor);
            setMsg(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Perfil salvo!" });
          })
        }
      >
        {pendente ? "Salvando…" : "Salvar"}
      </Botao>
    </div>
  );
}

function OpcaoPersonagem({
  indice,
  cor,
  escolhido,
  onEscolher,
  lendario = false,
}: {
  indice: number;
  cor: number;
  escolhido: boolean;
  onEscolher: (i: number) => void;
  lendario?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEscolher(indice)}
      aria-label={PERSONAGENS[indice].nome}
      title={`${PERSONAGENS[indice].nome} · ${PERSONAGENS[indice].epoca}`}
      aria-pressed={escolhido}
      className={`flex justify-center rounded-xl p-1.5 transition ${
        escolhido
          ? lendario
            ? "bg-amber-300/30 ring-2 ring-amber-300"
            : "bg-marca-100 ring-2 ring-marca-600"
          : lendario
            ? "hover:bg-white/10"
            : "hover:bg-slate-100"
      }`}
    >
      <Avatar avatar={indice} cor={cor} tamanho={48} />
    </button>
  );
}
