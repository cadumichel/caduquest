import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CaduQuest", template: "%s · CaduQuest" },
  description: "Revisão gamificada de História: temporadas, desafios e ranking da turma.",
  applicationName: "CaduQuest",
  appleWebApp: { capable: true, title: "CaduQuest", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <footer className="py-3 text-center text-[11px] text-slate-400">
          CaduQuest {process.env.NEXT_PUBLIC_VERSAO}
        </footer>
      </body>
    </html>
  );
}
