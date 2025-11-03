"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = __importDefault(require("../controller/UserController"));
const multer_1 = __importDefault(require("../util/multer"));
const router = (0, express_1.Router)();
router.post("/createUser", UserController_1.default.createUser);
router.post("/createProfile", multer_1.default.single('image'), UserController_1.default.createUser);
router.get("/profile/:id", UserController_1.default.getUserDetailsById);
router.post("/verifyUsername/:username", UserController_1.default.verifyUsername);
router.post("/updateCode/:id", UserController_1.default.updateUserCode);
exports.default = router;
