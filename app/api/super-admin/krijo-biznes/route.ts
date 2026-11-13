// app/api/super-admin/krijo-biznes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emriKafenes, emriPronar, email, fjalekalim, plani } = body;

    if (!emriKafenes || !emriPronar || !email || !fjalekalim) {
      return NextResponse.json(
        { gabim: 'Plotëso të gjitha fushat' },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();

    const userRecord = await auth.createUser({
      email: email.toLowerCase().trim(),
      password: fjalekalim,
      displayName: emriPronar,
    });

    const uid = userRecord.uid;

    const tenantRef = db.collection('tenants').doc();
    const tenantId = tenantRef.id;

    await tenantRef.set({
      emri: emriKafenes,
      pronarId: uid,
      krijuar: new Date(),
      plani: plani || 'PREMIUM',
      aktiv: true,
    });

    await db.collection('users').doc(uid).set({
      emri: emriPronar,
      email: email.toLowerCase().trim(),
      roli: 'PRONAR',
      tenantId: tenantId,
      krijuar: new Date(),
    });

    const zoneRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('zones')
      .doc();
    await zoneRef.set({
      emri: 'Salla Kryesore',
      krijuar: new Date(),
    });

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('tables')
      .doc()
      .set({
        emri: 'Tavolina 1',
        karrige: 4,
        statusi: 'E_LIRË',
        pozX: 60,
        pozY: 60,
        zoneId: zoneRef.id,
        krijuar: new Date(),
      });

    const produkteFillestare = [
      { emri: 'Espresso', çmimi: 150, kategoria: 'Kafe', stacioni: 'BAR' },
      { emri: 'Kapuçino', çmimi: 200, kategoria: 'Kafe', stacioni: 'BAR' },
      { emri: 'Coca-Cola', çmimi: 200, kategoria: 'Pije', stacioni: 'BAR' },
      { emri: 'Pizza Margarita', çmimi: 600, kategoria: 'Ushqim', stacioni: 'KUZHINË' },
    ];

    for (const p of produkteFillestare) {
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('products')
        .doc()
        .set({ ...p, krijuar: new Date() });
    }

    return NextResponse.json({
      sukses: true,
      tenantId,
      pronarId: uid,
      mesazh: `Biznesi "${emriKafenes}" u krijua me sukses!`,
    });
  } catch (err: any) {
    console.error('Gabim gjatë krijimit të biznesit:', err);
    if (err.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { gabim: 'Ky email është i regjistruar më parë' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { gabim: err.message || 'Gabim i panjohur' },
      { status: 500 }
    );
  }
}