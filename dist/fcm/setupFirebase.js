"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFirebase = setupFirebase;
exports.getMessaging = getMessaging;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const dotenv_1 = __importDefault(require("dotenv"));
let app = null;
dotenv_1.default.config();
function setupFirebase() {
    if (!app) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (!projectId || !clientEmail || !privateKey) {
            throw new Error("Missing Firebase service account env vars");
        }
        // If you store the key in .env with literal \n, fix them:
        privateKey = privateKey.replace(/\\n/g, '\n');
        app = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log("Firebase initialized for project:", projectId);
    }
    return firebase_admin_1.default;
}
function getMessaging() {
    return setupFirebase().messaging();
}
