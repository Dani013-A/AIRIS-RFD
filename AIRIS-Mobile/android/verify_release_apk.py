"""Fail closed unless the standalone APK embeds this run's rebuilt Unity library."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import zipfile

apk = Path(sys.argv[1]).resolve()
android = Path(__file__).resolve().parent
sdk = Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
tools = sdk / 'build-tools/36.0.0'
signature = subprocess.check_output([str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)], text=True)
expected = '5e8f16062ea3cd2c4a0d547876baa6f38cabf625'
assert f'Signer #1 certificate SHA-1 digest: {expected}' in signature, 'Wrong signing identity'
badging = subprocess.check_output([str(tools / 'aapt'), 'dump', 'badging', str(apk)], text=True)
assert "package: name='com.airis.mobile'" in badging, 'Wrong package'
assert 'application-debuggable' not in badging, 'Debuggable APK'
native = json.loads((android / 'unityLibrary/build/native-release/native-build.json').read_text())
with zipfile.ZipFile(apk) as archive:
    bundle = archive.read('assets/index.android.bundle')
    assert b'https://18-143-33-249.sslip.io' in bundle, 'Production API missing'
    library = archive.read('lib/arm64-v8a/libil2cpp.so')
    assert hashlib.sha256(library).hexdigest() == native['library_sha256'], 'Stale or altered Unity library'
    assert archive.getinfo('lib/arm64-v8a/libunity.so').file_size > 0, 'Unity missing'
record = {
    'apk_sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
    'size': apk.stat().st_size,
    'package': 'com.airis.mobile',
    'signer_sha1': expected,
    'api': 'https://18-143-33-249.sslip.io',
    'source_commit': os.environ.get('GITHUB_SHA', subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()),
    **native,
}
apk.with_suffix('.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
print('Standalone release artifact verified')
