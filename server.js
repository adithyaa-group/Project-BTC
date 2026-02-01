require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* Middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Serve frontend */
app.use(express.static(path.join(__dirname, "public")));

/* ✅ CORRECT ROUTE IMPORT */
const uploadRoutes = require("./routes/upload");
app.use("/api", uploadRoutes);

/* Pages */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* Health check */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* Start server */
app.listen(PORT, () => {
  console.log(`🚀 BTC Stream running on port ${PORT}`);
});
