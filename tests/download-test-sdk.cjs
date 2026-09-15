// Only downloads public library code. No app config or database is read.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const SDK_VERSION = '2.116.0';
const SDK_SHA256 = 'fbde52aab1700a3b308087ae78b41fb5192e7a952d81d5d08238763ce3245dd8';
const destination = path.join(__dirname, '../.test-artifacts/supabase.js');
async function main() {
  const response = await fetch(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SDK_VERSION}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`CDN: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== SDK_SHA256) throw new Error('Unexpected SDK checksum; no file written');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  console.log(`Supabase SDK ${SDK_VERSION} verified and saved for offline browser tests.`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { SDK_VERSION, SDK_SHA256, destination };
