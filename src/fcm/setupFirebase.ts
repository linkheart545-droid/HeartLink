import admin from "firebase-admin";
import dotenv from 'dotenv'

let app: admin.app.App | null = null;
dotenv.config()

export function setupFirebase() {
    if (!app) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error("Missing Firebase service account env vars");
        }

        // If you store the key in .env with literal \n, fix them:
        privateKey = privateKey.replace(/\\n/g, '\n');

        app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });

        console.log("Firebase initialized for project:", projectId);
    }

    return admin;
}

export function getMessaging(): admin.messaging.Messaging {
    return setupFirebase().messaging();
}