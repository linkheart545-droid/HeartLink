import admin from "firebase-admin"
import serviceAccount from './firebase.config.json'

export function setupFirebase() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
        console.log("Firebase initialized with project:", (serviceAccount as any).project_id);
    } else {
        console.log("Firebase already initialized");
    }
    return admin;
}

export function getMessaging(): admin.messaging.Messaging {
    return setupFirebase().messaging();
}
