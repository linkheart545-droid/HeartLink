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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = require("../model/Chat");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client_1 = __importDefault(require("../util/s3Client"));
const crypto_1 = __importDefault(require("crypto"));
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const randomImageName = () => crypto_1.default.randomBytes(32).toString('hex');
const getChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.params.code;
    const chats = yield Chat_1.Chat.find({ code: code });
    if (!chats) {
        res.status(404).json({ message: "No chats found" });
        return;
    }
    for (const chat of chats) {
        if (chat.attachment && chat.attachment.length > 0) {
            const getObjectParams = {
                Bucket: process.env.BUCKET_NAME,
                Key: chat.attachment
            };
            const command = new client_s3_1.GetObjectCommand(getObjectParams);
            chat.attachment = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
        }
    }
    res.status(200).json(chats);
});
const sendAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        res.status(404).json({ message: "No file uploaded" });
        return;
    }
    try {
        const imageName = randomImageName();
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: imageName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };
        const command = new client_s3_1.PutObjectCommand(params);
        yield s3Client_1.default.send(command);
        res.status(200).json({ imageName });
    }
    catch (error) {
        console.log("Failed to upload image. Error : " + error.message);
        res.status(500).json({
            message: error.message
        });
    }
});
exports.default = {
    getChat,
    sendAttachment
};
