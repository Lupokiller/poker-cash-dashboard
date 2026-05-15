import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve(process.cwd(), 'package.json');
const runId = `pre-fix-${Date.now()}`;

const sendLog = (hypothesisId, location, message, data) => {
  // #region agent log
  fetch('http://127.0.0.1:7580/ingest/3e01d4d2-a1f2-459a-883b-7a72019fbf62',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8c3db3'},body:JSON.stringify({sessionId:'8c3db3',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
};

const raw = fs.readFileSync(filePath);
sendLog('H1', 'scripts/debug-package-json.mjs:14', 'Raw file metadata', { byteLength: raw.length, first3: Array.from(raw.slice(0, 3)) });

const asUtf8 = raw.toString('utf8');
sendLog('H2', 'scripts/debug-package-json.mjs:17', 'First visible char code', { firstCharCode: asUtf8.charCodeAt(0), firstChar: asUtf8[0] });

const trimmed = asUtf8.trimStart();
sendLog('H3', 'scripts/debug-package-json.mjs:20', 'After trimStart char code', { firstCharCode: trimmed.charCodeAt(0), firstChar: trimmed[0] });

try {
  JSON.parse(asUtf8);
  sendLog('H4', 'scripts/debug-package-json.mjs:24', 'JSON.parse raw succeeded', { ok: true });
} catch (error) {
  sendLog('H4', 'scripts/debug-package-json.mjs:26', 'JSON.parse raw failed', { ok: false, error: String(error).slice(0, 180) });
}

try {
  JSON.parse(trimmed);
  sendLog('H5', 'scripts/debug-package-json.mjs:32', 'JSON.parse trimmed succeeded', { ok: true });
} catch (error) {
  sendLog('H5', 'scripts/debug-package-json.mjs:34', 'JSON.parse trimmed failed', { ok: false, error: String(error).slice(0, 180) });
}
