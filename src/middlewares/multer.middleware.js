// multerConfig.js
import multer from "multer";

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

export const upload = multer({ storage });
