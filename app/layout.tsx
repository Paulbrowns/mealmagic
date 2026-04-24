import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MealMagic',
  description: 'Weekly breakfast, lunch and dinner planning for the whole household.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
