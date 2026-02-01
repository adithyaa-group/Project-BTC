const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  title: String,
  type: String,
  url: String,
  public_id: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("File", fileSchema);
