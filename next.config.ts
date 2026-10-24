import type { NextConfig } from "next";

// Versão exibida no rodapé. Cada merge de PR na main vira "v<número do PR>";
// fora disso (build local ou push direto) fica o commit curto.
const mensagem = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
const pr = mensagem.match(/Merge pull request #(\d+)/)?.[1];
const publicadoEm = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date());

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSAO: [pr ? `v${pr}` : commit || "local", pr && commit, publicadoEm].filter(Boolean).join(" · "),
  },
  // O app é quase todo autenticado (professor e aluno), então fica no modelo
  // dinâmico padrão, sem Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
