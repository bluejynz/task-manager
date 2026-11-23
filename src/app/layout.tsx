import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import { TRPCProvider } from "@/trpc/client";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Task Manager | Suas tarefas, com clareza",
  description: "Um espaço simples para organizar tarefas e acompanhar o trabalho.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${jakarta.variable}`}>
        <TRPCProvider>
          <ToastProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-4">Pular para o conteúdo</a>
            <header className="border-b border-line bg-surface">
              <div className="mx-auto max-w-6xl px-6 py-6">
                <Link href="/" prefetch={false} className="inline-flex items-center gap-3 rounded-lg">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">✓</span>
                  <span className="font-heading text-lg font-bold tracking-tight">Task Manager</span>
                </Link>
              </div>
            </header>
            {children}
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
