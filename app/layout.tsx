// app/layout.tsx
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'Gastronomy SaaS',
  description: 'Sistem për kafene & restorante',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}