const path = require("path");
const express = require("express");

const app = express();
const DIST_DIR = path.join(__dirname, "./dist");
const HTML_FILE = path.join(__dirname, "index.html");

app.use(express.static(__dirname));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {});