"use client";
import { formatarMultiplicador, MULTIPLICADORES, PERCENTUAIS_TEMPO } from "@/lib/especial";

/** Multiplicador de pontos e tempo do desafio especial (botões, sem digitar). */
export function CamposEspecial({
  multiplicador,
  percentual,
  onMultiplicador,
  onPercentual,
}: {
  multiplicador: number;
  percentual: number;
  onMultiplicador: (n: number) => void;
  onPercentual: (n: number) => void;
}) {
  return (
    <div className="space-y-3">
      <Escolha
        rotulo="Pontos"
        opcoes={MULTIPLICADORES.map((m) => ({ valor: m, texto: `${formatarMultiplicador(m)}` }))}
        valor={multiplicador}
        onChange={onMultiplicador}
      />
      <Escolha
        rotulo="Tempo de cada questão"
        dica="O cronômetro conta normalmente; só o tempo é menor. As questões teste mantêm o tempo delas."
        opcoes={PERCENTUAIS_TEMPO.map((p) => ({ valor: p, texto: p === 100 ? "Normal" : `${p}%` }))}
        valor={percentual}
        onChange={onPercentual}
      />
    </div>
  );
}

function Escolha({
  rotulo,
  dica,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  dica?: string;
  opcoes: { valor: number; texto: string }[];
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{rotulo}</p>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => onChange(o.valor)}
            aria-pressed={valor === o.valor}
            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
              valor === o.valor ? "border-ouro bg-amber-50 text-amber-900" : "border-slate-200 text-slate-600"
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
      {dica && <p className="mt-1 text-xs text-slate-500">{dica}</p>}
    </div>
  );
}
