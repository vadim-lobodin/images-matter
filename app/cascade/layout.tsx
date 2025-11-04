import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cascade",
  description: "AI-powered image generation and editing canvas",
};

export default function CascadeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
