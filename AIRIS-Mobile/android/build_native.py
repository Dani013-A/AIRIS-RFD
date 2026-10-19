"""Rebuild the exported Unity arm64 library with NDK, without a Unity editor install."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess

ANDROID = Path(__file__).resolve().parent
MANIFEST = ANDROID / 'native-build-manifest.json'
CACHE = ANDROID / 'unityLibrary/build/il2cpp_arm64-v8a_Release/il2cpp_cache'
BUILD = ANDROID / 'unityLibrary/build/native-release'


def main():
    ndk = Path(os.environ['ANDROID_NDK_HOME'])
    host = 'darwin-x86_64' if platform.system() == 'Darwin' else 'linux-x86_64'
    tools = ndk / 'toolchains/llvm/prebuilt' / host / 'bin'
    if not (tools / 'clang++').is_file():
        raise RuntimeError('NDK 27.2.12479018 toolchain is required')
    if '27.2.12479018' not in (ndk / 'source.properties').read_text():
        raise RuntimeError('Unexpected NDK version')
    manifest = json.loads(MANIFEST.read_text())

    def resolve(value):
        value = value.replace('@TOOLS@', str(tools)).replace('@ANDROID@', str(ANDROID))
        return value.replace(str(CACHE), str(BUILD))

    subprocess.run(['python3', str(ANDROID / 'patch_panel_bubbles.py')], check=True)
    for name, content in manifest['generated'].items():
        target = Path(resolve(name))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(resolve(content))

    def compile_unit(unit):
        output = Path(resolve(unit['output']))
        output.parent.mkdir(parents=True, exist_ok=True)
        command = [str(tools / 'clang++')]
        command += [resolve(arg) for arg in manifest['flags'][unit['flags']]]
        command += ['-o', str(output), resolve(unit['source'])]
        subprocess.run(command, cwd=ANDROID, check=True, stdout=subprocess.DEVNULL)

    # Every source is compiled on each release run; no committed .so or old object cache is trusted.
    with concurrent.futures.ThreadPoolExecutor(max_workers=int(os.environ.get('NATIVE_JOBS', '2'))) as pool:
        for index, _ in enumerate(pool.map(compile_unit, manifest['compile']), 1):
            if index % 50 == 0:
                print(f'Compiled {index}/{len(manifest["compile"])}', flush=True)
    for command in manifest['link']:
        subprocess.run([resolve(arg) for arg in command], cwd=ANDROID, check=True)
    library = BUILD / 'd8kz/libil2cpp.so'
    output = ANDROID / 'unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so'
    subprocess.run([str(tools / 'llvm-strip'), '--strip-all', str(library), '-o', str(output)], check=True)
    record = {
        'library_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'assembly_sha256': hashlib.sha256((ANDROID / 'unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp').read_bytes()).hexdigest(),
        'manifest_sha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
        'compiled_units': len(manifest['compile']),
    }
    (BUILD / 'native-build.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record), flush=True)
    print('Native rebuild verified', flush=True)


if __name__ == '__main__':
    main()
