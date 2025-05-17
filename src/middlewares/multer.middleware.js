// multerConfig.js
import multer from "multer";

// Store file in memory buffer instead of file system
const storage = multer.memoryStorage();

export const upload = multer({ storage });
