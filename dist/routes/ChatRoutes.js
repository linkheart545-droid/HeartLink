"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ChatController_1 = __importDefault(require("../controller/ChatController"));
const multer_1 = __importDefault(require("../util/multer"));
const router = (0, express_1.Router)();
router.post('/sendAttachment', multer_1.default.single('image'), ChatController_1.default.sendAttachment);
router.post('/export', multer_1.default.single('file'), ChatController_1.default.exportChat);
router.post('/import', ChatController_1.default.importChat);
exports.default = router;
