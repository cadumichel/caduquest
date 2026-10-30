import {
  faixaDoAno,
  faixasDaRegua,
  formatarAno,
  iniciosPerguntas,
  MARCA_LACUNA,
  subPermutacao,
  type Conteudo,
  type Resposta,
} from "@/lib/questoes/tipos";
import { urlImagem } from "@/lib/tipos-banco";
import { Citacao, Documento, ImagemComPinos } from "./QuestaoInterativa";

const LETRAS = "ABCDEF";

/**
 * Mostra o gabarito de uma questão e, se houver, a resposta do aluno.
 * A resposta vem em índices exibidos; a permutação traduz para os originais.
 */
export function Gabarito({
  conteudo,
  permutacao,
  resposta,
  doProfessor = false,
}: {
  conteudo: Conteudo;
  permutacao?: number[];
  resposta?: Resposta | null;
  /** Professor vendo a resposta de um aluno: troca "sua resposta" por "resposta do aluno". */
  doProfessor?: boolean;
}) {
  const rotulo = doProfessor ? "resposta do aluno" : "sua resposta";
  const orig = (exibido: number | null | undefined) =>
    exibido === null || exibido === undefined || !permutacao ? -1 : (permutacao[exibido] ?? -1);

  switch (conteudo.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse": {
      const escolhida = resposta?.tipo === conteudo.tipo && "escolha" in resposta ? orig(resposta.escolha) : -1;
      const alternativas = conteudo.tipo === "quem_disse" ? conteudo.conteudo.autores : conteudo.conteudo.alternativas;
      const lista = (
        <ul className="space-y-1 text-sm">
          {alternativas.map((a, i) => {
            const certa = i === conteudo.conteudo.correta;
            return (
              <li
                key={i}
                className={`rounded-lg px-3 py-1.5 ${certa ? "bg-emerald-50 font-medium text-emerald-900" : escolhida === i ? "bg-red-50 text-red-800" : "text-slate-600"}`}
              >
                {LETRAS[i]}) {a} {certa && "✓"} {escolhida === i && !certa && `← ${rotulo}`}
              </li>
            );
          })}
        </ul>
      );
      if (conteudo.tipo === "multipla_escolha") return lista;
      return (
        <div className="space-y-2">
          {conteudo.tipo === "quem_disse" ? (
            <Citacao texto={conteudo.conteudo.citacao} />
          ) : (
            <Documento texto={conteudo.conteudo.texto} />
          )}
          {lista}
        </div>
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
    case "ordenar_frases": {
      const ordem = resposta?.tipo === "ordenar_frases" ? resposta.ordem.map((e) => orig(e)) : null;
      return (
        <ol className="space-y-1 text-sm">
          {conteudo.conteudo.frases.map((f, i) => (
            <li key={i} className="flex gap-2 rounded-lg px-3 py-1.5">
              <span className="w-6 font-bold text-marca-700">{i + 1}º</span>
              <span className="flex-1">{f}</span>
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
    case "completar_lacunas": {
      const { texto, lacunas, extras } = conteudo.conteudo;
      const banco = [...lacunas, ...extras];
      const preenchidas = resposta?.tipo === "completar_lacunas" ? resposta.preenchidas : null;
      const partes = texto.split(MARCA_LACUNA);
      return (
        <div className="space-y-2 text-sm">
          <p className="leading-7">
            {partes.map((parte, k) => {
              if (k === partes.length - 1) return <span key={k}>{parte}</span>;
              const escolhida = preenchidas ? banco[orig(preenchidas[k])] : undefined;
              const acertou = escolhida?.trim().toLowerCase() === lacunas[k].trim().toLowerCase();
              return (
                <span key={k}>
                  {parte}
                  <strong className="rounded bg-emerald-50 px-1 text-emerald-900">{lacunas[k]}</strong>
                  {preenchidas && !acertou && (
                    <span className="ml-1 rounded bg-red-50 px-1 text-red-800 line-through">
                      {escolhida ?? "vazio"}
                    </span>
                  )}
                </span>
              );
            })}
          </p>
          {extras.length > 0 && <p className="text-slate-500">Palavras que sobravam: {extras.join(", ")}.</p>}
        </div>
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
                        {LETRAS[i]}) {a} {certa && "✓"} {escolhida === i && !certa && `← ${rotulo}`}
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
    case "classificar": {
      const { grupos, itens } = conteudo.conteudo;
      // Resposta por item exibido; traduz para o item original.
      const escolhido = new Map<number, number | null>();
      if (resposta?.tipo === "classificar") resposta.grupos.forEach((g, exibido) => escolhido.set(orig(exibido), g));
      return (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {grupos.map((g, gi) => (
            <div key={gi} className="rounded-lg border border-slate-200 p-2">
              <p className="mb-1 font-bold text-marca-800">{g}</p>
              <ul className="space-y-0.5">
                {itens.map((item, i) =>
                  item.grupo === gi ? (
                    <li key={i} className="flex gap-2">
                      <span className="flex-1">{item.texto}</span>
                      {resposta && (
                        <span className={escolhido.get(i) === gi ? "text-emerald-700" : "text-red-700"}>
                          {escolhido.get(i) === gi ? "✓" : "✗"}
                        </span>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ))}
        </div>
      );
    }
    case "intruso": {
      const escolhida = resposta?.tipo === "intruso" ? orig(resposta.escolha) : -1;
      const { itens, intruso, criterio } = conteudo.conteudo;
      return (
        <div className="space-y-1 text-sm">
          <ul className="space-y-1">
            {itens.map((item, i) => (
              <li
                key={i}
                className={`rounded-lg px-3 py-1.5 ${i === intruso ? "bg-emerald-50 font-medium text-emerald-900" : escolhida === i ? "bg-red-50 text-red-800" : "text-slate-600"}`}
              >
                {item} {i === intruso && "← intruso ✓"} {escolhida === i && i !== intruso && `← ${rotulo}`}
              </li>
            ))}
          </ul>
          <p className="px-3 text-slate-600">Os outros têm em comum: {criterio}</p>
        </div>
      );
    }
    case "ponto_de_vista": {
      const ligacoes = resposta?.tipo === "ponto_de_vista" ? resposta.ligacoes : null;
      const { relatos, extras } = conteudo.conteudo;
      return (
        <div className="space-y-2 text-sm">
          {relatos.map((r, i) => {
            const certo = ligacoes ? orig(ligacoes[i]) === i : null;
            return (
              <div key={i} className="space-y-1">
                <Documento texto={r.texto} />
                <p className="px-1">
                  <strong>{r.perspectiva}</strong>{" "}
                  {certo !== null && (
                    <span className={certo ? "text-emerald-700" : "text-red-700"}>{certo ? "✓" : "✗"}</span>
                  )}
                </p>
              </div>
            );
          })}
          {extras.length > 0 && <p className="text-slate-500">Não era de nenhum relato: {extras.join(", ")}.</p>}
        </div>
      );
    }
    case "linha_do_tempo_datas": {
      const c = conteudo.conteudo;
      const escolhida = new Map<number, number | null>();
      if (resposta?.tipo === "linha_do_tempo_datas")
        resposta.faixas.forEach((f, exibido) => escolhida.set(orig(exibido), f));
      const faixas = faixasDaRegua(c);
      const ordenados = c.eventos.map((e, i) => ({ ...e, i })).sort((a, b) => a.ano - b.ano);
      return (
        <ol className="space-y-1 text-sm">
          {ordenados.map((e) => {
            const certa = faixaDoAno(c, e.ano);
            const f = escolhida.get(e.i);
            const marca = !resposta
              ? null
              : f === certa
                ? "✓"
                : f !== null && f !== undefined && Math.abs(f - certa) === 1
                  ? "½"
                  : "✗";
            return (
              <li key={e.i} className="flex gap-2 rounded-lg px-3 py-1.5">
                <span className="w-20 shrink-0 font-bold text-marca-700 tabular-nums">{formatarAno(e.ano)}</span>
                <span className="flex-1">
                  {e.texto}{" "}
                  <span className="text-slate-500">
                    ({formatarAno(faixas[certa][0])} – {formatarAno(faixas[certa][1])})
                  </span>
                </span>
                {marca && (
                  <span
                    className={marca === "✓" ? "text-emerald-700" : marca === "½" ? "text-amber-700" : "text-red-700"}
                  >
                    {marca}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      );
    }
    case "mapa": {
      const { marcadores, imagem } = conteudo.conteudo;
      const escolhido = new Map<number, number | null>();
      if (resposta?.tipo === "mapa") resposta.pinos.forEach((p, exibido) => escolhido.set(orig(exibido), p));
      return (
        <div className="space-y-2 text-sm">
          <ImagemComPinos imagem={urlImagem(imagem) ?? ""} pinos={marcadores} />
          <ul className="space-y-1">
            {marcadores.map((m, i) => {
              const p = escolhido.get(i);
              return (
                <li key={i} className="flex gap-2 rounded-lg px-3 py-1">
                  <span className="w-6 font-bold text-marca-700">{i + 1}</span>
                  <span className="flex-1">{m.nome}</span>
                  {resposta && (
                    <span className={p === i ? "text-emerald-700" : "text-red-700"}>
                      {p === i
                        ? "✓"
                        : p === null || p === undefined
                          ? "–"
                          : `✗ (${doProfessor ? "aluno" : "você"}: ${p + 1})`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
  }
}
