import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed Me",
  description: "Tell us what you like. We’ll sort the month.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
