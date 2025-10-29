// ======================================================================
// PROCESOS — Admin único (Firestore nube real + Local + Autosave + Share + Export)
// JS puro (ESM) con imports desde CDN para que funcione sin build.
// 1) Pega este archivo como src/admin.js
// 2) Sustituye firebaseConfig por el de tu proyecto (Firebase Console → SDK config)
// 3) Importa funciones en tu App y conéctalas a tus botones.
// ======================================================================

// <-- EDITA SOLO ESTO: TU CONFIG DE FIREBASE --------------------------------
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};
// ---------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

/* ---------- Constantes ---------- */
export const LSTORE_KEY = "PROCESOS_APP_V2_LOCAL";
export const DEFAULT_DOC_ID = "empresa-tetuan";  // cámbialo si quieres
export const PIN_CODE = "AR4321";                // solo bloqueo de UI (no seguridad)

/* ---------- Firebase init ---------- */
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ---------- Local Storage ---------- */
export function loadFromLocal() {
  try { const raw = localStorage.getItem(LSTORE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
export function saveToLocal(procesos) {
  try { localStorage.setItem(LSTORE_KEY, JSON.stringify(procesos)); } catch {}
}

/* ---------- Firestore (nube real) ---------- */
export async function cloudSave(docId, procesos) {
  const ref = doc(db, "procesos_app", docId);
  await setDoc(ref, { procesos, updatedAt: serverTimestamp() }, { merge: true });
}
export async function cloudLoad(docId) {
  const ref = doc(db, "procesos_app", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.procesos || null;
}

/* ---------- Arranque: nube -> local -> fallback ---------- */
export async function bootstrapState({ fallback = [] } = {}) {
  const urlDoc = new URLSearchParams(location.search).get("doc") || DEFAULT_DOC_ID;

  // 1) intenta nube
  try {
    const fromCloud = await cloudLoad(urlDoc);
    if (fromCloud) { saveToLocal(fromCloud); return { docId: urlDoc, procesos: fromCloud }; }
  } catch (e) { console.warn("[bootstrap] cloudLoad:", e); }

  // 2) intenta local
  const local = loadFromLocal();
  if (local) return { docId: urlDoc, procesos: local };

  // 3) fallback
  saveToLocal(fallback);
  return { docId: urlDoc, procesos: fallback };
}

/* ---------- Autosave con debounce (nube + local) ---------- */
export function createAutoCloudSaver(docId, delayMs = 1200) {
  let t = null;
  return async (procesos) => {
    saveToLocal(procesos);
    if (t) clearTimeout(t);
    t = setTimeout(async () => {
      try { await cloudSave(docId, procesos); } catch {}
    }, delayMs);
  };
}

/* ---------- Enlace compartible al mismo docId ---------- */
export async function copyShareLink(docId) {
  const url = `${location.origin}${location.pathname}?doc=${encodeURIComponent(docId)}`;
  try { await navigator.clipboard.writeText(url); } catch {}
  return url;
}

/* ---------- Export HTML idéntico + ZIP ---------- */
export function downloadCurrentHTML(filename = "PROCESOS_export.html") {
  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export async function downloadZIP(
  htmlName = "PROCESOS_export.html",
  zipName  = "PROCESOS_export.zip"
) {
  const zip = new JSZip();
  zip.file(htmlName, document.documentElement.outerHTML);
  zip.file("LEEME.txt",
`PROCESOS — Export
1) Abre ${htmlName}
2) Candado de edición (UI): ${PIN_CODE}
3) Los cambios se guardan en el navegador.
4) Con Firestore: abre con ?doc=tu-doc-id y pulsa 'Actualizar de nube'.`
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: zipName });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ---------- Helpers de formato (para tu toolbar) ---------- */
export const format = {
  toBullets(text) {
    return text.split("\n").map((l) => {
      let s = l.trimStart();
      if (s.startsWith("- ")) s = s.slice(2);
      const dot = s.indexOf(". ");
      if (dot >= 1 && dot <= 3 && /^\d+$/.test(s.slice(0, dot))) s = s.slice(dot + 2);
      return "- " + s;
    }).join("\n");
  },
  toNumbers(text) {
    return text.split("\n").map((l, i) => {
      let s = l.trimStart();
      if (s.startsWith("- ")) s = s.slice(2);
      const dot = s.indexOf(". ");
      if (dot >= 1 && dot <= 3 && /^\d+$/.test(s.slice(0, dot))) s = s.slice(dot + 2);
      return (i + 1) + ". " + s;
    }).join("\n");
  },
  wrapBold(text, start, end) {
    const sel = text.slice(start, end) || "texto";
    return text.slice(0, start) + "**" + sel + "**" + text.slice(end);
  },
};

/* ---------- Mini tests opcionales ---------- */
export function runAdminSelfTests() {
  const ok = (n, c) => c ? console.log("[admin] OK:", n) : console.error("[admin] FAIL:", n);
  ok("toBullets", format.toBullets("a\n- b\n1. c") === "- a\n- b\n- c");
  ok("toNumbers", format.toNumbers("a\n- b\n2. c") === "1. a\n2. b\n3. c");
  ok("wrapBold",  format.wrapBold("hola mundo", 5, 10) === "hola **mundo**");
}
