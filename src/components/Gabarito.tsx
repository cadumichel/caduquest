import {
  faixaDoAno,
  faixasDaRegua,
  formatarAno,
  iniciosPerguntas,
  MARCA_LACUNA,
  ordemDaCasa,
  subPermutacao,
  type Conteudo,
  type Resposta,
} from "@/lib/questoes/tipos";
import { urlImagem } from "@/lib/tipos-banco";
import { Citacao, Documento, ImagemComPinos } from "./QuestaoInterativa";
import { CaminhoTabuleiro } from "./Tabuleiro";
import { retratoDoTabuleiro } from "@/lib/questoes/apresentacao";
import { formatarEstimativa, notaEstimativa } from "@/lib/questoes/estimativa";
import { respostaAceita } from "@/lib/questoes/investigue";
import { fatorPistas } from "@/lib/questoes/pistas";
import { celulaDoEvento, dentroDaArea, notaEvento, raioNaAltura } from "@/lib/questoes/detalhe";
import { letraBase, notaConceito, ordemDoTurno, progressoConceito } from "@/lib/questoes/passos";

const LETRAS = "ABCDEF";

/**
 * Nas questões de ordenar, a lista mostra a ordem certa; numa posição errada,
 * diz o que o aluno colocou ali, para não parecer que a ordem dele foi a certa.
 */
function ColocadoAqui({ rotulo, texto }: { rotulo: string; texto: string | undefined }) {
  return (
    <span className="mt-0.5 block text-xs text-red-700">
      {rotulo}: {texto ?? "sem resposta"}
    </span>
  );
}

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
                  <span className={`shrink-0 whitespace-nowrap ${acertou ? "text-emerald-700" : "text-red-700"}`}>
                    {v === undefined || v === null ? "–" : acertou ? "✓" : `✗ (marcou ${v ? "V" : "F"})`}
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
              <span className="flex-1">
                {f}
                {ordem && ordem[i] !== i && <ColocadoAqui rotulo={rotulo} texto={conteudo.conteudo.frases[ordem[i]]} />}
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
                {ordem && ordem[i] !== i && (
                  <ColocadoAqui rotulo={rotulo} texto={conteudo.conteudo.eventos[ordem[i]]?.texto} />
                )}
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
    case "tabuleiro": {
      const { personagem, casas } = conteudo.conteudo;
      // Por casa: true = escolheu a certa, false = a errada, null = não escolheu.
      const acertos = casas.map((_, k) => {
        if (resposta?.tipo !== "tabuleiro" || !permutacao) return null;
        const e = resposta.escolhas[k];
        return e === 0 || e === 1 ? ordemDaCasa(permutacao, k)[e] === 0 : null;
      });
      const comResposta = resposta?.tipo === "tabuleiro";
      const certas = acertos.filter(Boolean).length;
      return (
        <div className="space-y-2 text-sm">
          <CaminhoTabuleiro
            personagem={personagem}
            avatar={retratoDoTabuleiro(conteudo.conteudo)}
            estados={acertos.map((a) => (!comResposta ? "neutra" : a ? "certa" : "errada"))}
            peao={casas.length + 1}
            legendas={casas.map((c) => c.certa)}
            emojis={casas.map((c) => c.emoji?.trim() || null)}
          />
          {comResposta && (
            <p className="font-semibold text-marca-800">
              {certas} de {casas.length} casas certas
            </p>
          )}
          <ol className="space-y-1">
            {casas.map((c, k) => {
              const a = acertos[k];
              return (
                <li
                  key={k}
                  className={`flex gap-2 rounded-lg px-3 py-1.5 ${!comResposta ? "" : a ? "bg-emerald-50" : "bg-red-50"}`}
                >
                  <span className="w-5 font-bold text-marca-700">{k + 1}</span>
                  {c.emoji?.trim() && <span aria-hidden>{c.emoji}</span>}
                  <span className="flex-1">
                    <span className="font-medium text-emerald-800">{c.certa}</span>
                    {comResposta && !a ? (
                      <span className="block text-xs text-red-700">
                        {a === null ? `${rotulo}: sem resposta` : `${rotulo}: ${c.errada}`}
                      </span>
                    ) : (
                      !comResposta && <span className="block text-xs text-slate-500 line-through">{c.errada}</span>
                    )}
                  </span>
                  {comResposta && <span className={a ? "text-emerald-700" : "text-red-700"}>{a ? "✓" : "✗"}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      );
    }
    case "estimativa": {
      const c = conteudo.conteudo;
      const fmt = (v: number) => formatarEstimativa(v, c);
      const marcado = resposta?.tipo === "estimativa" ? resposta.valor : undefined;
      const nota = marcado === undefined ? null : notaEstimativa(c, marcado);
      const zero = [
        c.valor - c.margem > c.minimo ? `abaixo de ${fmt(c.valor - c.margem)}` : null,
        c.valor + c.margem < c.maximo ? `acima de ${fmt(c.valor + c.margem)}` : null,
      ].filter(Boolean);
      return (
        <div className="space-y-1 text-sm">
          <p className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-900">
            Resposta: {fmt(c.valor)} ✓
          </p>
          <p className="px-3 text-slate-600">
            {c.acerto > 0
              ? `Nota cheia de ${fmt(Math.max(c.minimo, c.valor - c.acerto))} a ${fmt(Math.min(c.maximo, c.valor + c.acerto))}`
              : `Nota cheia só em ${fmt(c.valor)}`}
            {zero.length > 0 && `; vale zero ${zero.join(" e ")}`}. Entre os dois, a nota cai aos poucos.
          </p>
          {marcado !== undefined && (
            <p
              className={`rounded-lg px-3 py-1.5 ${nota === 1 ? "bg-emerald-50 text-emerald-900" : nota ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}`}
            >
              {marcado === null
                ? `${rotulo}: sem resposta`
                : `${rotulo}: ${fmt(marcado)} (${Math.round((nota ?? 0) * 100)}% da nota)`}
            </p>
          )}
        </div>
      );
    }
    case "quem_sou_eu": {
      const c = conteudo.conteudo;
      const r = resposta?.tipo === "quem_sou_eu" ? resposta : null;
      const escolhido = r ? orig(r.escolha) : -1;
      return (
        <div className="space-y-2 text-sm">
          <ol className="space-y-1">
            {c.pistas.map((p, k) => (
              <li key={k} className={`flex gap-2 rounded-lg px-3 py-1 ${r && k < r.pistas ? "bg-marca-50" : ""}`}>
                <span className="w-5 font-bold text-marca-700">{k + 1}</span>
                <span className="flex-1 italic">{p}</span>
                <span className="text-xs text-slate-500">{Math.round(fatorPistas(k + 1, c.pistas.length) * 100)}%</span>
              </li>
            ))}
          </ol>
          {r && (
            <p className="px-3 text-slate-600">
              {doProfessor ? "O aluno abriu" : "Você abriu"} {r.pistas} de {c.pistas.length} pistas.
            </p>
          )}
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {c.candidatos.map((cand, i) => {
              const certa = i === c.correta;
              return (
                <li
                  key={i}
                  className={`rounded-lg px-3 py-1.5 ${certa ? "bg-emerald-50 font-medium text-emerald-900" : escolhido === i ? "bg-red-50 text-red-800" : "text-slate-600"}`}
                >
                  {cand} {certa && "✓"} {escolhido === i && !certa && `← ${rotulo}`}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    case "monte_resposta": {
      const { espacos, distratores } = conteudo.conteudo;
      const banco = [...espacos.map((e) => e.trecho), ...distratores];
      const r = resposta?.tipo === "monte_resposta" ? resposta : null;
      return (
        <div className="space-y-2 text-sm">
          <ol className="space-y-1">
            {espacos.map((e, k) => {
              const posto = r ? banco[orig(r.preenchidas[k] ?? null)] : undefined;
              const certo = posto !== undefined && posto.trim() === e.trecho.trim();
              return (
                <li key={k} className={`rounded-lg px-3 py-1.5 ${!r ? "" : certo ? "bg-emerald-50" : "bg-red-50"}`}>
                  <span className="mr-2 text-xs font-black tracking-wide text-marca-800 uppercase">{e.rotulo}</span>
                  <span className="font-medium text-emerald-900">{e.trecho}</span> {r && (certo ? "✓" : "✗")}
                  {r && !certo && <ColocadoAqui rotulo={rotulo} texto={posto} />}
                </li>
              );
            })}
          </ol>
          <p className="px-3 text-xs text-slate-500">Não serviam:</p>
          <ul className="space-y-0.5 px-3 text-xs text-slate-500">
            {distratores.map((d, i) => (
              <li key={i} className="line-through">
                {d}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "investigue": {
      const { aceitas } = conteudo.conteudo;
      const r = resposta?.tipo === "investigue" ? resposta : null;
      const certo = r ? respostaAceita(r.texto, aceitas) : false;
      return (
        <div className="space-y-1 text-sm">
          <p className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-900">Resposta: {aceitas[0]} ✓</p>
          {aceitas.length > 1 && (
            <p className="px-3 text-xs text-slate-500">Também valem: {aceitas.slice(1).join(" · ")}</p>
          )}
          {r && (
            <p
              className={`rounded-lg px-3 py-1.5 ${certo ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}
            >
              {rotulo}: {r.texto.trim() || "sem resposta"} {certo ? "✓" : "✗"}
            </p>
          )}
        </div>
      );
    }
    case "conversa": {
      const { personagem, turnos } = conteudo.conteudo;
      const r = resposta?.tipo === "conversa" && permutacao ? resposta : null;
      // Por turno: índice original escolhido (0 = a certa), ou null se o aluno não chegou nele.
      const escolhidas = turnos.map((_, k) => {
        const e = r?.escolhas[k];
        return e === null || e === undefined || !permutacao ? null : (ordemDoTurno(permutacao, k)[e] ?? null);
      });
      const certos = escolhidas.filter((e) => e === 0).length;
      return (
        <div className="space-y-2 text-sm">
          {r && (
            <p className="font-semibold text-marca-800">
              {certos} de {turnos.length} respostas certas
            </p>
          )}
          <ol className="space-y-1.5">
            {turnos.map((t, k) => {
              const e = escolhidas[k];
              const certo = e === 0;
              return (
                <li
                  key={k}
                  className={`rounded-lg px-3 py-1.5 ${!r ? "bg-slate-50" : certo ? "bg-emerald-50" : "bg-red-50"}`}
                >
                  <span className="block text-xs font-bold text-marca-700">{personagem}:</span>
                  <span className="block italic">{t.mensagem}</span>
                  <span className="mt-1 block font-medium text-emerald-900">
                    ➜ {t.certa} {r && (certo ? "✓" : "✗")}
                  </span>
                  {r && !certo && (
                    <span className="block text-xs text-red-700">
                      {rotulo}: {e === null ? "sem resposta" : t.erradas[e - 1]}
                    </span>
                  )}
                  {t.reacao && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {personagem}: “{t.reacao}”
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      );
    }
    case "conceito_secreto": {
      const c = conteudo.conteudo;
      const r = resposta?.tipo === "conceito_secreto" ? resposta : null;
      const p = r ? progressoConceito(c, r.letras) : null;
      const nota = r ? notaConceito(c, r.letras) : null;
      const naPalavra = new Set([...c.palavra].map(letraBase).filter(Boolean));
      return (
        <div className="space-y-1 text-sm">
          <p className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium tracking-widest text-emerald-900 uppercase">
            {c.palavra} ✓
          </p>
          <p className="px-3 text-slate-600">{c.definicao}</p>
          {r && p && (
            <>
              <p className="px-3 text-xs text-slate-500">
                Letras tentadas:{" "}
                {r.letras.length
                  ? r.letras.map((l, i) => (
                      <span
                        key={i}
                        className={naPalavra.has(l) ? "font-bold text-emerald-700" : "text-red-700 line-through"}
                      >
                        {l}{" "}
                      </span>
                    ))
                  : "nenhuma"}
              </p>
              <p
                className={`rounded-lg px-3 py-1.5 ${nota === 1 ? "bg-emerald-50 text-emerald-900" : nota ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}`}
              >
                {p.descoberta
                  ? `${doProfessor ? "Descobriu" : "Você descobriu"} com ${p.erros} ${p.erros === 1 ? "letra errada" : "letras erradas"} (${Math.round((nota ?? 0) * 100)}% da nota)`
                  : `${rotulo}: palavra não descoberta (${p.erros} ${p.erros === 1 ? "letra errada" : "letras erradas"})`}
              </p>
            </>
          )}
        </div>
      );
    }
    case "detalhe_imagem": {
      const c = conteudo.conteudo;
      const ponto = resposta?.tipo === "detalhe_imagem" ? resposta.ponto : undefined;
      const certo = ponto ? dentroDaArea(c, ponto) : false;
      const ry = raioNaAltura(c);
      return (
        <div className="space-y-2 text-sm">
          <div className="relative mx-auto w-fit overflow-hidden rounded-xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlImagem(c.imagem) ?? ""} alt="" className="block max-h-80 w-auto" />
            <span
              style={{ left: `${c.x - c.raio}%`, top: `${c.y - ry}%`, width: `${2 * c.raio}%`, height: `${2 * ry}%` }}
              className="absolute rounded-[50%] border-4 border-emerald-400 bg-emerald-400/20"
            />
            {ponto && (
              <span
                style={{ left: `${ponto.x}%`, top: `${ponto.y}%` }}
                className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${certo ? "bg-emerald-600" : "bg-red-600"}`}
              />
            )}
          </div>
          <p className="px-3 text-slate-600">O círculo verde mostra a área certa.</p>
          {ponto !== undefined && (
            <p
              className={`rounded-lg px-3 py-1.5 ${certo ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}
            >
              {ponto === null
                ? `${rotulo}: sem resposta`
                : certo
                  ? `${rotulo}: dentro da área ✓`
                  : `${rotulo}: fora da área (ponto vermelho) ✗`}
            </p>
          )}
        </div>
      );
    }
    case "enquanto_isso": {
      const c = conteudo.conteudo;
      const r = resposta?.tipo === "enquanto_isso" && permutacao ? resposta : null;
      const p = c.periodos.length;
      // Célula que o aluno escolheu para cada evento original.
      const escolhida = c.eventos.map((_, orig) => {
        if (!r || !permutacao) return undefined;
        const tela = permutacao.indexOf(orig);
        return tela < 0 ? null : (r.celulas[tela] ?? null);
      });
      const onde = (cel: number) => `${c.linhas[Math.floor(cel / p)]}, ${c.periodos[cel % p]}`;
      return (
        <div className="space-y-2 text-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th />
                  {c.periodos.map((per, k) => (
                    <th key={k} className="rounded bg-marca-800 px-1 py-1 text-white">
                      {per}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.linhas.map((linha, l) => (
                  <tr key={l}>
                    <th className="rounded bg-slate-100 px-1">{linha}</th>
                    {c.periodos.map((_, k) => (
                      <td key={k} className="rounded bg-white p-1 align-top ring-1 ring-slate-200">
                        {c.eventos.map((e, i) => {
                          if (celulaDoEvento(c, e) !== l * p + k) return null;
                          const nota = escolhida[i] === undefined ? null : notaEvento(c, e, escolhida[i] ?? null);
                          return (
                            <span
                              key={i}
                              className={`mb-1 block rounded px-1.5 py-0.5 ${nota === null ? "bg-emerald-50 text-emerald-900" : nota === 1 ? "bg-emerald-100 text-emerald-900" : nota ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800"}`}
                            >
                              {e.texto} {nota === 1 ? "✓" : nota === 0.5 ? "½" : nota === 0 ? "✗" : ""}
                            </span>
                          );
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r && (
            <ul className="space-y-0.5 px-3 text-xs text-red-700">
              {c.eventos.map((e, i) =>
                escolhida[i] !== celulaDoEvento(c, e) ? (
                  <li key={i}>
                    {e.texto} ({rotulo}: {escolhida[i] == null ? "sem resposta" : onde(escolhida[i]!)})
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <p className="px-3 text-xs text-slate-500">
            Por evento: linha certa vale meio ponto; período certo, a outra metade.
          </p>
        </div>
      );
    }
  }
}
