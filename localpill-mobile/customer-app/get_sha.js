const cp = require('child_process');
try {
    const out = cp.execSync('"C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot\\bin\\keytool.exe" -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android').toString();
    const sha1Match = out.match(/SHA1:\s*([0-9A-F:]+)/);
    const sha256Match = out.match(/SHA256:\s*([0-9A-F:]+)/);
    console.log('--- FINGERPRINTS ---');
    console.log('SHA1:   ' + (sha1Match ? sha1Match[1] : 'NOT FOUND'));
    console.log('SHA256: ' + (sha256Match ? sha256Match[1] : 'NOT FOUND'));
    console.log('--------------------');
} catch (e) {
    console.error(e.message);
}
