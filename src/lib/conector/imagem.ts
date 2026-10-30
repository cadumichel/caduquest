import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const TIPOS_IMAGEM: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const LIMITE_BYTES = 2 * 1024 * 1024;

/**
 * Baixa uma imagem pública (ex.: Wikimedia Commons) e guarda no bucket das
 * questões, na pasta do professor. Devolve o caminho ou o motivo da falha.
 */
export async function guardarImagemDaUrl(
  url: string,
  professorId: string,
): Promise<{ caminho: string } | { erro: string }> {
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return { erro: "imagem_url inválida." };
  }
  if (endereco.protocol !== "https:") return { erro: "imagem_url precisa começar com https://." };

  let resposta: Response;
  try {
    resposta = await fetch(endereco, {
      headers: { "User-Agent": "CaduQuest/1.0 (app escolar de revisão de História)" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { erro: "Não consegui baixar a imagem (tempo esgotado ou endereço fora do ar)." };
  }
  if (!resposta.ok) return { erro: `Não consegui baixar a imagem (HTTP ${resposta.status}).` };
  const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = TIPOS_IMAGEM[tipo];
  if (!ext) return { erro: "O endereço não é uma imagem PNG, JPG, WEBP ou GIF. Use o link direto do arquivo." };
  const bytes = await resposta.arrayBuffer();
  if (bytes.byteLength > LIMITE_BYTES) {
    return { erro: "Imagem acima de 2 MB. Use uma versão menor (na Wikimedia, a miniatura de 800 px)." };
  }

  const caminho = `${professorId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await criarClienteAdmin().storage.from("questoes").upload(caminho, bytes, { contentType: tipo });
  if (error) return { erro: "Não consegui guardar a imagem." };
  return { caminho };
}
