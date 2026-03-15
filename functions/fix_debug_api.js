const fs = require('fs');
const content = fs.readFileSync('index.js', 'utf8');
const reqsRepl = `exports.debugMatchingLog = functions.https.onCall(async (data, context) => {
  const snap = await db.collection("matchingLogs").orderBy("timestamp", "desc").limit(1).get();
  if (snap.empty) return { log: null };
  return { log: snap.docs[0].data() };
});
`;
const newContent = content.replace(/exports\.debugMatchingLog = functions\.https\.onCall\([\s\S]*?\}\);/, reqsRepl);
fs.writeFileSync('index.js', newContent);
