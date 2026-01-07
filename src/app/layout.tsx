import "~/styles/globals.css";

import { type Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

export const metadata: Metadata = {
  title: "wrkrr - Interview Practice",
  description: "Practice your interview skills with AI mock interviews",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
