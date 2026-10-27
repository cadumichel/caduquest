"use client";
import { useState, useTransition } from "react";
import { Avatar, CORES_AVATAR } from "@/components/Avatar";
import { Aviso, Botao } from "@/components/ui";
import { BASICOS, medalhasNecessarias, ORDEM_ESPECIAIS, PERSONAGENS, TOTAL_PERSONAGENS } from "@/lib/personagens";
import { salvarPerfil } from "../actions";

export function EscolherAvatar({
  avatarAtual,
  corAtual,
  medalhas,
}: {
  avatarAtual: number;
  corAtual: number;
  medalhas: number;
}) {
  const [avatar, setAvatar] = useState(avatarAtual);
  const [cor, setCor] = useState(corAtual);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string }>();
  const [pendente, iniciar] = useTransition();
  const mudou = avatar !== avatarAtual || cor !== corAtual;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar avatar={avatar} cor={cor} medalhas={medalhas} tamanho={72} />
        <div>
          <h2 className="text-lg font-extrabold">Mudar visual</h2>
          <p className="text-sm text-slate-600">
            {PERSONAGENS[avatar % TOTAL_PERSONAGENS].nome} · {PERSONAGENS[avatar % TOTAL_PERSONAGENS].epoca}
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-2 font-semibold">Personagens</h3>
        <div className="grid grid-cols-5 gap-2">
          {BASICOS.map((i) => (
            <OpcaoPersonagem key={i} indice={i} cor={cor} escolhido={avatar === i} onEscolher={setAvatar} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Especiais 🏅</h3>
        <p className="mb-2 text-sm text-slate-600">
          Cada desafio vencido libera um personagem especial. Você já liberou{" "}
          {Math.min(medalhas, ORDEM_ESPECIAIS.length)} de {ORDEM_ESPECIAIS.length}.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ORDEM_ESPECIAIS.map((i) => {
            return medalhasNecessarias(i) <= medalhas ? (
              <OpcaoPersonagem key={i} indice={i} cor={cor} escolhido={avatar === i} onEscolher={setAvatar} />
            ) : (
              <div
                key={i}
                title={`Vença ${medalhasNecessarias(i)} ${medalhasNecessarias(i) === 1 ? "desafio" : "desafios"} para liberar`}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/60 text-amber-700/70"
              >
                <span className="text-xl">🔒</span>
                <span className="text-[10px] font-semibold">{medalhasNecessarias(i)} 🏅</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Cor de fundo</h3>
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
}: {
  indice: number;
  cor: number;
  escolhido: boolean;
  onEscolher: (i: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEscolher(indice)}
      aria-label={PERSONAGENS[indice].nome}
      title={`${PERSONAGENS[indice].nome} · ${PERSONAGENS[indice].epoca}`}
      aria-pressed={escolhido}
      className={`flex justify-center rounded-xl p-1.5 transition ${escolhido ? "bg-marca-100 ring-2 ring-marca-600" : "hover:bg-slate-100"}`}
    >
      <Avatar avatar={indice} cor={cor} tamanho={48} />
    </button>
  );
}
