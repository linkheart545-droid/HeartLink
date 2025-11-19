"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FcmToken_1 = require("../model/FcmToken");
const saveToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, token } = req.body;
    if (!userId || !token) {
        res.status(400).json({ message: 'UserId and Token are required' });
        return;
    }
    try {
        yield FcmToken_1.FcmToken.updateOne({ userId: userId }, {
            userId,
            token,
            lastActive: new Date(),
        }, { upsert: true } // create if not exists, else update
        );
        res.status(200).json({ message: 'Token saved' });
    }
    catch (err) {
        console.error('Error saving push token', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
});
exports.default = {
    saveToken
};
