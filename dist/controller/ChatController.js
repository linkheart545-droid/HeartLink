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
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client_1 = __importDefault(require("../util/s3Client"));
const crypto_1 = __importDefault(require("crypto"));
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const randomImageName = () => crypto_1.default.randomBytes(32).toString('hex');
const exportChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        res.status(404).send("No file found");
        return;
    }
    try {
        const fileName = req.body.fileName;
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };
        const command = new client_s3_1.PutObjectCommand(params);
        yield s3Client_1.default.send(command);
        res.status(200).json({ message: "Chat exported successfully" });
    }
    catch (error) {
        console.log("Failed to export chat. Error : " + error.message);
        res.status(500).json({
            message: `Failed to export chat`,
            error: error.message
        });
    }
});
const importChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.body.fileName) {
        res.status(404).send("File name empty");
        return;
    }
    try {
        const fileName = req.body.fileName;
        const getObjectParams = {
            Bucket: process.env.BUCKET_NAME,
            Key: fileName
        };
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
        res.status(200).json({ fileUrl: url });
    }
    catch (error) {
        console.log("Failed to import chat. Error : " + error.message);
        res.status(500).json({
            message: `Failed to import chat`,
            error: error.message
        });
    }
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
            message: `Failed to upload image`,
            error: error.message
        });
    }
});
exports.default = {
    sendAttachment,
    exportChat,
    importChat
};
