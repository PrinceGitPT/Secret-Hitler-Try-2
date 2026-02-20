const fs = require("node:fs");
const path = require("node:path");

const nextDir = path.join(process.cwd(), ".next");

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

fs.rmSync(nextDir, { recursive: true, force: true });
console.log("Cleared .next cache/build artifacts.");
