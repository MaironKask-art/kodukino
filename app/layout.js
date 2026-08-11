import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Kodukino",
  description: "Broneerimissüsteem",
};

export default function RootLayout({ children }) {
  return (
    <html lang="et">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
