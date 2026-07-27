import type { Metadata } from "next";
import { Fredoka  } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: "400",
});

export const metadata: Metadata = {
  title: "RoboticSir | Attendance Control Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={fredoka.className}>
        {children}
      </body>
    </html>
  );
}