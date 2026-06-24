const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targetRoot = fs.existsSync(path.join(root, "dist")) ? path.join(root, "dist") : root;
const htmlFiles = fs.readdirSync(targetRoot).filter((file) => file.endsWith(".html"));
const failures = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(targetRoot, file), "utf8");
  const refs = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((ref) => {
      if (ref.startsWith("#")) return false;
      if (/^(https?:|mailto:|tel:|data:)/.test(ref)) return false;
      return true;
    });

  for (const ref of refs) {
    const clean = ref.split("#")[0].split("?")[0];
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(path.join(targetRoot, file)), clean);
    if (!resolved.startsWith(targetRoot)) {
      failures.push(`${file}: blocked external path ${ref}`);
      continue;
    }
    if (!fs.existsSync(resolved)) failures.push(`${file}: missing ${ref}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML files. All local links are valid.`);
