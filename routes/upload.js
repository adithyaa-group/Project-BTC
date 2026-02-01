const express = require("express");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");

const router = express.Router();

// Multer memory storage (Render-safe)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// UPLOAD ROUTE
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) {
          return res.status(500).json({ success: false });
        }

        res.json({
          url: result.secure_url,
          type: result.resource_type,
          public_id: result.public_id
        });
      }
    );

    stream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// DELETE ROUTE
router.delete("/delete/:public_id", async (req, res) => {
  try {
    await cloudinary.uploader.destroy(req.params.public_id, {
      resource_type: "auto"
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
