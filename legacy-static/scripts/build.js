const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const htmlFiles = [
  "index.html",
  "schedule.html",
  "event-detail.html",
  "login.html",
  "signup.html",
  "quote.html",
];

const staticFiles = ["dev-server.js"];

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(root, filename);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function mkdir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFile(source, target) {
  mkdir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  mkdir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

function injectRuntimeScripts(html) {
  const snippet = [
    '<script src="assets/env.js"></script>',
    '<script src="assets/supabase-app.js"></script>',
  ].join("\n  ");

  if (html.includes("assets/supabase-app.js")) return html;
  return html.replace("</body>", `  ${snippet}\n</body>`);
}

loadLocalEnv();
rm(dist);
mkdir(dist);

for (const file of htmlFiles) {
  const source = path.join(root, file);
  const target = path.join(dist, file);
  const html = fs.readFileSync(source, "utf8");
  fs.writeFileSync(target, injectRuntimeScripts(html), "utf8");
}

copyDir(path.join(root, "assets"), path.join(dist, "assets"));
for (const file of staticFiles) copyFile(path.join(root, file), path.join(dist, file));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const envJs = `window.ILV_CONFIG = ${JSON.stringify({
  supabaseUrl,
  supabaseAnonKey,
})};\n`;
fs.writeFileSync(path.join(dist, "assets", "env.js"), envJs, "utf8");

console.log(`Built ${htmlFiles.length} pages into ${path.relative(root, dist)}`);
