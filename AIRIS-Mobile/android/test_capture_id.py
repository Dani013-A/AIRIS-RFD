"""Compile the production capture-ID serializer with minimal managed-string stubs."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

source = (Path(__file__).parent / 'unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp').read_text()
start = source.index('#include <cstdio>\nstatic unsigned long long s_AirisCaptureId')
end = source.index('static bool IsOneOnOneScene()', start)
helper = source[start:end]
stubs = r'''
#include <string>
#include <iostream>
struct String_t { std::string value; };
int String_get_Length_m42625D67623FA5CC7A44D47425CE86FB946542D2_inline(String_t* value, void*) { return value->value.size(); }
String_t* String_Substring_mB1D94F47935D22E130FF2C01DBB6A4135FBB76CE(String_t* value, int start, int length, void*) { return new String_t{value->value.substr(start, length)}; }
String_t* il2cpp_string_new(const char* value) { return new String_t{value}; }
String_t* String_Concat_m9E3155FB84015C823606188F53B47CB44C444991(String_t* a, String_t* b, void*) { return new String_t{a->value+b->value}; }
'''
main = r'''
int main() {
 s_AirisCaptureId = 7;
 String_t empty{"{}"};
 String_t transcript{u8"{\"transcript\":\"A synthetic response: こんにちは\"}"};
 std::cout << WithAirisCaptureId(&empty)->value << "\n";
 std::cout << WithAirisCaptureId(&transcript)->value << "\n";
}
'''
compiler = shutil.which('clang++') or shutil.which('c++')
if not compiler:
    raise RuntimeError('A host C++ compiler is required')
with tempfile.TemporaryDirectory(prefix='airis-capture-test-') as folder:
    cpp = Path(folder) / 'capture.cpp'
    binary = Path(folder) / 'capture'
    cpp.write_text(stubs + helper + main)
    subprocess.run([compiler, '-std=c++17', str(cpp), '-o', str(binary)], check=True)
    empty, transcript = map(json.loads, subprocess.check_output([str(binary)], text=True).splitlines())
    assert empty == {'captureId': 7}
    assert transcript == {'transcript': 'A synthetic response: こんにちは', 'captureId': 7}
print('Production capture-ID JSON serialization passed for empty and Unicode payloads')
