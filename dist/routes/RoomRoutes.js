"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RoomController_1 = __importDefault(require("../controller/RoomController"));
const router = (0, express_1.Router)();
router.get("/generateCode", RoomController_1.default.generateCode);
router.post("/leaveRoom", RoomController_1.default.leaveRoom);
exports.default = router;
