'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TestFirebase() {
  const [statusi, setStatusi] = useState('Duke u lidhur...');
  const [numriPorosive, setNumriPorosive] = useState(0);

  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, 'tenants', 'demo-tenant', 'orders'),
        (snap) => {
          setStatusi('✅ Lidhja me Firebase PUNON!');
          setNumriPorosive(snap.size);
        },
        (err) => {
          setStatusi('❌ Gabim: ' + err.message);
        }
      );
      return () => unsub();
    } catch (err: any) {
      setStatusi('❌ Gabim: ' + err.message);
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Firebase</h1>
      <p className="text-lg mb-2">{statusi}</p>
      <p className="text-gray-600">Porosi në Firestore: {numriPorosive}</p>
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-700">
          Nëse sheh "✅ Lidhja me Firebase PUNON!" — gjithçka është e saktë.
        </p>
      </div>
    </div>
  );
}