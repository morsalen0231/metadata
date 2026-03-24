import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaForge BD",
  description: "ছবির metadata দেখা, preset device metadata inject করা, এবং updated image download করার একটি বাংলা tool।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
