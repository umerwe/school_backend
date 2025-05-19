// multerConfig.js
import multer from "multer";

<<<<<<< HEAD
let storage;

if (process.env.CORS_ORIGIN_LOCAL) {
  // Local environment: Save to disk
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  });
} else if (process.env.CORS_ORIGIN_PROD) {
  // Production environment: Save in memory
  storage = multer.memoryStorage();
} else {
  // Default fallback (optional)
  throw new Error("Neither CORS_ORIGIN_LOCAL nor CORS_ORIGIN_PROD is defined");
}
=======
// Store file in memory buffer instead of file system
const storage = multer.memoryStorage();
>>>>>>> 98951066e687ddfd8cd01357e20478a3bf0c83bb

export const upload = multer({ storage });
