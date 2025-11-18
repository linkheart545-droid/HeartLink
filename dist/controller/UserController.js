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
const User_1 = require("../model/User");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = __importDefault(require("crypto"));
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client_1 = __importDefault(require("../util/s3Client"));
const Room_1 = require("../model/Room");
// Image Name Generator
const randomImageName = () => crypto_1.default.randomBytes(32).toString('hex');
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Proceed with user creation
        const email = req.body.email;
        if (!email) {
            res.status(400).json({ error: "Email is missing" });
            return;
        }
        const userA = yield User_1.User.findOne({ email: email });
        if (userA) {
            res.status(200).json(userA);
            return;
        }
        // Count the existing users to assign a new ID
        const count = yield User_1.User.countDocuments({}, { hint: "_id_" });
        // Create a new user
        const user = new User_1.User({
            id: count + 1,
            email: email,
            username: "",
            profileImageUrl: "",
            name: "",
            gender: "",
            code: ""
        });
        // Save the user to the database
        const createdUser = yield user.save();
        // Respond with the newly created user
        res.status(201).json(createdUser);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create user", details: error.message });
    }
});
const createProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Proceed with user creation
        const { email, username, name, gender } = req.body;
        const user = yield User_1.User.findOne({ email: email });
        if (!user) {
            res.status(404).json({ error: "User with email does not exist" });
            return;
        }
        let imageName = "";
        if (req.file) {
            try {
                imageName = randomImageName();
                const params = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: imageName,
                    Body: req.file.buffer,
                    ContentType: req.file.mimetype
                };
                const command = new client_s3_1.PutObjectCommand(params);
                yield s3Client_1.default.send(command);
            }
            catch (error) {
                console.log("Failed to upload image. Error : " + error.message);
            }
        }
        user.profileImageUrl = imageName;
        user.username = username;
        user.name = name;
        user.gender = gender;
        // Save the user to the database
        const savedUser = yield user.save();
        // Respond with the newly created user
        res.status(200).json(savedUser);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create profile", details: error.message });
    }
});
const getUserDetailsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Proceed with user creation
        const id = req.params.id;
        const user = yield User_1.User.findOne({ id: id });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        if (user.profileImageUrl != "") {
            const getObjectParams = {
                Bucket: process.env.BUCKET_NAME,
                Key: user.profileImageUrl
            };
            const command = new client_s3_1.GetObjectCommand(getObjectParams);
            user.profileImageUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
        }
        // Respond with the fetched user
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
});
const verifyUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if username already exists for any user
    try {
        const username = req.params.username;
        if (!username) {
            res.status(400).json({ error: "Username not present" });
            return;
        }
        const exists = yield User_1.User.exists({ username: username });
        if (exists) {
            res.status(409).json({ error: "Username is taken" });
            return;
        }
        // Respond with the fetched user
        res.status(200).json({ message: "Username available" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to verify username", details: error.message });
    }
});
const getUsersByCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        const room = yield Room_1.Room.exists({ code: code });
        if (!room) {
            res.status(404).json({ error: "Room not found" });
            return;
        }
        const users = yield User_1.User.find({ code: code });
        if (!users || users.length == 0) {
            res.status(404).json({ error: "No user found for given code" });
            return;
        }
        for (const user of users) {
            if (user.profileImageUrl != '') {
                const getObjectParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: user.profileImageUrl
                };
                const command = new client_s3_1.GetObjectCommand(getObjectParams);
                user.profileImageUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
            }
        }
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ message: "Unable to leave room", error: error.message });
    }
});
exports.default = {
    createUser,
    createProfile,
    getUserDetailsById,
    verifyUsername,
    getUsersByCode
};
