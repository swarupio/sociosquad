import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const LANGS = ["hi", "mr", "ta", "bn"];

function collectStrings(obj, out = new Set()) {
  if (typeof obj === "string") out.add(obj);
  else if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const v of Object.values(obj)) collectStrings(v, out);
  }
  return out;
}

function applyMap(obj, map) {
  if (typeof obj === "string") return map.get(obj) ?? obj;
  if (Array.isArray(obj)) return obj.map((x) => applyMap(x, map));
  if (obj && typeof obj === "object") {
    const next = {};
    for (const [k, v] of Object.entries(obj)) next[k] = applyMap(v, map);
    return next;
  }
  return obj;
}

function shouldTranslate(s) {
  if (typeof s !== "string" || !s.trim()) return false;
  if (s.includes("{{")) return false;
  if (/^https?:\/\//i.test(s)) return false;
  return true;
}

async function translateOne(text, target) {
  const enc = encodeURIComponent(text);
  const url = `https://lingva.ml/api/v1/en/${target}/${enc}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${target}: HTTP ${res.status} for ${text.slice(0, 40)}…`);
  const data = await res.json();
  if (typeof data.translation !== "string") throw new Error(`Bad payload for ${text.slice(0, 40)}`);
  return data.translation;
}

const en = JSON.parse(fs.readFileSync(path.join(root, "src/locales/en.json"), "utf8"));
const uniq = [...collectStrings(en)].filter(shouldTranslate);
uniq.sort((a, b) => b.length - a.length);

for (const lang of LANGS) {
  const map = new Map();
  let i = 0;
  for (const s of uniq) {
    i += 1;
    process.stdout.write(`\r${lang} ${i}/${uniq.length} `);
    try {
      const tr = await translateOne(s, lang);
      map.set(s, tr);
    } catch (e) {
      console.error(`\n${lang} failed on: ${s.slice(0, 80)}`, e.message);
      map.set(s, s);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  const out = applyMap(en, map);
  fs.writeFileSync(path.join(root, `src/locales/${lang}.json`), JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${lang}.json`);
}
