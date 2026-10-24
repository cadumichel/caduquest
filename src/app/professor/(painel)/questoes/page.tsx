import type { Metadata } from "next";
import { Aviso, BotaoLink, Botao, Entrada, Selecao, Titulo, Vazio } from "@/components/ui";
import { HABILIDADES } from "@/lib/habilidades";
import { exigirProfessor } from "@/lib/professor";
import { NOME_DIFICULDADE, NOME_TIPO, TIPOS, type TipoQuestao } from "@/lib/questoes/tipos";
import { ListaQuestoes, type ItemLista } from "./ListaQuestoes";

export const metadata: Metadata = { title: "Banco de questões" };

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function BancoQuestoes({ searchParams }: PageProps<"/professor/questoes">) {
  const sp = await searchParams;
  const filtros = {
    capitulo: param(sp.capitulo),
    habilidade: param(sp.habilidade),
    tipo: param(sp.tipo),
    dificuldade: param(sp.dificuldade),
    status: param(sp.status),
    uso: param(sp.uso),
  };
  const gerado = Number(param(sp.gerado)) || 0;
  const { supabase } = await exigirProfessor();

  let consulta = supabase
    .from("questoes")
    .select(
      "id, tipo, enunciado, capitulo, habilidades, dificuldade, status, origem, imagem_path, desafio_questoes(count)",
    )
    .order("criado_em", { ascending: false })
    .limit(500);
  if (filtros.capitulo) consulta = consulta.ilike("capitulo", `%${filtros.capitulo}%`);
  if (filtros.habilidade) consulta = consulta.contains("habilidades", [filtros.habilidade]);
  if ((TIPOS as readonly string[]).includes(filtros.tipo)) consulta = consulta.eq("tipo", filtros.tipo);
  if (["1", "2", "3"].includes(filtros.dificuldade)) consulta = consulta.eq("dificuldade", Number(filtros.dificuldade));
  if (filtros.status === "rascunho" || filtros.status === "publicada") consulta = consulta.eq("status", filtros.status);

  const [{ data }, { data: capitulosBrutos }] = await Promise.all([
    consulta,
    supabase.from("questoes").select("capitulo").not("capitulo", "is", null),
  ]);
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
    usos: (q.desafio_questoes as { count: number }[])[0]?.count ?? 0,
  }));
  if (filtros.uso === "nova") itens = itens.filter((i) => i.usos === 0);
  if (filtros.uso === "usada") itens = itens.filter((i) => i.usos > 0);

  return (
    <div className="space-y-5">
      <Titulo
        acao={
          <div className="flex gap-2">
            <BotaoLink href="/professor/gerar" variante="secundario">
              ✨ Gerar com o Claude
            </BotaoLink>
            <BotaoLink href="/professor/questoes/nova">+ Nova questão</BotaoLink>
          </div>
        }
      >
        Banco de questões
      </Titulo>

      {gerado > 0 && (
        <Aviso tipo="ok">
          O Claude gerou {gerado} questões em rascunho. Revise cada uma (abra para editar e ver a prévia) e publique as
          aprovadas.
        </Aviso>
      )}

      <form className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-7">
        <Entrada name="capitulo" placeholder="Capítulo" defaultValue={filtros.capitulo} list="capitulos" />
        <datalist id="capitulos">
          {capitulos.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Selecao name="habilidade" defaultValue={filtros.habilidade}>
          <option value="">Habilidade</option>
          {HABILIDADES.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </Selecao>
        <Selecao name="tipo" defaultValue={filtros.tipo}>
          <option value="">Tipo</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOME_TIPO[t]}
            </option>
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
        <Selecao name="status" defaultValue={filtros.status}>
          <option value="">Status</option>
          <option value="rascunho">Rascunho</option>
          <option value="publicada">Publicada</option>
        </Selecao>
        <Selecao name="uso" defaultValue={filtros.uso}>
          <option value="">Uso anterior</option>
          <option value="nova">Nunca usada</option>
          <option value="usada">Já usada</option>
        </Selecao>
        <Botao variante="secundario">Filtrar</Botao>
      </form>

      {itens.length ? <ListaQuestoes itens={itens} /> : <Vazio>Nenhuma questão com esses filtros.</Vazio>}
    </div>
  );
}
