// app/api/super-admin/krijo-staf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, emri, email, fjalekalim, roli, pin, pagaPërOrë } = body;

    if (!tenantId || !emri || !email || !fjalekalim || !roli || !pin) {
      return NextResponse.json(
        { gabim: 'Plotëso të gjitha fushat' },
        { status: 400 }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { gabim: 'PIN-i duhet të jetë 4 shifror' },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();

    const pinCheck = await db.collection('users').where('pin', '==', pin).get();
    if (!pinCheck.empty) {
      return NextResponse.json(
        {
          gabim:
            'Ky PIN është i përdorur nga një përdorues tjetër. Zgjidh një PIN tjetër.',
        },
        { status: 400 }
      );
    }

    const userRecord = await auth.createUser({
      email: email.toLowerCase().trim(),
      password: fjalekalim,
      displayName: emri,
    });

    const uid = userRecord.uid;

    await db.collection('users').doc(uid).set({
      emri,
      email: email.toLowerCase().trim(),
      roli,
      tenantId,
      pin: pin,
      pagaPërOrë: parseFloat(pagaPërOrë) || 0,
      aktiv: true,
      krijuar: new Date(),
    });

    return NextResponse.json({
      sukses: true,
      uid,
      mesazh: `${emri} u shtua me sukses!`,
    });
  } catch (err: any) {
    console.error('Gabim gjatë krijimit të stafit:', err);
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