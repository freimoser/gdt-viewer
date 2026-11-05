// Checks every sample in beispiele/ with the viewer's own validator (node tools/check_samples.js).
// Correct samples must have no findings; the "mit-fehlern" sample must have errors.
const fs = require("fs");
const path = require("path");
const core = require("../gdt-core.js");

const dir = path.join(__dirname, "..", "beispiele");
let failed = false;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".gdt")).sort()) {
  const decoded = core.decode(fs.readFileSync(path.join(dir, file)));
  const result = core.validate(core.parse(decoded.text, decoded.charset), decoded);
  const expectErrors = file.includes("mit-fehlern");
  const errors = result.issues.filter((i) => i.level === "error").length;
  const ok = expectErrors ? errors > 0 : result.issues.length === 0;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${file} · ${core.CHARSET_NAMES[decoded.charset]} · ${result.issues.length} Befunde`);
  for (const i of result.issues) console.log(`       ${i.level} Z${i.line ?? "-"}: ${i.message}`);
}
process.exit(failed ? 1 : 0);
