"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { AreaTexto, Aviso, Botao, Campo, Cartao, Entrada, Selecao, classeInput } from "@/components/ui";
import { HABILIDADES } from "@/lib/habilidades";
import { montarVista, respostaInicial } from "@/lib/questoes/apresentacao";
import { permutacaoAleatoria } from "@/lib/questoes/embaralhar";
import {
  conteudoVazio,
  MARCA_LACUNA,
  NOME_DIFICULDADE,
  NOME_TIPO,
  tamanhoPermutacao,
  TEMPO_MAX_S,
  TEMPO_MIN_S,
  TEMPO_PADRAO,
  TIPOS,
  validarConteudo,
  type Conteudo,
  type Resposta,
  type TipoQuestao,
} from "@/lib/questoes/tipos";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { Questao } from "@/lib/tipos-banco";
import { urlImagem } from "@/lib/tipos-banco";
import { salvarQuestao } from "../actions";

const LETRAS = "ABCDE";

export function EditorQuestao({
  inicial,
  professorId,
  capitulos,
  usada,
}: {
  inicial: Questao | null;
  professorId: string;
  capitulos: string[];
  usada: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ erro?: string; ok?: string }>({});
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  const [conteudo, setConteudo] = useState<Conteudo>(() =>
    inicial ? ({ tipo: inicial.tipo, conteudo: inicial.conteudo } as Conteudo) : conteudoVazio("multipla_escolha"),
  );
  const [campos, setCampos] = useState({
    enunciado: inicial?.enunciado ?? "",
    capitulo: inicial?.capitulo ?? "",
    habilidades: inicial?.habilidades ?? [],
    dificuldade: inicial?.dificuldade ?? 2,
    fonte: inicial?.fonte ?? "",
    imagem_path: inicial?.imagem_path ?? null,
    tempo_limite_s: inicial?.tempo_limite_s ?? TEMPO_PADRAO.multipla_escolha,
    explicacao: inicial?.explicacao ?? "",
    dica: inicial?.dica ?? "",
  });
  const set = <K extends keyof typeof campos>(k: K, v: (typeof campos)[K]) => setCampos((c) => ({ ...c, [k]: v }));

  const trocarTipo = (tipo: TipoQuestao) => {
    setConteudo(conteudoVazio(tipo));
    set("tempo_limite_s", TEMPO_PADRAO[tipo]);
  };

  const enviarImagem = async (arquivo: File) => {
    if (arquivo.size > 2 * 1024 * 1024) return setMensagem({ erro: "Imagem acima de 2 MB." });
    setEnviandoImagem(true);
    const ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "png";
    const caminho = `${professorId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await criarClienteNavegador().storage.from("questoes").upload(caminho, arquivo, {
      contentType: arquivo.type,
    });
    setEnviandoImagem(false);
    if (error) return setMensagem({ erro: "Não foi possível enviar a imagem." });
    // No mapa, a imagem fica dentro do conteúdo, embaixo dos pinos.
    if (conteudo.tipo === "mapa") setConteudo({ tipo: "mapa", conteudo: { ...conteudo.conteudo, imagem: caminho } });
    else set("imagem_path", caminho);
  };

  const salvar = (status: "rascunho" | "publicada") =>
    iniciar(async () => {
      const r = await salvarQuestao({
        id: inicial?.id,
        tipo: conteudo.tipo,
        conteudo: conteudo.conteudo,
        status,
        ...campos,
        imagem_path: conteudo.tipo === "mapa" ? null : campos.imagem_path,
      });
      setMensagem(r);
      if (r.id && !inicial) router.replace(`/professor/questoes/${r.id}`);
      else router.refresh();
    });

  const validacao = validarConteudo(conteudo.tipo, conteudo.conteudo);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {usada && (
          <Aviso tipo="info">
            Alunos já responderam esta questão. Você pode ajustar enunciado, explicação e etiquetas, mas não o tipo nem
            os itens.
          </Aviso>
        )}
        <Cartao className="space-y-4">
          <Campo rotulo="Tipo">
            <Selecao value={conteudo.tipo} disabled={usada} onChange={(e) => trocarTipo(e.target.value as TipoQuestao)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {NOME_TIPO[t]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Enunciado">
            <AreaTexto rows={4} value={campos.enunciado} onChange={(e) => set("enunciado", e.target.value)} />
          </Campo>
          <Campo
            rotulo={conteudo.tipo === "mapa" ? "Imagem do mapa" : "Imagem (fonte, charge, mapa)"}
            dica={
              conteudo.tipo === "mapa"
                ? "PNG, JPG ou WEBP até 2 MB, sem os nomes escritos nos lugares cobrados."
                : "PNG, JPG ou WEBP até 2 MB. Meta: 40% das questões de cada desafio com imagem."
            }
          >
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={enviandoImagem}
                onChange={(e) => e.target.files?.[0] && enviarImagem(e.target.files[0])}
                className="text-sm"
              />
              {enviandoImagem && <span className="text-sm text-slate-500">Enviando…</span>}
              {campos.imagem_path && conteudo.tipo !== "mapa" && (
                <button type="button" className="text-sm text-red-700" onClick={() => set("imagem_path", null)}>
                  Remover
                </button>
              )}
            </div>
          </Campo>
          <EditorConteudo conteudo={conteudo} onChange={setConteudo} bloqueado={usada} />
          <Campo rotulo="Explicação curta" dica="Aparece para quem errou, depois que o desafio fecha.">
            <AreaTexto rows={2} value={campos.explicacao} onChange={(e) => set("explicacao", e.target.value)} />
          </Campo>
          <Campo
            rotulo="Dica"
            dica="O aluno pode abrir durante o desafio (3 dicas por temporada). Ajuda a pensar, sem entregar a resposta."
          >
            <AreaTexto rows={2} maxLength={300} value={campos.dica} onChange={(e) => set("dica", e.target.value)} />
          </Campo>
        </Cartao>

        <Cartao className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Capítulo">
            <Entrada
              list="capitulos-editor"
              value={campos.capitulo}
              onChange={(e) => set("capitulo", e.target.value)}
            />
            <datalist id="capitulos-editor">
              {capitulos.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Fonte (opcional)">
            <Entrada
              value={campos.fonte}
              onChange={(e) => set("fonte", e.target.value)}
              placeholder="Apostila cap. 4, p. 52"
            />
          </Campo>
          <Campo rotulo="Dificuldade">
            <Selecao value={campos.dificuldade} onChange={(e) => set("dificuldade", Number(e.target.value))}>
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {NOME_DIFICULDADE[d]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Tempo limite (segundos)">
            <Entrada
              type="number"
              min={TEMPO_MIN_S}
              max={TEMPO_MAX_S}
              value={campos.tempo_limite_s}
              onChange={(e) => set("tempo_limite_s", Number(e.target.value))}
            />
          </Campo>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Habilidades</legend>
            <div className="flex flex-wrap gap-2">
              {HABILIDADES.map((h) => {
                const ativa = campos.habilidades.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() =>
                      set("habilidades", ativa ? campos.habilidades.filter((x) => x !== h) : [...campos.habilidades, h])
                    }
                    className={`rounded-full border px-3 py-1 text-sm ${ativa ? "border-marca-600 bg-marca-600 text-white" : "border-slate-300"}`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </Cartao>

        {mensagem.erro && <Aviso>{mensagem.erro}</Aviso>}
        {mensagem.ok && <Aviso tipo="ok">{mensagem.ok}</Aviso>}
        <div className="flex flex-wrap gap-2">
          <Botao disabled={pendente} onClick={() => salvar("publicada")}>
            {pendente ? "Salvando…" : "Salvar e publicar"}
          </Botao>
          <Botao variante="secundario" disabled={pendente} onClick={() => salvar("rascunho")}>
            Salvar como rascunho
          </Botao>
          {inicial && (
            <span className="self-center text-sm text-slate-500">
              Status atual: <strong>{inicial.status}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-sm font-medium text-slate-500">Prévia: como o aluno vê (com embaralhamento)</p>
        <div className="rounded-3xl border-8 border-slate-800 bg-slate-50 p-4">
          {validacao.success ? (
            <Previa
              conteudo={{ tipo: conteudo.tipo, conteudo: validacao.data } as Conteudo}
              enunciado={campos.enunciado}
              imagemUrl={conteudo.tipo === "mapa" ? null : urlImagem(campos.imagem_path)}
              tempo={campos.tempo_limite_s}
            />
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">{validacao.error.issues[0].message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Previa({
  conteudo,
  enunciado,
  imagemUrl,
  tempo,
}: {
  conteudo: Conteudo;
  enunciado: string;
  imagemUrl: string | null;
  tempo: number;
}) {
  const chave = JSON.stringify(conteudo);
  const [semente, setSemente] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const permutacao = useMemo(() => permutacaoAleatoria(tamanhoPermutacao(conteudo)), [chave, semente]);
  const vista = montarVista(conteudo, permutacao);
  return (
    <PreviaInterna
      key={`${chave}-${semente}`}
      vista={vista}
      enunciado={enunciado}
      imagemUrl={imagemUrl}
      tempo={tempo}
      reembaralhar={() => setSemente((s) => s + 1)}
    />
  );
}

function PreviaInterna({
  vista,
  enunciado,
  imagemUrl,
  tempo,
  reembaralhar,
}: {
  vista: ReturnType<typeof montarVista>;
  enunciado: string;
  imagemUrl: string | null;
  tempo: number;
  reembaralhar: () => void;
}) {
  const [resposta, setResposta] = useState<Resposta>(() => respostaInicial(vista));
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-slate-500">
        <span>Questão 1 de 10</span>
        <span>⏱️ {tempo}s</span>
      </div>
      {imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="mx-auto max-h-64 rounded-xl border border-slate-200" />
      )}
      <p className="whitespace-pre-line font-medium">{enunciado || "Enunciado…"}</p>
      <QuestaoInterativa vista={vista} resposta={resposta} onChange={setResposta} />
      <button type="button" onClick={reembaralhar} className="text-sm text-marca-700">
        ↻ Embaralhar de novo
      </button>
    </div>
  );
}

function Linhas<T>({
  itens,
  min,
  max,
  novo,
  onChange,
  bloqueado,
  render,
}: {
  itens: T[];
  min: number;
  max: number;
  novo: () => T;
  onChange: (itens: T[]) => void;
  bloqueado: boolean;
  render: (item: T, i: number, atualizar: (v: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {itens.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {render(item, i, (v) => onChange(itens.map((x, j) => (j === i ? v : x))))}
          <button
            type="button"
            disabled={bloqueado || itens.length <= min}
            onClick={() => onChange(itens.filter((_, j) => j !== i))}
            className="px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
            aria-label="Remover item"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={bloqueado || itens.length >= max}
        onClick={() => onChange([...itens, novo()])}
        className="text-sm font-medium text-marca-700 disabled:opacity-40"
      >
        + Adicionar
      </button>
    </div>
  );
}

function EditorConteudo({
  conteudo,
  onChange,
  bloqueado,
}: {
  conteudo: Conteudo;
  onChange: (c: Conteudo) => void;
  bloqueado: boolean;
}) {
  switch (conteudo.tipo) {
    case "multipla_escolha": {
      const c = conteudo.conteudo;
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Alternativas (marque a correta)</legend>
          <Linhas
            itens={c.alternativas}
            min={4}
            max={5}
            novo={() => ""}
            bloqueado={bloqueado}
            onChange={(alternativas) =>
              onChange({
                tipo: "multipla_escolha",
                conteudo: { alternativas, correta: Math.min(c.correta, alternativas.length - 1) },
              })
            }
            render={(alt, i, atualizar) => (
              <>
                <input
                  type="radio"
                  name="correta"
                  checked={c.correta === i}
                  disabled={bloqueado}
                  onChange={() => onChange({ tipo: "multipla_escolha", conteudo: { ...c, correta: i } })}
                />
                <span className="w-5 text-sm font-bold text-slate-500">{LETRAS[i]}</span>
                <input
                  className={classeInput}
                  value={alt}
                  disabled={bloqueado}
                  onChange={(e) => atualizar(e.target.value)}
                />
              </>
            )}
          />
        </fieldset>
      );
    }
    case "vf_bloco":
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Afirmativas sobre a mesma fonte (3 a 6)</legend>
          <Linhas
            itens={conteudo.conteudo.afirmativas}
            min={3}
            max={6}
            novo={() => ({ texto: "", verdadeira: true })}
            bloqueado={bloqueado}
            onChange={(afirmativas) => onChange({ tipo: "vf_bloco", conteudo: { afirmativas } })}
            render={(a, _i, atualizar) => (
              <>
                <select
                  className="rounded-lg border border-slate-300 px-2 py-2 text-sm font-bold"
                  value={a.verdadeira ? "V" : "F"}
                  disabled={bloqueado}
                  onChange={(e) => atualizar({ ...a, verdadeira: e.target.value === "V" })}
                >
                  <option>V</option>
                  <option>F</option>
                </select>
                <input
                  className={classeInput}
                  value={a.texto}
                  disabled={bloqueado}
                  onChange={(e) => atualizar({ ...a, texto: e.target.value })}
                />
              </>
            )}
          />
        </fieldset>
      );
    case "linha_do_tempo":
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Eventos na ordem cronológica correta (4 a 6)</legend>
          <Linhas
            itens={conteudo.conteudo.eventos}
            min={4}
            max={6}
            novo={() => ({ texto: "", data: "" })}
            bloqueado={bloqueado}
            onChange={(eventos) => onChange({ tipo: "linha_do_tempo", conteudo: { eventos } })}
            render={(ev, i, atualizar) => (
              <>
                <span className="w-6 text-sm font-bold text-marca-700">{i + 1}º</span>
                <input
                  className={classeInput}
                  placeholder="Evento"
                  value={ev.texto}
                  disabled={bloqueado}
                  onChange={(e) => atualizar({ ...ev, texto: e.target.value })}
                />
                <input
                  className={`${classeInput} w-28`}
                  placeholder="Data (gabarito)"
                  value={ev.data ?? ""}
                  disabled={bloqueado}
                  onChange={(e) => atualizar({ ...ev, data: e.target.value })}
                />
              </>
            )}
          />
          <p className="text-xs text-slate-500">
            A data só aparece no gabarito. Não coloque a data no texto do evento.
          </p>
        </fieldset>
      );
    case "pares":
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            Pares (3 a 6). A coluna da direita é embaralhada para o aluno.
          </legend>
          <Linhas
            itens={conteudo.conteudo.pares}
            min={3}
            max={6}
            novo={() => ({ esquerda: "", direita: "" })}
            bloqueado={bloqueado}
            onChange={(pares) => onChange({ tipo: "pares", conteudo: { pares } })}
            render={(p, _i, atualizar) => (
              <>
                <input
                  className={classeInput}
                  placeholder="Esquerda"
                  value={p.esquerda}
                  disabled={bloqueado}
                  onChange={(e) => atualizar({ ...p, esquerda: e.target.value })}
                />
                <span className="text-slate-400">↔</span>
                <input
                  className={classeInput}
                  placeholder="Direita"
                  value={p.direita}
                  disabled={bloqueado}
                  onChange={(e) => atualizar({ ...p, direita: e.target.value })}
                />
              </>
            )}
          />
        </fieldset>
      );
    case "fonte_primaria": {
      const c = conteudo.conteudo;
      const mudar = (novo: Partial<typeof c>) => onChange({ tipo: "fonte_primaria", conteudo: { ...c, ...novo } });
      return (
        <div className="space-y-4">
          <Campo
            rotulo="Documento (trecho da fonte)"
            dica="Cole o trecho da carta, lei, jornal ou relato. Se a fonte for uma imagem, envie a imagem acima e deixe vazio."
          >
            <AreaTexto
              rows={5}
              value={c.documento}
              disabled={bloqueado}
              onChange={(e) => mudar({ documento: e.target.value })}
            />
          </Campo>
          {c.perguntas.map((p, j) => (
            <fieldset key={j} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-marca-700">{j + 1}.</span>
                <input
                  className={classeInput}
                  value={p.pergunta}
                  disabled={bloqueado}
                  placeholder="De quando é? Quem produziu? Qual a intenção?"
                  onChange={(e) =>
                    mudar({ perguntas: c.perguntas.map((x, k) => (k === j ? { ...x, pergunta: e.target.value } : x)) })
                  }
                />
                <button
                  type="button"
                  disabled={bloqueado || c.perguntas.length <= 2}
                  onClick={() => mudar({ perguntas: c.perguntas.filter((_, k) => k !== j) })}
                  className="px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remover pergunta"
                >
                  ✕
                </button>
              </div>
              <Linhas
                itens={p.alternativas}
                min={3}
                max={4}
                novo={() => ""}
                bloqueado={bloqueado}
                onChange={(alternativas) =>
                  mudar({
                    perguntas: c.perguntas.map((x, k) =>
                      k === j ? { ...x, alternativas, correta: Math.min(x.correta, alternativas.length - 1) } : x,
                    ),
                  })
                }
                render={(alt, i, atualizar) => (
                  <>
                    <input
                      type="radio"
                      name={`correta-${j}`}
                      checked={p.correta === i}
                      disabled={bloqueado}
                      onChange={() =>
                        mudar({ perguntas: c.perguntas.map((x, k) => (k === j ? { ...x, correta: i } : x)) })
                      }
                    />
                    <span className="w-5 text-sm font-bold text-slate-500">{LETRAS[i]}</span>
                    <input
                      className={classeInput}
                      value={alt}
                      disabled={bloqueado}
                      onChange={(e) => atualizar(e.target.value)}
                    />
                  </>
                )}
              />
            </fieldset>
          ))}
          <button
            type="button"
            disabled={bloqueado || c.perguntas.length >= 3}
            onClick={() =>
              mudar({ perguntas: [...c.perguntas, { pergunta: "", alternativas: ["", "", "", ""], correta: 0 }] })
            }
            className="text-sm font-medium text-marca-700 disabled:opacity-40"
          >
            + Adicionar pergunta
          </button>
        </div>
      );
    }
    case "causa_consequencia": {
      const c = conteudo.conteudo;
      return (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Causa e a consequência dela (3 a 5). As consequências são embaralhadas.
            </legend>
            <Linhas
              itens={c.relacoes}
              min={3}
              max={5}
              novo={() => ({ causa: "", consequencia: "" })}
              bloqueado={bloqueado}
              onChange={(relacoes) => onChange({ tipo: "causa_consequencia", conteudo: { ...c, relacoes } })}
              render={(r, _i, atualizar) => (
                <>
                  <input
                    className={classeInput}
                    placeholder="Causa"
                    value={r.causa}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...r, causa: e.target.value })}
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    className={classeInput}
                    placeholder="Consequência"
                    value={r.consequencia}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...r, consequencia: e.target.value })}
                  />
                </>
              )}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Consequências extras (até 2): plausíveis, do mesmo período, mas de nenhuma das causas
            </legend>
            <Linhas
              itens={c.extras}
              min={0}
              max={2}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(extras) => onChange({ tipo: "causa_consequencia", conteudo: { ...c, extras } })}
              render={(x, _i, atualizar) => (
                <input
                  className={classeInput}
                  value={x}
                  disabled={bloqueado}
                  onChange={(e) => atualizar(e.target.value)}
                />
              )}
            />
          </fieldset>
        </div>
      );
    }
    case "encontrar_erro":
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            Texto em trechos (4 a 10), na ordem. Marque de 1 a 3 trechos com erro e escreva a correção.
          </legend>
          <Linhas
            itens={conteudo.conteudo.trechos}
            min={4}
            max={10}
            novo={() => ({ texto: "", errado: false, correcao: "" })}
            bloqueado={bloqueado}
            onChange={(trechos) => onChange({ tipo: "encontrar_erro", conteudo: { trechos } })}
            render={(t, _i, atualizar) => (
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-700">
                    <input
                      type="checkbox"
                      checked={t.errado}
                      disabled={bloqueado}
                      onChange={(e) => atualizar({ ...t, errado: e.target.checked })}
                    />
                    erro
                  </label>
                  <input
                    className={classeInput}
                    value={t.texto}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...t, texto: e.target.value })}
                  />
                </div>
                {t.errado && (
                  <input
                    className={`${classeInput} text-sm`}
                    placeholder="Correção (aparece no gabarito)"
                    value={t.correcao ?? ""}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...t, correcao: e.target.value })}
                  />
                )}
              </div>
            )}
          />
          <p className="text-xs text-slate-500">
            O aluno vê o texto corrido e sabe quantos erros há. Prefira erros sutis: data, autor ou conceito de um
            período vizinho, anacronismo, causa trocada por consequência.
          </p>
        </fieldset>
      );
    case "completar_lacunas": {
      const c = conteudo.conteudo;
      const mudar = (novo: Partial<typeof c>) => onChange({ tipo: "completar_lacunas", conteudo: { ...c, ...novo } });
      const marcas = (c.texto.match(MARCA_LACUNA) ?? []).length;
      return (
        <div className="space-y-4">
          <Campo
            rotulo="Texto"
            dica="Escreva ___ (três sublinhados) no lugar de cada palavra que o aluno vai completar."
          >
            <AreaTexto
              rows={4}
              value={c.texto}
              disabled={bloqueado}
              onChange={(e) => mudar({ texto: e.target.value })}
            />
          </Campo>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Respostas, na ordem das lacunas ({marcas} lacuna{marcas === 1 ? "" : "s"} no texto)
            </legend>
            <Linhas
              itens={c.lacunas}
              min={1}
              max={5}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(lacunas) => mudar({ lacunas })}
              render={(x, i, atualizar) => (
                <>
                  <span className="w-6 text-sm font-bold text-marca-700">{i + 1}</span>
                  <input
                    className={classeInput}
                    value={x}
                    disabled={bloqueado}
                    onChange={(e) => atualizar(e.target.value)}
                  />
                </>
              )}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Palavras extras no banco (até 3): do mesmo campo, mas que não servem
            </legend>
            <Linhas
              itens={c.extras}
              min={0}
              max={3}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(extras) => mudar({ extras })}
              render={(x, _i, atualizar) => (
                <input
                  className={classeInput}
                  value={x}
                  disabled={bloqueado}
                  onChange={(e) => atualizar(e.target.value)}
                />
              )}
            />
          </fieldset>
        </div>
      );
    }
    case "ordenar_frases":
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            Frases na ordem correta (3 a 6): etapas de um processo, cadeia de causas ou argumento
          </legend>
          <Linhas
            itens={conteudo.conteudo.frases}
            min={3}
            max={6}
            novo={() => ""}
            bloqueado={bloqueado}
            onChange={(frases) => onChange({ tipo: "ordenar_frases", conteudo: { frases } })}
            render={(f, i, atualizar) => (
              <>
                <span className="w-6 text-sm font-bold text-marca-700">{i + 1}º</span>
                <input
                  className={classeInput}
                  value={f}
                  disabled={bloqueado}
                  onChange={(e) => atualizar(e.target.value)}
                />
              </>
            )}
          />
        </fieldset>
      );
    case "interpretacao":
    case "quem_disse": {
      const ehCitacao = conteudo.tipo === "quem_disse";
      const c = conteudo.conteudo;
      const base = conteudo.tipo === "quem_disse" ? conteudo.conteudo.citacao : conteudo.conteudo.texto;
      const opcoes = conteudo.tipo === "quem_disse" ? conteudo.conteudo.autores : conteudo.conteudo.alternativas;
      const mudar = (novo: { base?: string; opcoes?: string[]; correta?: number }) => {
        const b = novo.base ?? base;
        const o = novo.opcoes ?? opcoes;
        const correta = Math.min(novo.correta ?? c.correta, o.length - 1);
        onChange(
          conteudo.tipo === "quem_disse"
            ? { tipo: "quem_disse", conteudo: { citacao: b, autores: o, correta } }
            : { tipo: "interpretacao", conteudo: { texto: b, alternativas: o, correta } },
        );
      };
      return (
        <div className="space-y-4">
          <Campo
            rotulo={ehCitacao ? "Citação" : "Texto-base"}
            dica={
              ehCitacao
                ? "Frase real e curta, sem o nome de quem disse. Ponha a referência em Fonte."
                : "Trecho de fonte, de historiador ou descrição de uma charge (a imagem pode ir acima)."
            }
          >
            <AreaTexto
              rows={ehCitacao ? 3 : 5}
              value={base}
              disabled={bloqueado}
              onChange={(e) => mudar({ base: e.target.value })}
            />
          </Campo>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              {ehCitacao
                ? "Quem pode ter dito (marque o autor): personagens ou grupos do mesmo período"
                : "Interpretações (marque a única sustentada pelo texto)"}
            </legend>
            <Linhas
              itens={opcoes}
              min={4}
              max={5}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(o) => mudar({ opcoes: o })}
              render={(alt, i, atualizar) => (
                <>
                  <input
                    type="radio"
                    name="correta"
                    checked={c.correta === i}
                    disabled={bloqueado}
                    onChange={() => mudar({ correta: i })}
                  />
                  <span className="w-5 text-sm font-bold text-slate-500">{LETRAS[i]}</span>
                  <input
                    className={classeInput}
                    value={alt}
                    disabled={bloqueado}
                    onChange={(e) => atualizar(e.target.value)}
                  />
                </>
              )}
            />
          </fieldset>
        </div>
      );
    }
    case "classificar": {
      const c = conteudo.conteudo;
      const mudar = (novo: Partial<typeof c>) => onChange({ tipo: "classificar", conteudo: { ...c, ...novo } });
      return (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Grupos (2 ou 3)</legend>
            <Linhas
              itens={c.grupos}
              min={2}
              max={3}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(grupos) =>
                mudar({ grupos, itens: c.itens.map((i) => ({ ...i, grupo: Math.min(i.grupo, grupos.length - 1) })) })
              }
              render={(g, _i, atualizar) => (
                <input
                  className={classeInput}
                  value={g}
                  disabled={bloqueado}
                  onChange={(e) => atualizar(e.target.value)}
                />
              )}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Itens (4 a 8) e o grupo de cada um</legend>
            <Linhas
              itens={c.itens}
              min={4}
              max={8}
              novo={() => ({ texto: "", grupo: 0 })}
              bloqueado={bloqueado}
              onChange={(itens) => mudar({ itens })}
              render={(item, _i, atualizar) => (
                <>
                  <input
                    className={classeInput}
                    value={item.texto}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...item, texto: e.target.value })}
                  />
                  <select
                    className="max-w-36 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    value={item.grupo}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...item, grupo: Number(e.target.value) })}
                  >
                    {c.grupos.map((g, gi) => (
                      <option key={gi} value={gi}>
                        {g || `Grupo ${gi + 1}`}
                      </option>
                    ))}
                  </select>
                </>
              )}
            />
          </fieldset>
        </div>
      );
    }
    case "intruso": {
      const c = conteudo.conteudo;
      const mudar = (novo: Partial<typeof c>) => onChange({ tipo: "intruso", conteudo: { ...c, ...novo } });
      return (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Itens (marque o intruso)</legend>
            <Linhas
              itens={c.itens}
              min={4}
              max={5}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(itens) => mudar({ itens, intruso: Math.min(c.intruso, itens.length - 1) })}
              render={(item, i, atualizar) => (
                <>
                  <input
                    type="radio"
                    name="intruso"
                    checked={c.intruso === i}
                    disabled={bloqueado}
                    onChange={() => mudar({ intruso: i })}
                  />
                  <input
                    className={classeInput}
                    value={item}
                    disabled={bloqueado}
                    onChange={(e) => atualizar(e.target.value)}
                  />
                </>
              )}
            />
          </fieldset>
          <Campo rotulo="O que os outros têm em comum" dica="Aparece no gabarito.">
            <Entrada value={c.criterio} disabled={bloqueado} onChange={(e) => mudar({ criterio: e.target.value })} />
          </Campo>
        </div>
      );
    }
    case "ponto_de_vista": {
      const c = conteudo.conteudo;
      const mudar = (novo: Partial<typeof c>) => onChange({ tipo: "ponto_de_vista", conteudo: { ...c, ...novo } });
      return (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Relatos do mesmo fato (2 ou 3) e a perspectiva de cada um
            </legend>
            <Linhas
              itens={c.relatos}
              min={2}
              max={3}
              novo={() => ({ texto: "", perspectiva: "" })}
              bloqueado={bloqueado}
              onChange={(relatos) => mudar({ relatos })}
              render={(r, _i, atualizar) => (
                <div className="flex flex-1 flex-col gap-1">
                  <textarea
                    className={classeInput}
                    rows={3}
                    placeholder="Relato, sem dizer quem fala"
                    value={r.texto}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...r, texto: e.target.value })}
                  />
                  <input
                    className={classeInput}
                    placeholder="Perspectiva (ex.: jesuíta, colono, indígena)"
                    value={r.perspectiva}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...r, perspectiva: e.target.value })}
                  />
                </div>
              )}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">
              Perspectivas extras (até 2) que não são de nenhum relato
            </legend>
            <Linhas
              itens={c.extras}
              min={0}
              max={2}
              novo={() => ""}
              bloqueado={bloqueado}
              onChange={(extras) => mudar({ extras })}
              render={(x, _i, atualizar) => (
                <input
                  className={classeInput}
                  value={x}
                  disabled={bloqueado}
                  onChange={(e) => atualizar(e.target.value)}
                />
              )}
            />
          </fieldset>
        </div>
      );
    }
    case "linha_do_tempo_datas": {
      const c = conteudo.conteudo;
      const mudar = (novo: Partial<typeof c>) =>
        onChange({ tipo: "linha_do_tempo_datas", conteudo: { ...c, ...novo } });
      const numero = (v: string) => (v === "" || v === "-" ? 0 : Number(v));
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Campo rotulo="Régua começa em">
              <Entrada
                type="number"
                value={c.inicio}
                disabled={bloqueado}
                onChange={(e) => mudar({ inicio: numero(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Termina em">
              <Entrada
                type="number"
                value={c.fim}
                disabled={bloqueado}
                onChange={(e) => mudar({ fim: numero(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Faixas de (anos)">
              <Entrada
                type="number"
                min={1}
                value={c.passo}
                disabled={bloqueado}
                onChange={(e) => mudar({ passo: numero(e.target.value) })}
              />
            </Campo>
          </div>
          <p className="text-xs text-slate-500">Use número negativo para a.C. A régua precisa ter de 3 a 8 faixas.</p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Eventos (3 a 6) e o ano de cada um</legend>
            <Linhas
              itens={c.eventos}
              min={3}
              max={6}
              novo={() => ({ texto: "", ano: c.inicio })}
              bloqueado={bloqueado}
              onChange={(eventos) => mudar({ eventos })}
              render={(ev, _i, atualizar) => (
                <>
                  <input
                    className={classeInput}
                    placeholder="Evento, sem a data"
                    value={ev.texto}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...ev, texto: e.target.value })}
                  />
                  <input
                    type="number"
                    className={`${classeInput} w-24`}
                    value={ev.ano}
                    disabled={bloqueado}
                    onChange={(e) => atualizar({ ...ev, ano: numero(e.target.value) })}
                  />
                </>
              )}
            />
          </fieldset>
        </div>
      );
    }
    case "mapa":
      return <EditorMapa conteudo={conteudo.conteudo} onChange={onChange} bloqueado={bloqueado} />;
  }
}

function EditorMapa({
  conteudo: c,
  onChange,
  bloqueado,
}: {
  conteudo: Extract<Conteudo, { tipo: "mapa" }>["conteudo"];
  onChange: (c: Conteudo) => void;
  bloqueado: boolean;
}) {
  const [ativo, setAtivo] = useState(0);
  const mudar = (marcadores: typeof c.marcadores, posicionado = false) =>
    onChange({
      tipo: "mapa",
      conteudo: { imagem: c.imagem, marcadores, ...(c.posicionar && !posicionado && { posicionar: true }) },
    });
  const tocar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (bloqueado) return;
    const caixa = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - caixa.left) / caixa.width) * 1000) / 10;
    const y = Math.round(((e.clientY - caixa.top) / caixa.height) * 1000) / 10;
    if (ativo >= c.marcadores.length) {
      if (c.marcadores.length >= 6) return;
      mudar([...c.marcadores, { nome: "", x, y }], true);
    } else {
      mudar(
        c.marcadores.map((m, i) => (i === ativo ? { ...m, x, y } : m)),
        true,
      );
    }
    setAtivo((a) => Math.min(a + 1, 6));
  };
  if (!c.imagem) return <Aviso tipo="info">Envie a imagem do mapa no campo acima para pôr os pinos.</Aviso>;
  return (
    <div className="space-y-3">
      {c.posicionar && (
        <Aviso tipo="info">
          Os pinos vieram do Claude sem posição. Toque em cada nome e depois no lugar dele no mapa.
        </Aviso>
      )}
      <p className="text-sm text-slate-600">
        Toque num nome da lista e depois no mapa para pôr o pino. Com &quot;+ Novo pino&quot; selecionado, cada toque
        cria um pino.
      </p>
      <div className="relative mx-auto w-fit cursor-crosshair" onClick={tocar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlImagem(c.imagem) ?? ""}
          alt=""
          className="block max-h-96 w-auto rounded-xl border border-slate-200"
        />
        {c.marcadores.map((m, i) => (
          <span
            key={i}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            className={`pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow ${
              i === ativo ? "bg-amber-500" : "bg-marca-700"
            }`}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <ul className="space-y-1.5">
        {c.marcadores.map((m, i) => (
          <li key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAtivo(i)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${i === ativo ? "bg-amber-500" : "bg-marca-700"}`}
            >
              {i + 1}
            </button>
            <input
              className={classeInput}
              placeholder="Nome do lugar"
              value={m.nome}
              disabled={bloqueado}
              onFocus={() => setAtivo(i)}
              onChange={(e) => mudar(c.marcadores.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
            />
            <button
              type="button"
              disabled={bloqueado || c.marcadores.length <= 2}
              onClick={() => {
                mudar(c.marcadores.filter((_, j) => j !== i));
                setAtivo(0);
              }}
              className="px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
              aria-label="Remover pino"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={bloqueado || c.marcadores.length >= 6}
        onClick={() => setAtivo(c.marcadores.length)}
        className={`text-sm font-medium disabled:opacity-40 ${ativo >= c.marcadores.length ? "text-amber-600" : "text-marca-700"}`}
      >
        + Novo pino {ativo >= c.marcadores.length && "(toque no mapa)"}
      </button>
    </div>
  );
}
