import type { Conteudo, Resposta } from "@/lib/questoes/tipos";

const LETRAS = "ABCDEF";

/**
 * Mostra o gabarito de uma questão e, se houver, a resposta do aluno.
 * A resposta vem em índices exibidos; a permutação traduz para os originais.
 */
export function Gabarito({
  conteudo,
  permutacao,
  resposta,
}: {
  conteudo: Conteudo;
  permutacao?: number[];
  resposta?: Resposta | null;
}) {
  const orig = (exibido: number | null | undefined) =>
    exibido === null || exibido === undefined || !permutacao ? -1 : (permutacao[exibido] ?? -1);

  switch (conteudo.tipo) {
    case "multipla_escolha": {
      const escolhida = resposta?.tipo === "multipla_escolha" ? orig(resposta.escolha) : -1;
      return (
        <ul className="space-y-1 text-sm">
          {conteudo.conteudo.alternativas.map((a, i) => {
            const certa = i === conteudo.conteudo.correta;
            return (
              <li
                key={i}
                className={`rounded-lg px-3 py-1.5 ${certa ? "bg-emerald-50 font-medium text-emerald-900" : escolhida === i ? "bg-red-50 text-red-800" : "text-slate-600"}`}
              >
                {LETRAS[i]}) {a} {certa && "✓"} {escolhida === i && !certa && "← sua resposta"}
              </li>
            );
          })}
        </ul>
      );
    }
    case "vf_bloco": {
      const valores = resposta?.tipo === "vf_bloco" ? resposta.valores : [];
      const marcado = new Map<number, boolean | null>();
      valores.forEach((v, exibido) => marcado.set(orig(exibido), v));
      return (
        <ul className="space-y-1 text-sm">
          {conteudo.conteudo.afirmativas.map((a, i) => {
            const v = marcado.get(i);
            const acertou = v === a.verdadeira;
            return (
              <li key={i} className="flex gap-2 rounded-lg px-3 py-1.5">
                <span className={`font-bold ${a.verdadeira ? "text-emerald-700" : "text-red-700"}`}>
                  {a.verdadeira ? "V" : "F"}
                </span>
                <span className="flex-1">{a.texto}</span>
                {resposta && (
                  <span className={acertou ? "text-emerald-700" : "text-red-700"}>
                    {v === undefined || v === null ? "–" : acertou ? "✓" : "✗"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }
    case "linha_do_tempo": {
      const ordem = resposta?.tipo === "linha_do_tempo" ? resposta.ordem.map((e) => orig(e)) : null;
      return (
        <ol className="space-y-1 text-sm">
          {conteudo.conteudo.eventos.map((e, i) => (
            <li key={i} className="flex gap-2 rounded-lg px-3 py-1.5">
              <span className="w-6 font-bold text-marca-700">{i + 1}º</span>
              <span className="flex-1">
                {e.texto} {e.data && <span className="text-slate-500">({e.data})</span>}
              </span>
              {ordem && (
                <span className={ordem[i] === i ? "text-emerald-700" : "text-red-700"}>
                  {ordem[i] === i ? "✓" : "✗"}
                </span>
              )}
            </li>
          ))}
        </ol>
      );
    }
    case "pares": {
      const ligacoes = resposta?.tipo === "pares" ? resposta.ligacoes : null;
      return (
        <ul className="space-y-1 text-sm">
          {conteudo.conteudo.pares.map((p, i) => {
            const escolhida = ligacoes ? orig(ligacoes[i]) : -2;
            return (
              <li key={i} className="flex gap-2 rounded-lg px-3 py-1.5">
                <span className="flex-1">
                  <strong>{p.esquerda}</strong> → {p.direita}
                </span>
                {ligacoes && (
                  <span className={escolhida === i ? "text-emerald-700" : "text-red-700"}>
                    {escolhida === i ? "✓" : "✗"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }
  }
}
