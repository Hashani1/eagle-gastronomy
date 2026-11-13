// lib/admin.ts
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminApp(): admin.app.App {
  if (app) return app;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT nuk është konfiguruar në .env.local!'
    );
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (!admin.apps.length) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    app = admin.app();
  }

  return app;
}

export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}