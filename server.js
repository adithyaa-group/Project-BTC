require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ---------------- CLOUDINARY ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------- MONGODB ---------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

const FileSchema = new mongoose.Schema({
  title: String,
  url: String,
  public_id: String,
  type: String,
});

const File = mongoose.model("File", FileSchema);

/* ---------------- MULTER ---------------- */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ---------------- ROUTES ---------------- */

// Upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { resource_type: "auto" }
    );

    const saved = await File.create({
      title: req.body.title,
      url: result.secure_url,
      public_id: result.public_id,
      type: result.resource_type,
    });

    res.json(saved);
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get all files
app.get("/files", async (req, res) => {
  const files = await File.find().sort({ _id: -1 });
  res.json(files);
});

// Delete
app.delete("/files/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).end();

    await cloudinary.uploader.destroy(file.public_id, {
      resource_type: file.type,
    });

    await file.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ---------------- START ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 BTC Stream running on port ${PORT}`)
);
