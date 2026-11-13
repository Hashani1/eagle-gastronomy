// app/api/super-admin/aktivizo-biznes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/admin';

export async function POST(req: NextRequest) {
  try {
    const { tenantId, plani, dataSkadimit } = await req.json();

    if (!tenantId || !plani) {
      return NextResponse.json({ gabim: 'Plotëso planin' }, { status: 400 });
    }

    const db = getAdminFirestore();

    const data: any = {
      plani,
      aktiv: true,
    };

    if (dataSkadimit) {
      data.dataSkadimit = new Date(dataSkadimit);
    }

    await db.collection('tenants').doc(tenantId).update(data);

    return NextResponse.json({ sukses: true, mesazh: 'Biznesi u aktivizua!' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { gabim: err.message || 'Gabim i panjohur' },
      { status: 500 }
    );
  }
}