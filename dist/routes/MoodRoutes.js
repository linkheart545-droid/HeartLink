"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MoodController_1 = __importDefault(require("../controller/MoodController"));
const router = (0, express_1.Router)();
router.post("/all", MoodController_1.default.getPastMoodsList);
router.get("/last/:id", MoodController_1.default.getLastMood);
router.post("/send", MoodController_1.default.sendMood);
exports.default = router;
