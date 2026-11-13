// app/debug/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function DebugPage() {
  const { user, loading } = useAuth();
  const [userDocNgaFirestore, setUserDocNgaFirestore] = useState<any>(null);
  const [teGjitheUserat, setTeGjitheUserat] = useState<any[]>([]);
  const [gabim, setGabim] = useState<string | null>(null);

  useEffect(() => {
    async function lexo() {
      try {
        // 1. Lexo dokumentin specifik të përdoruesit aktual
        if (auth.currentUser) {
          const d = await getDoc(
            doc(db, 'tenants', 'demo-tenant', 'users', auth.currentUser.uid)
          );
          if (d.exists()) {
            setUserDocNgaFirestore({ id: d.id, ...d.data() });
          } else {
            setUserDocNgaFirestore({ id: 'NUK EKZISTON', data: 'Nuk u gjet' });
          }
        }

        // 2. Lexo të gjithë përdoruesit
        const snap = await getDocs(
          collection(db, 'tenants', 'demo-tenant', 'users')
        );
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTeGjitheUserat(lista);
      } catch (err: any) {
        setGabim(err.message);
      }
    }
    lexo();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Diagnostikë</h1>

        {gabim && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
            <p className="font-bold text-red-800">Gabim:</p>
            <p className="text-sm text-red-600">{gabim}</p>
          </div>
        )}

        {/* Statusi i Auth */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">1. Statusi i Autentikimit (Auth)</h2>
          <div className="space-y-2 text-sm font-mono">
            <p>
              <strong>Loading:</strong>{' '}
              <span className={loading ? 'text-red-600' : 'text-green-600'}>
                {loading ? 'true (duke u ngarkuar)' : 'false (gati)'}
              </span>
            </p>
            <p>
              <strong>Firebase User (auth.currentUser):</strong>{' '}
              {auth.currentUser ? (
                <span className="text-green-600">{auth.currentUser.email}</span>
              ) : (
                <span className="text-red-600">ASNJË i kyçur</span>
              )}
            </p>
            <p>
              <strong>UID:</strong>{' '}
              {auth.currentUser?.uid || <span className="text-red-600">-</span>}
            </p>
          </div>
        </div>

        {/* Statusi i Context */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">2. Statusi në Context (useAuth)</h2>
          {user ? (
            <div className="space-y-2 text-sm font-mono">
              <p>
                <strong>Emri:</strong> {user.emri}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Roli:</strong>{' '}
                <span
                  className={
                    user.roli === 'PRONAR' || user.roli === 'MENAXHER'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  "{user.roli}" (me thonjëza që të shohësh saktësisht)
                </span>
              </p>
              <p>
                <strong>UID:</strong> {user.uid}
              </p>
            </div>
          ) : (
            <p className="text-red-600 text-sm">User = null (asnjë)</p>
          )}
        </div>

        {/* Dokumenti në Firestore */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">
            3. Dokumenti në Firestore për përdoruesin aktual
          </h2>
          {userDocNgaFirestore ? (
            <div className="space-y-2 text-sm font-mono">
              <p>
                <strong>Document ID:</strong> {userDocNgaFirestore.id}
              </p>
              {userDocNgaFirestore.id === 'NUK EKZISTON' ? (
                <p className="text-red-600">
                  ❌ Nuk ka dokument në Firestore me UID-në tënde!
                </p>
              ) : (
                <pre className="bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(userDocNgaFirestore, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Duke lexuar...</p>
          )}
        </div>

        {/* Të gjithë përdoruesit */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">
            4. Të gjithë përdoruesit në Firestore ({teGjitheUserat.length})
          </h2>
          {teGjitheUserat.length === 0 ? (
            <p className="text-red-600 text-sm">
              ❌ Koleksioni users është bosh ose nuk ekziston!
            </p>
          ) : (
            <div className="space-y-2">
              {teGjitheUserat.map((u) => (
                <div
                  key={u.id}
                  className="bg-gray-50 p-3 rounded border-l-4 border-blue-500 text-sm font-mono"
                >
                  <p>
                    <strong>Document ID:</strong> {u.id}
                  </p>
                  <p>
                    <strong>Email:</strong> {u.email || '-'}
                  </p>
                  <p>
                    <strong>Emri:</strong> {u.emri || '-'}
                  </p>
                  <p>
                    <strong>Roli:</strong>{' '}
                    <span
                      className={
                        u.roli === 'PRONAR' || u.roli === 'MENAXHER'
                          ? 'text-green-600 font-bold'
                          : 'text-red-600'
                      }
                    >
                      "{u.roli || 'NUK KA ROLI'}"
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="font-bold text-yellow-800 mb-2">📋 Çfarë të kontrollosh:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. <strong>Firebase User</strong> duhet të tregojë email-in tënd</li>
            <li>2. <strong>Roli në Context</strong> duhet të jetë saktësisht <code>"PRONAR"</code> ose <code>"MENAXHER"</code></li>
            <li>3. <strong>Document ID</strong> në Firestore duhet të përputhet me UID</li>
            <li>4. Nëse jo → problemi është te roli ose tek UID</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-2">
          <a
            href="/"
            className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium"
          >
            ← Kthehu
          </a>
          <a
            href="/login"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            Shko te Login
          </a>
        </div>
      </div>
    </div>
  );
}