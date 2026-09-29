#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=== 1. Compiling Assembly-CSharp.cpp ==="
./compile_cmd.sh

echo "=== 2. Linking libil2cpp.so ==="
./link_cmd.sh

echo "=== 3. Stripping libil2cpp.so ==="
/Users/danieltan/Library/Android/sdk/ndk/27.2.12479018/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-strip --strip-all /Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/android/unityLibrary/build/il2cpp_arm64-v8a_Release/il2cpp_cache/d8kz/libil2cpp.so -o /Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/android/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so

ls -lh /Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/android/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so
echo "=== Native build SUCCESS ==="
