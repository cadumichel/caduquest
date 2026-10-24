import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
