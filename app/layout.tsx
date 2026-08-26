import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "قِطاف | للبيع والتوزيع",
  description: "منتجات طازجة مختارة بعناية، بالكيلو أو الصندوق، وتوصيل حتى بابك.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
