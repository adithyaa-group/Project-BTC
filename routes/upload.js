const express = require("express");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");

const router = express.Router();

// Memory storage (IMPORTANT for Render)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) return res.status(500).json(error);
        res.json({
          url: result.secure_url,
          type: result.resource_type,
        });
      }
    );

    result.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
