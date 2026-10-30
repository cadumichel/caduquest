import { iniciosPerguntas, subPermutacao, type Conteudo, type Resposta } from "@/lib/questoes/tipos";
import { Documento } from "./QuestaoInterativa";

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
    case "fonte_primaria": {
      const escolhas = resposta?.tipo === "fonte_primaria" ? resposta.escolhas : null;
      const inicios = iniciosPerguntas(conteudo.conteudo);
      return (
        <div className="space-y-3 text-sm">
          <Documento texto={conteudo.conteudo.documento} />
          {conteudo.conteudo.perguntas.map((p, j) => {
            const exibida = escolhas?.[j];
            const escolhida =
              exibida === null || exibida === undefined || !permutacao
                ? -1
                : (subPermutacao(permutacao, inicios[j], p.alternativas.length)[exibida] ?? -1);
            return (
              <div key={j}>
                <p className="font-medium">
                  {j + 1}. {p.pergunta}
                </p>
                <ul className="mt-1 space-y-1">
                  {p.alternativas.map((a, i) => {
                    const certa = i === p.correta;
                    return (
                      <li
                        key={i}
                        className={`rounded-lg px-3 py-1 ${certa ? "bg-emerald-50 font-medium text-emerald-900" : escolhida === i ? "bg-red-50 text-red-800" : "text-slate-600"}`}
                      >
                        {LETRAS[i]}) {a} {certa && "✓"} {escolhida === i && !certa && "← sua resposta"}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      );
    }
    case "causa_consequencia": {
      const ligacoes = resposta?.tipo === "causa_consequencia" ? resposta.ligacoes : null;
      const { relacoes, extras } = conteudo.conteudo;
      return (
        <div className="space-y-2 text-sm">
          <ul className="space-y-1">
            {relacoes.map((rel, i) => {
              const escolhida = ligacoes ? orig(ligacoes[i]) : -2;
              return (
                <li key={i} className="flex gap-2 rounded-lg px-3 py-1.5">
                  <span className="flex-1">
                    <strong>{rel.causa}</strong> → {rel.consequencia}
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
          {extras.length > 0 && (
            <p className="px-3 text-slate-500">Não era consequência de nenhuma causa: {extras.join("; ")}.</p>
          )}
        </div>
      );
    }
    case "encontrar_erro": {
      const marcados = resposta?.tipo === "encontrar_erro" ? resposta.marcados : [];
      const trechos = conteudo.conteudo.trechos;
      return (
        <div className="space-y-2 text-sm">
          <p className="leading-7">
            {trechos.map((t, i) => (
              <span key={i}>
                <span
                  className={
                    t.errado
                      ? `rounded px-1 line-through decoration-red-500 ${marcados.includes(i) ? "bg-emerald-100" : "bg-red-50"}`
                      : marcados.includes(i)
                        ? "rounded bg-red-100 px-1"
                        : ""
                  }
                >
                  {t.texto}
                </span>{" "}
              </span>
            ))}
          </p>
          <ul className="space-y-1">
            {trechos.map((t, i) =>
              t.errado ? (
                <li key={i} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-900">
                  {resposta && <span className="mr-1">{marcados.includes(i) ? "✓" : "✗"}</span>}
                  <span className="line-through">{t.texto}</span>
                  {t.correcao && <> → {t.correcao}</>}
                </li>
              ) : null,
            )}
          </ul>
          {trechos.some((t, i) => !t.errado && marcados.includes(i)) && (
            <p className="px-3 text-red-700">Os trechos com fundo vermelho estavam certos.</p>
          )}
        </div>
      );
    }
  }
}
