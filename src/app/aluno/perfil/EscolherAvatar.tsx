"use client";
import { useState, useTransition } from "react";
import { Avatar, CORES_AVATAR, TOTAL_AVATARES } from "@/components/Avatar";
import { Aviso, Botao } from "@/components/ui";
import { salvarPerfil } from "../actions";

export function EscolherAvatar({
  apelido,
  avatarAtual,
  corAtual,
  medalhas,
}: {
  apelido: string;
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
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        <Avatar avatar={avatar} cor={cor} medalhas={medalhas} tamanho={112} />
        <p className="text-lg font-bold">{apelido}</p>
        {medalhas > 0 && (
          <p className="text-sm text-slate-600">
            🏅 {medalhas} {medalhas === 1 ? "desafio vencido" : "desafios vencidos"}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Carinha</h2>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL_AVATARES }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setAvatar(i)}
              aria-label={`Carinha ${i + 1}`}
              aria-pressed={avatar === i}
              className={`flex justify-center rounded-xl p-1.5 transition ${avatar === i ? "bg-marca-100 ring-2 ring-marca-600" : "hover:bg-slate-100"}`}
            >
              <Avatar avatar={i} cor={cor} tamanho={48} />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Cor</h2>
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
