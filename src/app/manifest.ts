import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CaduQuest",
    short_name: "CaduQuest",
    description: "Revisão gamificada de História",
    start_url: "/aluno",
    display: "standalone",
    background_color: "#f6f4fd",
    theme_color: "#1f0a6b",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
