"""Persist the RN/Unity utterance identity contract in the exported IL2CPP source."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent
path = root / 'unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp'
source = path.read_text()

def patch_method(name, change):
    global source
    match = list(re.finditer(r'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR [^\n]* '+name+r'[^\n]*\n\{', source))[-1]
    end = source.index('\n// Method Definition Index:', match.end())
    body = source[match.start():end]
    source = source[:match.start()] + change(body) + source[end:]

def once(body, before, after):
    if after in body: return body
    if body.count(before) != 1: raise RuntimeError(f'Speech patch anchor mismatch: {before[:80]}')
    return body.replace(before, after, 1)

include = '#include "airis_speech_delivery.h"\nstatic AirisSpeechDelivery airisSpeech;\n'
if include not in source: source = source.replace('#include <android/log.h>\n', '#include <android/log.h>\n'+include, 1)
helper = '''
static std::string airisSpeechAscii(String_t* value) {
    std::string result;
    if (!value) return result;
    const Il2CppChar* chars = &value->____firstChar;
    for (int i = 0; i < value->____stringLength && i < 65536; ++i)
        result += chars[i] < 128 ? static_cast<char>(chars[i]) : '?';
    return result;
}
'''
if helper not in source:
    anchor = 'struct StringBuilder_t  : public RuntimeObject'
    source = source.replace(anchor, helper+anchor, 1)
prototype = 'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void InterviewerTTSManager_StopSpeaking_m0A1378D41DF442C8A0682437149D50656F04ED34 (InterviewerTTSManager_t46D67B0DE2C195CD1A68B797C5E6032D3F7AEE96* __this, const RuntimeMethod* method);\n'
if prototype not in source:
    marker = 'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UaaLBridge_ReceiveMessage_'
    position = source.rindex(marker)
    source = source[:position] + prototype + source[position:]
stop = 'if (__this->___ttsManager != NULL) InterviewerTTSManager_StopSpeaking_m0A1378D41DF442C8A0682437149D50656F04ED34(__this->___ttsManager, NULL);'
patch_method('UaaLBridge_HandleShowQuestion_', lambda b: once(b, '\n\tstatic bool s_Il2CppMethodInitialized;', '''
    if (!airisSpeech.begin(airisSpeechAscii(___0_payloadJson))) {
        __android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][SPEECH_DROPPED] duplicate or stale delivery");
        return;
    }
    '''+stop+'''
    __android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][SPEECH_ACCEPTED] %s", airisSpeech.payload().c_str());
\tstatic bool s_Il2CppMethodInitialized;'''))
patch_method('UaaLBridge_SpeakThenNotify_', lambda b: once(b, '\n\t\treturn L_4;', '\n        airisSpeech.attach(L_0);\n\t\treturn L_4;'))
patch_method('U3CSpeakThenNotifyU3Ed__30_MoveNext_', lambda b: once(b, '\n\tstatic bool s_Il2CppMethodInitialized;', '\n    if (!airisSpeech.current(__this)) return false;\n\tstatic bool s_Il2CppMethodInitialized;'))
old = 'UaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(L_53, _stringLiteralBB61753A1209E3A30364E5A44031906599736683, _stringLiteral9ED931619E39F59A8520C1E3B03FEA2E9A56FB60, NULL);'
new = '''const std::string speechDone = airisSpeech.complete(__this);
        if (!speechDone.empty()) {
            __android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][SPEECH_DONE] %s", speechDone.c_str());
            UaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(L_53, _stringLiteralBB61753A1209E3A30364E5A44031906599736683, il2cpp_string_new(speechDone.c_str()), NULL);
        }'''
patch_method('U3CSpeakThenNotifyU3Ed__30_MoveNext_', lambda b: once(b, old, new))
# No TTS manager: preserve the existing completion fallback, with the same identity.
old = 'UaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(__this, _stringLiteralBB61753A1209E3A30364E5A44031906599736683, _stringLiteral9ED931619E39F59A8520C1E3B03FEA2E9A56FB60, NULL);'
patch_method('UaaLBridge_HandleShowQuestion_', lambda b: once(b, old, old.replace('_stringLiteral9ED931619E39F59A8520C1E3B03FEA2E9A56FB60', 'il2cpp_string_new(airisSpeech.payload().c_str())')))
patch_method('UaaLBridge_HandleLoadScene_', lambda b: once(b, '\n\tstatic bool s_Il2CppMethodInitialized;', '\n    airisSpeech.cancel();\n    '+stop+'\n\tstatic bool s_Il2CppMethodInitialized;'))
exit_code = '''
        if (V_0 != NULL && airisSpeechAscii(V_0->___type) == "SESSION_EXIT") {
            airisSpeech.cancel();
            '''+stop+'''
            return;
        }'''
patch_method('UaaLBridge_ReceiveMessage_', lambda b: once(b, '\n\t\tV_0 = L_5;', '\n\t\tV_0 = L_5;'+exit_code))
# Bridge payloads and TTS start diagnostics can contain extractive candidate details.
patch_method('UaaLBridge_ReceiveMessage_', lambda b: b.replace('Debug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_3, NULL);', '(void)L_3;'))
patch_method('U3CSpeakThenNotifyU3Ed__30_MoveNext_', lambda b: once(b,
    'DialogueManager_ShowListening_m24F42C86ABB159E331CEE3A759EBCED61BAD95BD(L_52, NULL);',
    'if (airisSpeech.expectsAnswer()) DialogueManager_ShowListening_m24F42C86ABB159E331CEE3A759EBCED61BAD95BD(L_52, NULL); else DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(L_52, NULL);'))
patch_method('U3CSpeakAndWaitU3Ed__26_MoveNext_', lambda b: re.sub(r'Debug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB\((L_\d+), NULL\);',r'(void)\1;',b))
path.write_text(source)
print('Speech identity patch verified')
