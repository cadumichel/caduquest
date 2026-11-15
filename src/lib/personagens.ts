/**
 * Personagens históricos para o avatar do aluno. Cada um é uma ilustração redonda
 * (256×256, WebP com fundo transparente fora do círculo) em public/personagens; os
 * especiais já vêm com a moldura dourada.
 */

export type Personagem = { nome: string; epoca: string; imagem: string };

const TODOS: Personagem[] = [
  { nome: "Cleópatra", epoca: "Egito Antigo", imagem: "/personagens/cleopatra.webp" },
  { nome: "Júlio César", epoca: "Roma Antiga", imagem: "/personagens/julio-cesar.webp" },
  { nome: "Faraó", epoca: "Egito Antigo", imagem: "/personagens/farao.webp" },
  { nome: "Legionário romano", epoca: "Roma Antiga", imagem: "/personagens/legionario-romano.webp" },
  { nome: "Viking", epoca: "Escandinávia medieval", imagem: "/personagens/viking.webp" },
  { nome: "Joana d'Arc", epoca: "França medieval", imagem: "/personagens/joana-d-arc.webp" },
  { nome: "Samurai", epoca: "Japão feudal", imagem: "/personagens/samurai.webp" },
  { nome: "Leonardo da Vinci", epoca: "Renascimento", imagem: "/personagens/leonardo-da-vinci.webp" },
  { nome: "Napoleão", epoca: "França, séc. XIX", imagem: "/personagens/napoleao.webp" },
  { nome: "Marie Curie", epoca: "Ciência, séc. XX", imagem: "/personagens/marie-curie.webp" },
  { nome: "Albert Einstein", epoca: "Ciência, séc. XX", imagem: "/personagens/albert-einstein.webp" },
  { nome: "Gandhi", epoca: "Índia, séc. XX", imagem: "/personagens/gandhi.webp" },
  { nome: "Frida Kahlo", epoca: "México, séc. XX", imagem: "/personagens/frida-kahlo.webp" },
  { nome: "Tiradentes", epoca: "Brasil, Inconfidência", imagem: "/personagens/tiradentes.webp" },
  { nome: "Dom Pedro I", epoca: "Brasil Império", imagem: "/personagens/dom-pedro-i.webp" },
  { nome: "Princesa Isabel", epoca: "Brasil Império", imagem: "/personagens/princesa-isabel.webp" },
  { nome: "Zumbi dos Palmares", epoca: "Brasil Colônia", imagem: "/personagens/zumbi-dos-palmares.webp" },
  { nome: "Dandara", epoca: "Brasil Colônia", imagem: "/personagens/dandara.webp" },
  { nome: "Santos Dumont", epoca: "Brasil, séc. XX", imagem: "/personagens/santos-dumont.webp" },
  { nome: "Getúlio Vargas", epoca: "Brasil, séc. XX", imagem: "/personagens/getulio-vargas.webp" },
  { nome: "Caçador pré-histórico", epoca: "Pré-História", imagem: "/personagens/cacador-pre-historico.webp" },
  { nome: "Hoplita grego", epoca: "Grécia Antiga", imagem: "/personagens/hoplita-grego.webp" },
  { nome: "Cavaleiro medieval", epoca: "Idade Média", imagem: "/personagens/cavaleiro-medieval.webp" },
  { nome: "Monge copista", epoca: "Idade Média", imagem: "/personagens/monge-copista.webp" },
  { nome: "Navegador português", epoca: "Grandes Navegações", imagem: "/personagens/navegador-portugues.webp" },
  { nome: "Pirata", epoca: "Séculos XVII–XVIII", imagem: "/personagens/pirata.webp" },
  { nome: "Guerreiro tupi", epoca: "Brasil, povos originários", imagem: "/personagens/guerreiro-tupi.webp" },
  { nome: "Cangaceiro", epoca: "Brasil, Nordeste", imagem: "/personagens/cangaceiro.webp" },
  { nome: "Pracinha da FEB", epoca: "Brasil, 2ª Guerra", imagem: "/personagens/pracinha-da-feb.webp" },
  { nome: "Astronauta", epoca: "Corrida espacial", imagem: "/personagens/astronauta.webp" },
  { nome: "Escudeira viking", epoca: "Escandinávia medieval", imagem: "/personagens/escudeira-viking.webp" },
  { nome: "Mulher ateniense", epoca: "Grécia Antiga", imagem: "/personagens/mulher-ateniense.webp" },
  { nome: "Camponesa medieval", epoca: "Idade Média", imagem: "/personagens/camponesa-medieval.webp" },
  { nome: "Dama da corte", epoca: "Europa, séc. XVIII", imagem: "/personagens/dama-da-corte.webp" },
  { nome: "Operária", epoca: "Revolução Industrial", imagem: "/personagens/operaria.webp" },
  { nome: "Sufragista", epoca: "Início do séc. XX", imagem: "/personagens/sufragista.webp" },
  { nome: "Baiana do acarajé", epoca: "Brasil, tradição afro-baiana", imagem: "/personagens/baiana-do-acaraje.webp" },
  { nome: "Enfermeira", epoca: "Guerra do Paraguai", imagem: "/personagens/enfermeira.webp" },
  { nome: "Aviadora", epoca: "Anos 1920", imagem: "/personagens/aviadora.webp" },
  { nome: "Cientista", epoca: "Ciência moderna", imagem: "/personagens/cientista.webp" },
  { nome: "Nefertiti", epoca: "Egito Antigo", imagem: "/personagens/nefertiti.webp" },
  { nome: "Elizabeth I", epoca: "Inglaterra, séc. XVI", imagem: "/personagens/elizabeth-i.webp" },
  { nome: "Maria Quitéria", epoca: "Brasil, Independência", imagem: "/personagens/maria-quiteria.webp" },
  { nome: "Rosa Parks", epoca: "EUA, direitos civis", imagem: "/personagens/rosa-parks.webp" },
  { nome: "Malala", epoca: "Paquistão, séc. XXI", imagem: "/personagens/malala.webp" },
  { nome: "Antonieta de Barros", epoca: "Santa Catarina, séc. XX", imagem: "/personagens/antonieta-de-barros.webp" },
  { nome: "Griô do Mali", epoca: "Império do Mali, séc. XIV", imagem: "/personagens/grio-do-mali.webp" },
  { nome: "Capoeirista", epoca: "Brasil, séc. XIX", imagem: "/personagens/capoeirista.webp" },
  { nome: "Chasqui inca", epoca: "Império Inca", imagem: "/personagens/chasqui-inca.webp" },
  { nome: "Hammurabi", epoca: "Mesopotâmia, séc. XVIII a.C.", imagem: "/personagens/hammurabi.webp" },
  { nome: "Hatshepsut", epoca: "Egito Antigo", imagem: "/personagens/hatshepsut.webp" },
  { nome: "Akhenaton", epoca: "Egito Antigo", imagem: "/personagens/akhenaton.webp" },
  { nome: "Arqueira núbia", epoca: "Reino de Kush", imagem: "/personagens/arqueira-nubia.webp" },
  { nome: "Confúcio", epoca: "China, séc. VI–V a.C.", imagem: "/personagens/confucio.webp" },
  { nome: "Péricles", epoca: "Grécia Antiga", imagem: "/personagens/pericles.webp" },
  { nome: "Sêneca", epoca: "Roma Antiga", imagem: "/personagens/seneca.webp" },
  { nome: "Guerreiro-águia asteca", epoca: "México pré-colonial", imagem: "/personagens/guerreiro-aguia-asteca.webp" },
  { nome: "Ceramista marajoara", epoca: "Amazônia pré-colonial", imagem: "/personagens/ceramista-marajoara.webp" },
  {
    nome: "Mercador da Rota da Seda",
    epoca: "China, dinastia Tang",
    imagem: "/personagens/mercador-da-rota-da-seda.webp",
  },
  { nome: "Wu Zetian", epoca: "China, séc. VII", imagem: "/personagens/wu-zetian.webp" },
  { nome: "Sábio de Bagdá", epoca: "Casa da Sabedoria, séc. IX", imagem: "/personagens/sabio-de-bagda.webp" },
  { nome: "Carlos, o Calvo", epoca: "Império Carolíngio, séc. IX", imagem: "/personagens/carlos-o-calvo.webp" },
  { nome: "Rumi", epoca: "Pérsia, séc. XIII", imagem: "/personagens/rumi.webp" },
  { nome: "Ibn Battuta", epoca: "Marrocos, séc. XIV", imagem: "/personagens/ibn-battuta.webp" },
  { nome: "Michelangelo", epoca: "Renascimento", imagem: "/personagens/michelangelo.webp" },
  { nome: "Michel de Montaigne", epoca: "França, séc. XVI", imagem: "/personagens/michel-de-montaigne.webp" },
  { nome: "William Shakespeare", epoca: "Inglaterra, séc. XVI–XVII", imagem: "/personagens/william-shakespeare.webp" },
  { nome: "Galileu Galilei", epoca: "Itália, séc. XVII", imagem: "/personagens/galileu-galilei.webp" },
  { nome: "Ching Shih", epoca: "China, séc. XIX", imagem: "/personagens/ching-shih.webp" },
  { nome: "John Locke", epoca: "Inglaterra, séc. XVII", imagem: "/personagens/john-locke.webp" },
  { nome: "Montesquieu", epoca: "França, séc. XVIII", imagem: "/personagens/montesquieu.webp" },
  { nome: "Lovisa Ulrika", epoca: "Suécia, séc. XVIII", imagem: "/personagens/lovisa-ulrika.webp" },
  { nome: "Catarina, a Grande", epoca: "Rússia, séc. XVIII", imagem: "/personagens/catarina-a-grande.webp" },
  { nome: "Aleijadinho", epoca: "Brasil, séc. XVIII", imagem: "/personagens/aleijadinho.webp" },
  { nome: "Chico Rei", epoca: "Brasil Colônia, séc. XVIII", imagem: "/personagens/chico-rei.webp" },
  { nome: "Bartolomeu de Gusmão", epoca: "Brasil, séc. XVIII", imagem: "/personagens/bartolomeu-de-gusmao.webp" },
  { nome: "Benjamin Franklin", epoca: "EUA, séc. XVIII", imagem: "/personagens/benjamin-franklin.webp" },
  { nome: "Thomas Jefferson", epoca: "EUA, séc. XVIII–XIX", imagem: "/personagens/thomas-jefferson.webp" },
  { nome: "Tupac Amaru II", epoca: "Peru, séc. XVIII", imagem: "/personagens/tupac-amaru-ii.webp" },
  { nome: "Toussaint Louverture", epoca: "Haiti, séc. XVIII", imagem: "/personagens/toussaint-louverture.webp" },
  { nome: "Beethoven", epoca: "Alemanha, séc. XVIII–XIX", imagem: "/personagens/beethoven.webp" },
  { nome: "Simón Bolívar", epoca: "América do Sul, séc. XIX", imagem: "/personagens/simon-bolivar.webp" },
  { nome: "Imperatriz Leopoldina", epoca: "Brasil Império", imagem: "/personagens/imperatriz-leopoldina.webp" },
  { nome: "Dom Pedro II", epoca: "Brasil Império", imagem: "/personagens/dom-pedro-ii.webp" },
  { nome: "Imperatriz Sissi", epoca: "Áustria, séc. XIX", imagem: "/personagens/imperatriz-sissi.webp" },
  { nome: "Anita Garibaldi", epoca: "Brasil e Itália, séc. XIX", imagem: "/personagens/anita-garibaldi.webp" },
  { nome: "Abraham Lincoln", epoca: "EUA, séc. XIX", imagem: "/personagens/abraham-lincoln.webp" },
  { nome: "Sojourner Truth", epoca: "EUA, séc. XIX", imagem: "/personagens/sojourner-truth.webp" },
  { nome: "Frederick Douglass", epoca: "EUA, séc. XIX", imagem: "/personagens/frederick-douglass.webp" },
  { nome: "Barão de Mauá", epoca: "Brasil, séc. XIX", imagem: "/personagens/barao-de-maua.webp" },
  { nome: "André Rebouças", epoca: "Brasil, séc. XIX", imagem: "/personagens/andre-reboucas.webp" },
  { nome: "Chiquinha Gonzaga", epoca: "Brasil, séc. XIX–XX", imagem: "/personagens/chiquinha-gonzaga.webp" },
  { nome: "Imigrante japonesa", epoca: "Brasil, 1908", imagem: "/personagens/imigrante-japonesa.webp" },
  { nome: "Mulher xokleng", epoca: "Vale do Itajaí, povos originários", imagem: "/personagens/mulher-xokleng.webp" },
  { nome: "Guerreira agojie", epoca: "Reino do Daomé", imagem: "/personagens/guerreira-agojie.webp" },
  { nome: "Quitandeira", epoca: "Brasil Colônia", imagem: "/personagens/quitandeira.webp" },
  { nome: "Cacique guarani", epoca: "Missões, séc. XVIII", imagem: "/personagens/cacique-guarani.webp" },
  { nome: "Pixinguinha", epoca: "Brasil, séc. XX", imagem: "/personagens/pixinguinha.webp" },
  { nome: "Bessie Coleman", epoca: "EUA, séc. XX", imagem: "/personagens/bessie-coleman.webp" },
  { nome: "Louis Armstrong", epoca: "EUA, séc. XX", imagem: "/personagens/louis-armstrong.webp" },
  { nome: "Josephine Baker", epoca: "França, séc. XX", imagem: "/personagens/josephine-baker.webp" },
  { nome: "Walt Disney", epoca: "EUA, séc. XX", imagem: "/personagens/walt-disney.webp" },
  { nome: "Alan Turing", epoca: "Inglaterra, séc. XX", imagem: "/personagens/alan-turing.webp" },
  { nome: "Anne Frank", epoca: "Holanda, séc. XX", imagem: "/personagens/anne-frank.webp" },
  { nome: "Simone de Beauvoir", epoca: "França, séc. XX", imagem: "/personagens/simone-de-beauvoir.webp" },
  { nome: "Nise da Silveira", epoca: "Brasil, séc. XX", imagem: "/personagens/nise-da-silveira.webp" },
  { nome: "Abdias do Nascimento", epoca: "Brasil, séc. XX", imagem: "/personagens/abdias-do-nascimento.webp" },
  { nome: "Mao Tsé-Tung", epoca: "China, séc. XX", imagem: "/personagens/mao-tse-tung.webp" },
  { nome: "Celso Furtado", epoca: "Brasil, séc. XX", imagem: "/personagens/celso-furtado.webp" },
  { nome: "Martin Luther King Jr.", epoca: "EUA, séc. XX", imagem: "/personagens/martin-luther-king.webp" },
  { nome: "James Baldwin", epoca: "EUA, séc. XX", imagem: "/personagens/james-baldwin.webp" },
  { nome: "Patrice Lumumba", epoca: "Congo, séc. XX", imagem: "/personagens/patrice-lumumba.webp" },
  { nome: "John Lennon", epoca: "Inglaterra, séc. XX", imagem: "/personagens/john-lennon.webp" },
  { nome: "Neil Armstrong", epoca: "EUA, séc. XX", imagem: "/personagens/neil-armstrong.webp" },
  { nome: "Tom Jobim", epoca: "Brasil, séc. XX", imagem: "/personagens/tom-jobim.webp" },
  { nome: "Milton Santos", epoca: "Brasil, séc. XX", imagem: "/personagens/milton-santos.webp" },
  { nome: "Wangari Maathai", epoca: "Quênia, séc. XX", imagem: "/personagens/wangari-maathai.webp" },
  { nome: "Desmond Tutu", epoca: "África do Sul, séc. XX", imagem: "/personagens/desmond-tutu.webp" },
  { nome: "Ayrton Senna", epoca: "Brasil, séc. XX", imagem: "/personagens/ayrton-senna.webp" },
  { nome: "Steve Jobs", epoca: "EUA, séc. XX–XXI", imagem: "/personagens/steve-jobs.webp" },
  { nome: "Mansa Musa", epoca: "Império do Mali, séc. XIV", imagem: "/personagens/mansa-musa.webp" },
  { nome: "Nzinga Mbande", epoca: "Ndongo e Matamba (Angola), séc. XVII", imagem: "/personagens/nzinga-mbande.webp" },
  { nome: "Luiz Gama", epoca: "Abolicionista, Brasil", imagem: "/personagens/luiz-gama.webp" },
  { nome: "Machado de Assis", epoca: "Literatura, Brasil", imagem: "/personagens/machado-de-assis.webp" },
  { nome: "Harriet Tubman", epoca: "EUA, abolição", imagem: "/personagens/harriet-tubman.webp" },
  { nome: "Carolina Maria de Jesus", epoca: "Literatura, Brasil", imagem: "/personagens/carolina-maria-de-jesus.webp" },
  { nome: "Nelson Mandela", epoca: "África do Sul, séc. XX", imagem: "/personagens/nelson-mandela.webp" },
  { nome: "Sócrates", epoca: "Grécia Antiga", imagem: "/personagens/socrates.webp" },
  { nome: "Hipátia", epoca: "Alexandria, séc. IV–V", imagem: "/personagens/hipatia.webp" },
  { nome: "Carlos Magno", epoca: "Império Carolíngio, séc. VIII–IX", imagem: "/personagens/carlos-magno.webp" },
  { nome: "Avicena", epoca: "Pérsia, séc. X–XI", imagem: "/personagens/avicena.webp" },
  { nome: "Gengis Khan", epoca: "Mongólia, séc. XIII", imagem: "/personagens/gengis-khan.webp" },
  { nome: "Martinho Lutero", epoca: "Alemanha, séc. XVI", imagem: "/personagens/martinho-lutero.webp" },
  { nome: "José de San Martín", epoca: "América do Sul, séc. XIX", imagem: "/personagens/jose-de-san-martin.webp" },
  { nome: "Emmeline Pankhurst", epoca: "Inglaterra, séc. XIX–XX", imagem: "/personagens/emmeline-pankhurst.webp" },
  {
    nome: "Tereza de Benguela",
    epoca: "Quilombo do Quariterê, séc. XVIII",
    imagem: "/personagens/tereza-de-benguela.webp",
  },
  { nome: "Murasaki Shikibu", epoca: "Japão, séc. XI", imagem: "/personagens/murasaki-shikibu.webp" },
];

const porNome = (nomes: string[]) =>
  nomes.map((n) => {
    const p = TODOS.find((t) => t.nome === n);
    if (!p) throw new Error(`Personagem não encontrado: ${n}`);
    return p;
  });

/**
 * Ordem fixa = índice salvo em alunos.avatar. Personagens novos entram sempre no
 * fim, para não mudar o avatar de quem já escolheu.
 */
export const PERSONAGENS = porNome([
  // 0–19: básicos
  "Caçador pré-histórico",
  "Faraó",
  "Hoplita grego",
  "Legionário romano",
  "Viking",
  "Cavaleiro medieval",
  "Monge copista",
  "Samurai",
  "Navegador português",
  "Guerreiro tupi",
  "Pirata",
  "Dandara",
  "Princesa Isabel",
  "Cangaceiro",
  "Santos Dumont",
  "Frida Kahlo",
  "Getúlio Vargas",
  "Gandhi",
  "Pracinha da FEB",
  "Astronauta",
  // 20–29: especiais
  "Cleópatra",
  "Júlio César",
  "Joana d'Arc",
  "Leonardo da Vinci",
  "Zumbi dos Palmares",
  "Tiradentes",
  "Napoleão",
  "Dom Pedro I",
  "Marie Curie",
  "Albert Einstein",
  // 30–39: básicos
  "Escudeira viking",
  "Mulher ateniense",
  "Camponesa medieval",
  "Dama da corte",
  "Operária",
  "Sufragista",
  "Baiana do acarajé",
  "Enfermeira",
  "Aviadora",
  "Cientista",
  // 40–44: especiais
  "Nefertiti",
  "Elizabeth I",
  "Maria Quitéria",
  "Rosa Parks",
  "Malala",
  // 45–48: básicos (diversidade, 2026-11)
  "Antonieta de Barros",
  "Griô do Mali",
  "Capoeirista",
  "Chasqui inca",
  // 49 em diante: catálogo do Cadu (2026-11-15)
  "Hammurabi",
  "Hatshepsut",
  "Akhenaton",
  "Arqueira núbia",
  "Confúcio",
  "Péricles",
  "Sêneca",
  "Guerreiro-águia asteca",
  "Ceramista marajoara",
  "Mercador da Rota da Seda",
  "Wu Zetian",
  "Sábio de Bagdá",
  "Carlos, o Calvo",
  "Rumi",
  "Ibn Battuta",
  "Michelangelo",
  "Michel de Montaigne",
  "William Shakespeare",
  "Galileu Galilei",
  "Ching Shih",
  "John Locke",
  "Montesquieu",
  "Lovisa Ulrika",
  "Catarina, a Grande",
  "Aleijadinho",
  "Chico Rei",
  "Bartolomeu de Gusmão",
  "Benjamin Franklin",
  "Thomas Jefferson",
  "Tupac Amaru II",
  "Toussaint Louverture",
  "Beethoven",
  "Simón Bolívar",
  "Imperatriz Leopoldina",
  "Dom Pedro II",
  "Imperatriz Sissi",
  "Anita Garibaldi",
  "Abraham Lincoln",
  "Sojourner Truth",
  "Frederick Douglass",
  "Barão de Mauá",
  "André Rebouças",
  "Chiquinha Gonzaga",
  "Imigrante japonesa",
  "Mulher xokleng",
  "Guerreira agojie",
  "Quitandeira",
  "Cacique guarani",
  "Pixinguinha",
  "Bessie Coleman",
  "Louis Armstrong",
  "Josephine Baker",
  "Walt Disney",
  "Alan Turing",
  "Anne Frank",
  "Simone de Beauvoir",
  "Nise da Silveira",
  "Abdias do Nascimento",
  "Mao Tsé-Tung",
  "Celso Furtado",
  "Martin Luther King Jr.",
  "James Baldwin",
  "Patrice Lumumba",
  "John Lennon",
  "Neil Armstrong",
  "Tom Jobim",
  "Milton Santos",
  "Wangari Maathai",
  "Desmond Tutu",
  "Ayrton Senna",
  "Steve Jobs",
  "Mansa Musa",
  "Nzinga Mbande",
  "Luiz Gama",
  "Machado de Assis",
  "Harriet Tubman",
  "Carolina Maria de Jesus",
  "Nelson Mandela",
  "Sócrates",
  "Hipátia",
  "Carlos Magno",
  "Avicena",
  "Gengis Khan",
  "Martinho Lutero",
  "José de San Martín",
  "Emmeline Pankhurst",
  "Tereza de Benguela",
  "Murasaki Shikibu",
]);
export const TOTAL_PERSONAGENS = PERSONAGENS.length;

const indice = (nome: string) => PERSONAGENS.findIndex((p) => p.nome === nome);

/** Especiais na ordem de desbloqueio: o 1º desafio vencido libera o 1º, o 2º libera o 2º, e assim por diante. */
export const ORDEM_ESPECIAIS = [
  "Cleópatra",
  "Nefertiti",
  "Júlio César",
  "Joana d'Arc",
  "Elizabeth I",
  "Leonardo da Vinci",
  "Zumbi dos Palmares",
  "Tiradentes",
  "Maria Quitéria",
  "Napoleão",
  "Dom Pedro I",
  "Rosa Parks",
  "Marie Curie",
  "Albert Einstein",
  "Malala",
  "Mansa Musa",
  "Nzinga Mbande",
  "Luiz Gama",
  "Machado de Assis",
  "Harriet Tubman",
  "Carolina Maria de Jesus",
  "Nelson Mandela",
  "Tereza de Benguela",
  "Murasaki Shikibu",
].map(indice);

/** Básicos acrescentados depois (índices 45 em diante), na ordem da tela. */
const BASICOS_NOVOS = [
  "Antonieta de Barros",
  "Griô do Mali",
  "Capoeirista",
  "Chasqui inca",
  "Hammurabi",
  "Hatshepsut",
  "Akhenaton",
  "Arqueira núbia",
  "Confúcio",
  "Péricles",
  "Sêneca",
  "Guerreiro-águia asteca",
  "Ceramista marajoara",
  "Mercador da Rota da Seda",
  "Wu Zetian",
  "Sábio de Bagdá",
  "Carlos, o Calvo",
  "Rumi",
  "Ibn Battuta",
  "Michelangelo",
  "Michel de Montaigne",
  "William Shakespeare",
  "Galileu Galilei",
  "Ching Shih",
  "John Locke",
  "Montesquieu",
  "Lovisa Ulrika",
  "Catarina, a Grande",
  "Aleijadinho",
  "Chico Rei",
  "Bartolomeu de Gusmão",
  "Benjamin Franklin",
  "Thomas Jefferson",
  "Tupac Amaru II",
  "Toussaint Louverture",
  "Beethoven",
  "Simón Bolívar",
  "Imperatriz Leopoldina",
  "Dom Pedro II",
  "Imperatriz Sissi",
  "Anita Garibaldi",
  "Abraham Lincoln",
  "Sojourner Truth",
  "Frederick Douglass",
  "Barão de Mauá",
  "André Rebouças",
  "Chiquinha Gonzaga",
  "Imigrante japonesa",
  "Mulher xokleng",
  "Guerreira agojie",
  "Quitandeira",
  "Cacique guarani",
  "Pixinguinha",
  "Bessie Coleman",
  "Louis Armstrong",
  "Josephine Baker",
  "Walt Disney",
  "Alan Turing",
  "Anne Frank",
  "Simone de Beauvoir",
  "Nise da Silveira",
  "Abdias do Nascimento",
  "Mao Tsé-Tung",
  "Celso Furtado",
  "Martin Luther King Jr.",
  "James Baldwin",
  "Patrice Lumumba",
  "John Lennon",
  "Neil Armstrong",
  "Tom Jobim",
  "Milton Santos",
  "Wangari Maathai",
  "Desmond Tutu",
  "Ayrton Senna",
  "Steve Jobs",
  "Sócrates",
  "Hipátia",
  "Carlos Magno",
  "Avicena",
  "Gengis Khan",
  "Martinho Lutero",
  "José de San Martín",
  "Emmeline Pankhurst",
].map(indice);

/**
 * Liberados para todos, na ordem da tela de escolha (dois do 1º lote, um do 2º, intercalados),
 * seguidos dos básicos novos.
 */
export const BASICOS = [...Array.from({ length: 10 }, (_, k) => [2 * k, 2 * k + 1, 30 + k]).flat(), ...BASICOS_NOVOS];

export const ehEspecial = (avatar: number) => ORDEM_ESPECIAIS.includes(avatar);

/**
 * Personagens com que todo aluno começa e que aparecem no cadastro: 5 meninos e 5 meninas,
 * de povos e épocas diferentes (pedido do Cadu: lista inicial diversa).
 */
export const INICIAIS = [
  "Caçador pré-histórico",
  "Faraó",
  "Guerreiro tupi",
  "Samurai",
  "Griô do Mali",
  "Mulher ateniense",
  "Escudeira viking",
  "Dandara",
  "Antonieta de Barros",
  "Frida Kahlo",
].map(indice);

/** Básicos na ordem de desbloqueio: os iniciais e depois os demais, na ordem da tela. */
export const ORDEM_BASICOS = [...INICIAIS, ...BASICOS.filter((i) => !INICIAIS.includes(i))];

/** Desafio concluído com mais da metade de acertos libera 4 básicos; com metade ou menos, 1. */
export const BASICOS_POR_DESAFIO_BOM = 4;
export const BASICOS_POR_DESAFIO = 1;

/** Acerto mínimo da temporada (todos os desafios feitos) para ganhar um lendário no fim dela. */
export const ACERTO_TEMPORADA_LENDARIO = 0.5;

/** Básicos que um desafio concluído libera, pelo acerto (fração de 0 a 1). */
export const basicosDoDesafio = (acerto: number) => (acerto > 0.5 ? BASICOS_POR_DESAFIO_BOM : BASICOS_POR_DESAFIO);

/** Quantos personagens o aluno já ganhou: básicos além dos iniciais e lendários. */
export type Desbloqueios = { basicos: number; lendarios: number };

/**
 * Regras de liberação (pedido do Cadu, 2026-11-15):
 * - cada desafio concluído libera 4 básicos com mais da metade de acertos, ou 1 com metade ou menos;
 * - cada temporada encerrada em que o aluno fez todos os desafios (fora o CaduRush) libera um
 *   lendário com acerto médio de pelo menos 50%, ou um básico abaixo disso;
 * - cada vitória (maior pontuação de um desafio) também libera um lendário.
 */
export function calcularDesbloqueios({
  desafios,
  temporadas,
  vitorias,
}: {
  /** Desafios concluídos pelo aluno, com o acerto de cada um (0 a 1). */
  desafios: { id: string; acerto: number }[];
  /** Temporadas da turma: desafios obrigatórios e se a pontuação já encerrou. */
  temporadas: { desafios: string[]; encerrada: boolean }[];
  vitorias: number;
}): Desbloqueios {
  const acerto = new Map(desafios.map((d) => [d.id, d.acerto]));
  let basicos = desafios.reduce((s, d) => s + basicosDoDesafio(d.acerto), 0);
  let lendarios = vitorias;
  for (const t of temporadas) {
    if (!t.encerrada || !t.desafios.length || !t.desafios.every((id) => acerto.has(id))) continue;
    const media = t.desafios.reduce((s, id) => s + (acerto.get(id) ?? 0), 0) / t.desafios.length;
    if (media >= ACERTO_TEMPORADA_LENDARIO) lendarios++;
    else basicos++;
  }
  return { basicos, lendarios };
}

/** Quantos básicos (iniciais incluídos) e lendários o aluno tem liberados. */
export const basicosLiberados = (d: Desbloqueios) => Math.min(ORDEM_BASICOS.length, INICIAIS.length + d.basicos);
export const lendariosLiberados = (d: Desbloqueios) => Math.min(ORDEM_ESPECIAIS.length, d.lendarios);

/** O aluno pode usar este personagem? Básicos e lendários na ordem de liberação. */
export function personagemLiberado(avatar: number, d: Desbloqueios) {
  return ehEspecial(avatar)
    ? ORDEM_ESPECIAIS.indexOf(avatar) < lendariosLiberados(d)
    : ORDEM_BASICOS.indexOf(avatar) < basicosLiberados(d);
}

/** Posição do lendário na ordem de liberação (1 = o primeiro). */
export const numeroDoLendario = (avatar: number) => ORDEM_ESPECIAIS.indexOf(avatar) + 1;
