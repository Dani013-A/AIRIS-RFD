const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function verifyNativeSpeech(library, record, sources) {
 const markers=['captureId','utteranceId','[AIRIS][SPEECH_ACCEPTED]','[AIRIS][SPEECH_DONE]'];
 if(!markers.every(marker=>library.includes(Buffer.from(marker))))throw new Error('Native speech identity contract is missing; rebuild the exported library.');
 if(!record || record.library_sha256!==hash(library) || Object.entries(sources).some(([key,value])=>record[key]!==hash(value)))throw new Error('Native speech build provenance does not match the current inputs.');
}
if(require.main===module){
 try {
  const android=path.resolve(__dirname,'../android');
  verifyNativeSpeech(fs.readFileSync(path.join(android,'unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so')),
   JSON.parse(fs.readFileSync(path.join(android,'unityLibrary/build/native-release/native-build.json'),'utf8')),{
    assembly_sha256:fs.readFileSync(path.join(android,'unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp')),
    manifest_sha256:fs.readFileSync(path.join(android,'native-build-manifest.json')),
    speech_header_sha256:fs.readFileSync(path.join(android,'airis_speech_delivery.h')),
   });
  process.stdout.write('Native speech contract and build provenance verified\n');
 }catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
module.exports={verifyNativeSpeech};
