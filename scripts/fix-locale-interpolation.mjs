import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Native language names — keep identical in every locale file for the picker. */
const LANG_LABELS = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  ta: "தமிழ்",
  bn: "বাংলা",
};

const PATCHES = {
  hi: {
    "nav.links.explore": "अन्वेषण",
    "nav.signIn": "साइन इन",
    "nav.links.squads": "स्क्वाड",
    "nav.language.current": "भाषा: {{label}}",
    "explore.subtitle": "{{count}} अवसर उपलब्ध हैं",
    "explore.card.spotsLeft": "{{count}} स्थान शेष",
    "explore.card.viewDetailsAria": "{{title}} के विवरण देखें",
    "community.trendingPostCount": "{{posts}} पोस्ट",
    "footer.copyright": "© {{year}} SocioSquad. सर्वाधिकार सुरक्षित।",
    "schedule.moreEvents": "+{{count}} और",
    "leaderboard.levelShort": "Lv.{{level}}",
    "home.cause.explore": "{{cause}} अन्वेषण करें",
  },
  mr: {
    "nav.language.current": "भाषा: {{label}}",
    "explore.subtitle": "{{count}} संधी उपलब्ध आहेत",
    "explore.card.spotsLeft": "{{count}} जागा शिल्लक",
    "explore.card.viewDetailsAria": "{{title}} तपशील पहा",
    "community.trendingPostCount": "{{posts}} पोस्ट",
    "footer.copyright": "© {{year}} SocioSquad. सर्व हक्क राखीव.",
    "schedule.moreEvents": "+{{count}} अधिक",
    "leaderboard.levelShort": "Lv.{{level}}",
    "home.cause.explore": "{{cause}} एक्सप्लोर करा",
  },
  ta: {
    "nav.language.current": "மொழி: {{label}}",
    "explore.subtitle": "{{count}} வாய்ப்புகள் கிடைக்கின்றன",
    "explore.card.spotsLeft": "{{count}} இடங்கள் மீதம்",
    "explore.card.viewDetailsAria": "{{title}} விவரங்களைக் காண்க",
    "community.trendingPostCount": "{{posts}} இடுகைகள்",
    "footer.copyright": "© {{year}} SocioSquad. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
    "schedule.moreEvents": "+{{count}} மேலும்",
    "leaderboard.levelShort": "Lv.{{level}}",
    "home.cause.explore": "{{cause}} ஐ ஆராயுங்கள்",
  },
  bn: {
    "nav.language.current": "ভাষা: {{label}}",
    "explore.subtitle": "{{count}}টি সুযোগ উপলব্ধ",
    "explore.card.spotsLeft": "{{count}}টি সিট বাকি",
    "explore.card.viewDetailsAria": "{{title}}-এর বিবরণ দেখুন",
    "community.trendingPostCount": "{{posts}}টি পোস্ট",
    "footer.copyright": "© {{year}} SocioSquad. সর্বস্বত্ব সংরক্ষিত।",
    "schedule.moreEvents": "+{{count}} আরও",
    "leaderboard.levelShort": "Lv.{{level}}",
    "home.cause.explore": "{{cause}} অন্বেষণ করুন",
  },
};

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

for (const code of ["hi", "mr", "ta", "bn"]) {
  const fp = path.join(root, `src/locales/${code}.json`);
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  data.nav.language = {
    ...data.nav.language,
    buttonAria: data.nav.language?.buttonAria,
    current: PATCHES[code]["nav.language.current"] ?? data.nav.language?.current,
    en: LANG_LABELS.en,
    hi: LANG_LABELS.hi,
    mr: LANG_LABELS.mr,
    ta: LANG_LABELS.ta,
    bn: LANG_LABELS.bn,
  };
  const patch = PATCHES[code];
  for (const [k, v] of Object.entries(patch)) {
    if (k === "nav.language.current") continue;
    setPath(data, k, v);
  }
  delete data.language;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Patched", code);
}
