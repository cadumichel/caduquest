import type { Metadata } from "next";
import { Abas } from "@/components/Abas";
import { Aviso, BotaoLink, Botao, Cartao, Entrada, Selecao, Titulo, Vazio } from "@/components/ui";
import { HABILIDADES } from "@/lib/habilidades";
import { exigirProfessor } from "@/lib/professor";
import { ehEra, ERAS } from "@/lib/publico/regras";
import { NOME_DIFICULDADE, NOME_TIPO, TIPOS, type TipoQuestao } from "@/lib/questoes/tipos";
import { ListaQuestoes, type ItemLista } from "./ListaQuestoes";

export const metadata: Metadata = { title: "Banco de questões" };

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

const ABAS = ["revisar", "publicadas", "publicos", "todas"] as const;
type AbaBanco = (typeof ABAS)[number];
const STATUS_DA_ABA: Record<AbaBanco, string> = {
  revisar: "rascunho",
  publicadas: "publicada",
  publicos: "",
  todas: "",
};

export default async function BancoQuestoes({ searchParams }: PageProps<"/professor/questoes">) {
  const sp = await searchParams;
  const { supabase } = await exigirProfessor();
  const { count: rascunhos } = await supabase
    .from("questoes")
    .select("*", { count: "exact", head: true })
    .eq("status", "rascunho");
  // Sem aba na URL: abre nos rascunhos quando há algo para revisar (o status antigo na URL ainda vale).
  const pedida = param(sp.aba);
  const aba: AbaBanco = (ABAS as readonly string[]).includes(pedida)
    ? (pedida as AbaBanco)
    : param(sp.status) === "publicada"
      ? "publicadas"
      : param(sp.status) === "rascunho" || rascunhos
        ? "revisar"
        : "publicadas";
  const filtros = {
    capitulo: param(sp.capitulo),
    habilidade: param(sp.habilidade),
    tipo: param(sp.tipo),
    dificuldade: param(sp.dificuldade),
    status: STATUS_DA_ABA[aba],
    uso: param(sp.uso),
    publico: aba === "publicos" ? param(sp.publico) || "todas" : param(sp.publico),
  };
  const gerado = Number(param(sp.gerado)) || 0;

  let consulta = supabase
    .from("questoes")
    // "*" traz também era_publica, quando o SQL dos desafios públicos já rodou.
    .select("*, desafio_questoes(count)")
    .order("criado_em", { ascending: false })
    .limit(500);
  if (filtros.capitulo) consulta = consulta.ilike("capitulo", `%${filtros.capitulo}%`);
  if (filtros.habilidade) consulta = consulta.contains("habilidades", [filtros.habilidade]);
  if ((TIPOS as readonly string[]).includes(filtros.tipo)) consulta = consulta.eq("tipo", filtros.tipo);
  if (filtros.tipo === "relampago") consulta = consulta.eq("relampago", true);
  if (["1", "2", "3"].includes(filtros.dificuldade)) consulta = consulta.eq("dificuldade", Number(filtros.dificuldade));
  if (filtros.publico === "todas") consulta = consulta.not("era_publica", "is", null);
  else if (ehEra(filtros.publico)) consulta = consulta.eq("era_publica", filtros.publico);
  if (filtros.status === "rascunho" || filtros.status === "publicada") consulta = consulta.eq("status", filtros.status);

  const [{ data }, { data: capitulosBrutos }, { data: erasBrutas }] = await Promise.all([
    consulta,
    supabase.from("questoes").select("capitulo").not("capitulo", "is", null),
    aba === "publicos"
      ? supabase.from("questoes").select("era_publica, status").not("era_publica", "is", null)
      : Promise.resolve({ data: [] as { era_publica: string; status: string }[] }),
  ]);
  const porEra = new Map<string, { publicadas: number; rascunhos: number }>();
  for (const q of (erasBrutas ?? []) as { era_publica: string; status: string }[]) {
    const atual = porEra.get(q.era_publica) ?? { publicadas: 0, rascunhos: 0 };
    if (q.status === "publicada") atual.publicadas += 1;
    else atual.rascunhos += 1;
    porEra.set(q.era_publica, atual);
  }
  const href = (a: AbaBanco) => `/professor/questoes?aba=${a}`;
  const capitulos = [...new Set((capitulosBrutos ?? []).map((c) => c.capitulo as string))].sort();

  let itens: ItemLista[] = (data ?? []).map((q) => ({
    id: q.id,
    tipo: q.tipo as TipoQuestao,
    enunciado: q.enunciado,
    capitulo: q.capitulo,
    habilidades: q.habilidades,
    dificuldade: q.dificuldade,
    status: q.status,
    origem: q.origem,
    temImagem: Boolean(q.imagem_path),
    relampago: Boolean(q.relampago),
    era: (q.era_publica as string | null | undefined) ?? null,
    usos: (q.desafio_questoes as { count: number }[])[0]?.count ?? 0,
  }));
  if (filtros.uso === "nova") itens = itens.filter((i) => i.usos === 0);
  if (filtros.uso === "usada") itens = itens.filter((i) => i.usos > 0);

  return (
    <div className="space-y-5">
      <Titulo
        acao={
          <BotaoLink href="/professor/questoes/nova" variante="secundario">
            + Nova questão
          </BotaoLink>
        }
      >
        Questões
      </Titulo>

      <Abas
        atual={aba}
        abas={[
          { id: "revisar", rotulo: "Para revisar", href: href("revisar"), contagem: rascunhos ?? 0 },
          { id: "publicadas", rotulo: "Publicadas", href: href("publicadas") },
          { id: "publicos", rotulo: "Desafios públicos", href: href("publicos") },
          { id: "todas", rotulo: "Todas", href: href("todas") },
        ]}
      />

      {aba === "publicos" && (
        <Cartao>
          <p className="mb-3 text-sm text-slate-600">Questões publicadas por era (rascunhos entre parênteses).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {ERAS.map((e) => {
              const n = porEra.get(e.id) ?? { publicadas: 0, rascunhos: 0 };
              return (
                <a
                  key={e.id}
                  href={`/professor/questoes?aba=publicos&publico=${e.id}`}
                  className={`rounded-xl border p-3 text-sm hover:border-marca-300 ${filtros.publico === e.id ? "border-marca-500 bg-marca-50" : "border-slate-200"}`}
                >
                  <span className="block font-semibold">
                    {e.emoji} {e.nome}
                  </span>
                  <span className="text-slate-500">
                    {n.publicadas} {n.rascunhos > 0 && `(${n.rascunhos})`}
                  </span>
                </a>
              );
            })}
          </div>
        </Cartao>
      )}

      {gerado > 0 && (
        <Aviso tipo="ok">
          O Claude gerou {gerado} questões em rascunho. Revise cada uma (abra para editar e ver a prévia) e publique as
          aprovadas.
        </Aviso>
      )}

      <form className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        <input type="hidden" name="aba" value={aba} />
        <div className="grid gap-2 sm:grid-cols-[2fr_2fr_auto]">
          <Entrada name="capitulo" placeholder="Capítulo" defaultValue={filtros.capitulo} list="capitulos" />
          <datalist id="capitulos">
            {capitulos.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Selecao name="tipo" defaultValue={filtros.tipo}>
            <option value="">Formato</option>
            <option value="relampago">⚡ Só relâmpago</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOME_TIPO[t]}
              </option>
            ))}
          </Selecao>
          <Botao variante="secundario">Filtrar</Botao>
        </div>
        <details
          open={Boolean(
            filtros.habilidade || filtros.dificuldade || filtros.uso || (aba !== "publicos" && filtros.publico),
          )}
        >
          <summary className="cursor-pointer text-sm text-marca-700">Mais filtros</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Selecao name="habilidade" defaultValue={filtros.habilidade}>
              <option value="">Habilidade</option>
              {HABILIDADES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </Selecao>
            <Selecao name="dificuldade" defaultValue={filtros.dificuldade}>
              <option value="">Dificuldade</option>
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {NOME_DIFICULDADE[d]}
                </option>
              ))}
            </Selecao>
            <Selecao name="uso" defaultValue={filtros.uso}>
              <option value="">Uso anterior</option>
              <option value="nova">Nunca usada</option>
              <option value="usada">Já usada</option>
            </Selecao>
            <Selecao name="publico" defaultValue={filtros.publico}>
              <option value="">Desafio público</option>
              <option value="todas">Todas as eras</option>
              {ERAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emoji} {e.nome}
                </option>
              ))}
            </Selecao>
          </div>
        </details>
      </form>

      {itens.length ? <ListaQuestoes itens={itens} /> : <Vazio>Nenhuma questão com esses filtros.</Vazio>}
    </div>
  );
}
