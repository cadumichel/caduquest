"use client";
import { useState, useTransition } from "react";
import { AreaTexto, Aviso, Botao } from "@/components/ui";
import { salvarCarta } from "../actions";

export function FormCarta({ temaAtual }: { temaAtual: string | null }) {
  const [tema, setTema] = useState(temaAtual ?? "");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string }>();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Tema escolhido</span>
        <AreaTexto
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Ex.: Página 42 da apostila ou o subtítulo “A crise do Império Romano”"
        />
        <span className="block text-xs text-slate-500">
          Todos da sua turma e das turmas da mesma série vão ver o tema com o seu personagem.
        </span>
      </label>
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <Botao
        variante="ouro"
        className="w-full py-3 text-base"
        disabled={pendente || tema.trim().length < 3 || tema.trim() === (temaAtual ?? "")}
        onClick={() =>
          iniciar(async () => {
            const r = await salvarCarta(tema);
            setMsg(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: r.ok ?? "Salvo!" });
          })
        }
      >
        {pendente ? "Salvando…" : temaAtual ? "Mudar o tema" : "Usar a carta coringa 🃏"}
      </Botao>
    </div>
  );
}
