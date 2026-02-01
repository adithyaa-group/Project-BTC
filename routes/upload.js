const express = require("express");
const router = express.Router();

const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload route
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileType = req.file.mimetype.startsWith("video")
      ? "video"
      : req.file.mimetype.startsWith("image")
      ? "image"
      : "raw";

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { resource_type: fileType }
    );

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      type: fileType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ✅ Delete route
router.delete("/delete/:public_id/:type", async (req, res) => {
  try {
    const { public_id, type } = req.params;

    await cloudinary.uploader.destroy(public_id, {
      resource_type: type
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// 🔴 THIS LINE WAS MISSING / WRONG EARLIER
module.exports = router;
