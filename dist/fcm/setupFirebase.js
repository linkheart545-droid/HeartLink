"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFirebase = setupFirebase;
exports.getMessaging = getMessaging;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_config_json_1 = __importDefault(require("./firebase.config.json"));
function setupFirebase() {
    if (firebase_admin_1.default.apps.length === 0) {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(firebase_config_json_1.default),
        });
        console.log("Firebase initialized with project:", firebase_config_json_1.default.project_id);
    }
    else {
        console.log("Firebase already initialized");
    }
    return firebase_admin_1.default;
}
function getMessaging() {
    return setupFirebase().messaging();
}
