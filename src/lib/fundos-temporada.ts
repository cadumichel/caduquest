/**
 * Banco de 20 cenários para o cartão da temporada na página inicial. O app escolhe
 * sozinho: se o nome, a narrativa ou os capítulos da temporada combinam com um
 * cenário, usa esse; senão, vai trocando a cada temporada nova da turma.
 */
export const FUNDOS_TEMPORADA = [
  { nome: "Pirâmides de Gizé", palavras: ["egito", "egipcio", "farao", "piramide", "nilo"] },
  { nome: "Partenon", palavras: ["grecia", "grego", "atenas", "esparta", "helenis", "democracia"] },
  { nome: "Coliseu", palavras: ["roma", "romano", "imperio romano", "republica romana", "cesar"] },
  { nome: "Muralha da China", palavras: ["china", "chines", "oriente", "seda"] },
  { nome: "Castelo medieval", palavras: ["medieval", "idade media", "feudal", "feudo", "cavaleiro"] },
  { nome: "Catedral gótica", palavras: ["igreja", "gotic", "cruzada", "reforma", "cristianismo", "renascimento"] },
  { nome: "Caravelas", palavras: ["navegac", "descobrimento", "expansao maritima", "caravela", "colombo", "cabral"] },
  { nome: "Machu Picchu", palavras: ["inca", "andes", "america pre", "pre-colombian"] },
  { nome: "Pirâmide maia", palavras: ["maia", "asteca", "mesoamerica"] },
  {
    nome: "Zigurate",
    palavras: ["mesopotamia", "sumeri", "babilon", "hamurabi", "antigo oriente", "fenici", "hebreu"],
  },
  { nome: "Stonehenge", palavras: ["pre-historia", "prehistoria", "paleolitico", "neolitico", "primeiros humanos"] },
  { nome: "Fábricas a vapor", palavras: ["industrial", "operari", "capitalismo", "socialismo", "fabrica"] },
  {
    nome: "Paris",
    palavras: ["revolucao francesa", "franca", "iluminismo", "napoleao", "belle epoque", "absolutismo"],
  },
  { nome: "Cidade barroca", palavras: ["mineracao", "ouro preto", "minas gerais", "barroco", "inconfidencia"] },
  { nome: "Engenho de açúcar", palavras: ["engenho", "acucar", "colonia", "colonial", "capitanias", "brasil colonia"] },
  { nome: "Quilombo", palavras: ["quilombo", "palmares", "escravi", "africa", "abolicao", "resistencia"] },
  { nome: "Brasília", palavras: ["republica", "vargas", "ditadura", "redemocratizacao", "brasilia", "juscelino"] },
  { nome: "Japão feudal", palavras: ["japao", "samurai", "xogum"] },
  { nome: "Fiorde viking", palavras: ["viking", "nordico", "escandinav", "germanic", "barbaro"] },
  { nome: "Corrida espacial", palavras: ["guerra fria", "espacial", "seculo xx", "mundo contemporaneo"] },
] as const;

export const TOTAL_FUNDOS = FUNDOS_TEMPORADA.length;

export const imagemDoFundo = (i: number) => `/fundos/temporada-${String(i + 1).padStart(2, "0")}.webp`;

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Índice do cenário. `ordem` é quantas temporadas a turma teve antes desta, para
 * que temporadas seguidas sem tema reconhecido não repitam o cenário.
 */
export function escolherFundo(
  temporada: { nome: string; narrativa: string | null; capitulos: string[] },
  ordem: number,
): number {
  const texto = normalizar([temporada.nome, temporada.narrativa ?? "", ...temporada.capitulos].join(" "));
  let melhor = -1;
  let pontos = 0;
  FUNDOS_TEMPORADA.forEach((f, i) => {
    const p = f.palavras.filter((w) => texto.includes(w)).length;
    if (p > pontos) {
      pontos = p;
      melhor = i;
    }
  });
  return melhor >= 0 ? melhor : ((ordem % TOTAL_FUNDOS) + TOTAL_FUNDOS) % TOTAL_FUNDOS;
}
