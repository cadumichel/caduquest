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
