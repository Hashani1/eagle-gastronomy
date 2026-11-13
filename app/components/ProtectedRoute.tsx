// app/components/ProtectedRoute.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedRoute({
  children,
  roletELejuara,
}: {
  children: React.ReactNode;
  roletELejuara: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Nuk është kyçur
        router.push('/login');
      } else if (!roletELejuara.includes(user.roli)) {
        // Është kyçur, por nuk ka leje për këtë faqe
        alert('Nuk keni leje për të hyrë në këtë faqe!');
        router.push('/');
      }
    }
  }, [user, loading, router, roletELejuara]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Duke verifikuar...</p>
      </div>
    );
  }

  if (!user || !roletELejuara.includes(user.roli)) {
    return null;
  }

  return <>{children}</>;
}