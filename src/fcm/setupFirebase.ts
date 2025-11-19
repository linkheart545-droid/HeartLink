import admin from "firebase-admin"
import serviceAccount from './firebase.config.json'

// initialize only once (useful with hot reload)
export function setupFirebase() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
    }
    return admin;
}

export function getMessaging(): admin.messaging.Messaging {
    return setupFirebase().messaging();
}