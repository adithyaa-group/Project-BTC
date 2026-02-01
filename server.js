require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const File = require("./models/File");

const app = express();
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({});
const upload = multer({ storage });

/* UPLOAD */
app.post("/upload", upload.single("file"), async (req, res) => {
  const result = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "auto"
  });

  const file = await File.create({
    title: req.body.title,
    type: result.resource_type,
    url: result.secure_url,
    public_id: result.public_id
  });

  res.json(file);
});

/* FETCH FILES */
app.get("/files", async (req, res) => {
  const files = await File.find().sort({ createdAt: -1 });
  res.json(files);
});

/* DELETE FILE */
app.delete("/files/:id", async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) return res.status(404).json({ msg: "Not found" });

  await cloudinary.uploader.destroy(file.public_id, {
    resource_type: file.type
  });

  await file.deleteOne();
  res.json({ success: true });
});

app.listen(process.env.PORT, () =>
  console.log("🚀 Server running")
);
