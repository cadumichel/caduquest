"use client";
import { useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { fundoLiberado, FUNDOS } from "@/lib/visual-perfil";
import { salvarVisual } from "../actions";

/** Fundo do cartão do perfil e título exibido abaixo do apelido. */
export function PersonalizarPerfil({
  fundoAtual,
  tituloAtual,
  nivel,
  medalhas,
  titulos,
  nomeNivel,
}: {
  fundoAtual: number;
  tituloAtual: string | null;
  nivel: number;
  medalhas: number;
  titulos: { id: string; nome: string }[];
  nomeNivel: string;
}) {
  const [fundo, setFundo] = useState(fundoAtual);
  const [titulo, setTitulo] = useState<string | null>(tituloAtual);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string }>();
  const [pendente, iniciar] = useTransition();
  const mudou = fundo !== fundoAtual || titulo !== tituloAtual;

  return (
    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold">🎨 Personalizar perfil</h2>

      <section>
        <h3 className="mb-2 font-semibold">Fundo do cartão</h3>
        <div className="grid grid-cols-3 gap-2">
          {FUNDOS.map((f, i) => {
            const liberado = fundoLiberado(i, { nivel, medalhas });
            return (
              <button
                key={f.nome}
                type="button"
                disabled={!liberado}
                onClick={() => setFundo(i)}
                aria-pressed={fundo === i}
                className={`relative flex h-16 items-end overflow-hidden rounded-xl bg-gradient-to-br ${f.classes} p-1.5 text-left text-[11px] leading-tight font-bold text-white transition disabled:cursor-not-allowed ${
                  fundo === i ? "ring-4 ring-marca-600 ring-offset-2" : ""
                }`}
              >
                {!liberado && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-[10px]">
                    <span className="text-base">🔒</span>
                    {f.vencedor ? "Vença 1 desafio" : `Nível ${f.nivel}`}
                  </span>
                )}
                <span className="drop-shadow">{f.nome}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Título</h3>
        <p className="mb-2 text-sm text-slate-600">
          Mostre uma conquista no seu cartão. Ganhe mais conquistas para ter mais títulos.
        </p>
        <div className="flex flex-wrap gap-2">
          <Opcao ativo={titulo === null} onClick={() => setTitulo(null)}>
            {nomeNivel} (nível)
          </Opcao>
          {titulos.map((t) => (
            <Opcao key={t.id} ativo={titulo === t.id} onClick={() => setTitulo(t.id)}>
              {t.nome}
            </Opcao>
          ))}
        </div>
      </section>

      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <Botao
        className="w-full py-3 text-base"
        disabled={!mudou || pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvarVisual(fundo, titulo);
            setMsg(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Perfil salvo!" });
          })
        }
      >
        {pendente ? "Salvando…" : "Salvar"}
      </Botao>
    </div>
  );
}

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        ativo ? "bg-marca-600 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
