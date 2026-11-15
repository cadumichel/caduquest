/** O Supabase devolve no máximo 1000 linhas por consulta; isto busca todas, página a página. */
const PAGINA = 1000;
const IDS_POR_CONSULTA = 150;

export async function lerTudo<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error?: { message: string } | null }>,
): Promise<T[]> {
  const tudo: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    tudo.push(...(data ?? []));
    if (!data || data.length < PAGINA) return tudo;
  }
}

/** Lista longa de ids em pedaços, para o filtro "in" não estourar o tamanho do endereço. */
export function emPedacos<T>(itens: T[], tamanho = IDS_POR_CONSULTA): T[][] {
  const pedacos: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) pedacos.push(itens.slice(i, i + tamanho));
  return pedacos;
}

type ClienteLeitura = {
  // O cliente do Supabase; só o que estas funções usam.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (tabela: string) => any;
};

/**
 * Todas as linhas de uma tabela cuja coluna está numa lista de ids, sem perder
 * linhas no limite de 1000 nem estourar o endereço com ids demais. `ajustar`
 * acrescenta filtros à consulta. As linhas vêm sem ordem garantida.
 */
export async function lerPorIds<T>(
  db: ClienteLeitura,
  tabela: string,
  colunas: string,
  coluna: string,
  ids: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ajustar: (consulta: any) => any = (c) => c,
): Promise<T[]> {
  if (!ids.length) return [];
  const partes = await Promise.all(
    emPedacos(ids).map((pedaco) =>
      lerTudo<T>((de, ate) => ajustar(db.from(tabela).select(colunas).in(coluna, pedaco)).order("id").range(de, ate)),
    ),
  );
  return partes.flat();
}

/** Respostas já corrigidas (com nota) de uma lista de tentativas. */
export const respostasCorrigidas = <T>(db: ClienteLeitura, colunas: string, tentativas: string[]) =>
  lerPorIds<T>(db, "respostas", colunas, "tentativa_id", tentativas, (c) => c.not("fracao", "is", null));
