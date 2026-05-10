import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS Admin',
  description: 'Supermarket POS — Admin Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
