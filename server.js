require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ IMPORTANT: correct import
const uploadRoutes = require("./upload");

// ✅ API routes
app.use("/api", uploadRoutes);

// ✅ Serve frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
