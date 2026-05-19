const express = require("express");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const app = express();
const PORT = process.env.PORT || 10000;

// Web root — index.html, assets/, lang/, maps/ all live here
const ROOT = path.join(__dirname);

// Player JSON files live under maps/<world>/live/players.json
const MAPS_ROOT = path.join(__dirname, "maps");

app.use(express.json());

// =======================
// MIME TYPES
// =======================
function mime(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "application/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg")) return "image/jpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".prbm")) return "application/octet-stream";
  return "application/octet-stream";
}

// =======================
// HELPER: write players.json for a given world
// =======================
function writePlayers(worldDir, players, res, label) {
  try {
    if (!Array.isArray(players)) {
      return res.status(400).send("Invalid data: expected an array");
    }

    const formatted = {
      players: players.map(p => ({
        uuid: String(p.uuid || ""),
        name: String(p.name || ""),
        foreign: false,
        position: {
          x: Number(p.x || 0),
          y: Number(p.y || 0),
          z: Number(p.z || 0)
        },
        rotation: {
          pitch: Number(p.pitch || 0),
          yaw: Number(p.yaw || 0),
          roll: 0
        }
      }))
    };

    const outPath = path.join(MAPS_ROOT, worldDir, "live", "players.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(formatted, null, 4));

    console.log(`✔ players.json updated at maps/${worldDir}/live/ (${label})`);
    res.sendStatus(200);
  } catch (err) {
    console.error(`❌ Error writing ${label}:`, err);
    res.status(500).send("Server error");
  }
}

// =======================
// RECEIVE PLAYER DATA — Overworld
// =======================
app.post("/players", (req, res) => {
  writePlayers("world", req.body, res, "overworld");
});

// =======================
// RECEIVE PLAYER DATA — Nether
// =======================
app.post("/nether", (req, res) => {
  writePlayers("world_nether", req.body, res, "nether");
});

// =======================
// RECEIVE PLAYER DATA — The End
// =======================
app.post("/end", (req, res) => {
  writePlayers("world_the_end", req.body, res, "end");
});

// =======================
// STATIC SERVER (GZ SUPPORT)
// =======================
app.get("*", (req, res) => {
  let reqPath = decodeURIComponent(req.path);
  if (reqPath === "/") reqPath = "/index.html";

  const normal = path.join(ROOT, reqPath);
  const gz = normal + ".gz";

  // Safety: prevent directory traversal outside ROOT
  if (!normal.startsWith(ROOT)) {
    return res.status(403).send("Forbidden");
  }

  if (fs.existsSync(normal) && fs.statSync(normal).isFile()) {
    res.type(mime(normal));
    return fs.createReadStream(normal).pipe(res);
  }

  if (fs.existsSync(gz) && fs.statSync(gz).isFile()) {
    res.type(mime(normal));
    return fs.createReadStream(gz).pipe(zlib.createGunzip()).pipe(res);
  }

  res.status(404).send("Not found");
});

// =======================
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
