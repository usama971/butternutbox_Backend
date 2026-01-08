
// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("cloudinary").v2;

// cloudinary.config({
//   cloud_name: process.env.cloud_name,
//   api_key: process.env.api_key,
//   api_secret: process.env.api_secret,
// });

// // --- Multer-Cloudinary Storage ---
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "butterNutBox",
//     resource_type: "image",
//   },
// });

// // --- Multer Config ---
// const upload = multer({
//   storage,
//   limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
//   fileFilter: (req, file, cb) => {
//     const allowedMimeTypes = [
//       "image/jpeg",
//       "image/png",
//       "image/webp",
//       "image/jpg",
//     ];

//     if (!allowedMimeTypes.includes(file.mimetype)) {
//       return cb(
//         new Error("Invalid file type. Only JPG, PNG, WEBP images are allowed"),
//         false
//       );
//     }

//     cb(null, true);
//   },
// });

// module.exports = upload;


const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

// Multer memory storage (REQUIRED for free hosting)
const storage = multer.memoryStorage();

const upload = multer({
  
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error("Invalid file type. Only JPG, PNG, WEBP images are allowed"),
        false
      );
    }
    cb(null, true);
  },
});

// Helper upload function
const uploadToCloudinary = (buffer, folder = "butterNutBox") => {
  console.log("Uploading to Cloudinary with buffer size:", buffer?.length);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

module.exports = { upload, uploadToCloudinary };

