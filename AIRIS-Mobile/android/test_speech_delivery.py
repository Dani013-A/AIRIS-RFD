import pathlib,subprocess,tempfile
root=pathlib.Path(__file__).resolve().parent
with tempfile.TemporaryDirectory() as directory:
 p=pathlib.Path(directory)
 (p/'test.cpp').write_text(r'''
#include "airis_speech_delivery.h"
#include <cassert>
#include <iostream>
int main(){
 AirisSpeechDelivery speech;
 auto payload=[](int seq){return "{\"utteranceId\":\"speech-"+std::to_string(seq)+"\",\"utteranceSequence\":"+std::to_string(seq)+"}";};
 int first,second;
 assert(speech.begin(payload(1))); speech.attach(&first);
 assert(!speech.begin(payload(1))); // duplicate callback cannot replay speech
 assert(speech.begin(payload(2))); speech.attach(&second); // same text, new logical ID
 assert(speech.complete(&first).empty()); // obsolete coroutine cannot finish newer speech
 assert(!speech.complete(&second).empty());
 assert(speech.complete(&second).empty());
 assert(speech.begin(payload(3))); speech.attach(&first); speech.cancel();
 assert(speech.complete(&first).empty()); // scene detach/exit invalidates old speech
 assert(!speech.begin(payload(2))); // stale delivery after reattachment
 assert(speech.begin(payload(4))); // new retry prompt
 assert(!speech.begin("{}"));
 std::cout<<"NATIVE_SPEECH_DELIVERY_PASS\n";
}
''')
 subprocess.run(['c++','-std=c++17','-I',str(root),str(p/'test.cpp'),'-o',str(p/'test')],check=True)
 subprocess.run([str(p/'test')],check=True)
