import re

cpp_path = 'AIRIS-Mobile/android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp'

with open(cpp_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ----------------------------------------------------------------------
# 0. Android Log Header
# ----------------------------------------------------------------------
if "#include <android/log.h>" not in content:
    content = content.replace('#include "pch-cpp.hpp"', '#include "pch-cpp.hpp"\n#include <android/log.h>', 1)
    print("0. Added #include <android/log.h>")

# ----------------------------------------------------------------------
# 1. Extern declarations at line 6323
# ----------------------------------------------------------------------
decl_marker = 'IL2CPP_MANAGED_FORCE_INLINE IL2CPP_METHOD_ATTR Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 Vector3_op_Multiply_m7F3B0FA9256CE368D7636558EFEFC4AB0E1A0F41_inline (float ___0_d, Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 ___1_a, const RuntimeMethod* method) ;'

new_decls = """
IL2CPP_EXTERN_C String_t* il2cpp_string_new (const char* str);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 RectTransform_get_anchoredPosition_m38F25A4253B0905BB058BE73DBF43C7172CE0680 (RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* __this, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Graphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448 (Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* __this, bool ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool Api_get_IsTriggerPressed_mE2356D33F433C078FB257D788BD9B3B219FA920E (const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool Selectable_get_interactable_m17DD0484DC62DCB4467109488D7A599BC85EC112 (Selectable_t3251808068A17B8E92FB33590A4C2FA66D456712* __this, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Transform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195 (Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* __this, Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* ___0_parent, bool ___1_worldPositionStays, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 Input_get_mousePosition_mFF21FBD2647DAE2A23BD4C45571CA95D05A0A42C (const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method);
IL2CPP_EXTERN_C void DialogueManager_OnDoneAnsweringClicked (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method);
IL2CPP_EXTERN_C void DialogueManager_OnNextQuestionClicked (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 Transform_InverseTransformPoint_m18CD395144D9C78F30E15A5B82B6670E792DBA5D (Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* __this, Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 ___0_position, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_overflowMode_mB8911BA07CEE0AC1E4E108B5EB79B230F90E96A1 (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, int32_t ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_enableAutoSizing_mDD34BC7AA735EEBEB916FF5C9791B1502F65FBCA (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, bool ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_fontSizeMin_mEAF970BB9CA053DF953AF83E638EA0F1D885358F (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, float ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_fontSizeMax_mC84B7090F5CE69BA63556A71FD63ABD67C911750 (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, float ___0_value, const RuntimeMethod* method);
"""

new_decls_tmp = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_overflowMode_mB8911BA07CEE0AC1E4E108B5EB79B230F90E96A1 (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, int32_t ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_enableAutoSizing_mDD34BC7AA735EEBEB916FF5C9791B1502F65FBCA (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, bool ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_fontSizeMin_mEAF970BB9CA053DF953AF83E638EA0F1D885358F (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, float ___0_value, const RuntimeMethod* method);
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TMP_Text_set_fontSizeMax_mC84B7090F5CE69BA63556A71FD63ABD67C911750 (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, float ___0_value, const RuntimeMethod* method);"""

if "DialogueManager_OnDoneAnsweringClicked" not in content:
    assert decl_marker in content, "decl_marker not found"
    content = content.replace(decl_marker, decl_marker + "\n" + new_decls, 1)
    print("1. Added extern declarations after decl_marker")
elif "TMP_Text_set_overflowMode_mB8911BA07CEE0AC1E4E108B5EB79B230F90E96A1" not in content:
    decl_target = "IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 Transform_InverseTransformPoint_m18CD395144D9C78F30E15A5B82B6670E792DBA5D (Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* __this, Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 ___0_position, const RuntimeMethod* method);"
    if decl_target in content:
        content = content.replace(decl_target, decl_target + "\n" + new_decls_tmp, 1)
        print("1c. Added TMP extern declarations")

# ----------------------------------------------------------------------
# 2. UaaLBridge_HandleLoadScene IL_01f1 cache managers
# ----------------------------------------------------------------------
old_load_scene_end = """IL_01f1:
\t{
\t\treturn;
\t}"""
new_load_scene_end = """IL_01f1:
\t{
\t\tUaaLBridge_CacheManagers_mC08D13FD7B1C529162DB19D6AB499E8896425D0D(__this, NULL);
\t\treturn;
\t}"""

if old_load_scene_end in content:
    content = content.replace(old_load_scene_end, new_load_scene_end, 1)
    print("2. Fixed UaaLBridge_HandleLoadScene IL_01f1")

# ----------------------------------------------------------------------
# 3. Dynamic CacheManagers check in UaaLBridge_HandleShowQuestion & HandleShowFeedback
# ----------------------------------------------------------------------
target_show_q = """IL_0022:
\t{
\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* L_6 = __this->___dialogueManager;"""
replacement_show_q = """IL_0022:
\t{
\t\tif (__this->___dialogueManager == NULL || !Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602((Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)__this->___dialogueManager, NULL, NULL))
\t\t{
\t\t\tUaaLBridge_CacheManagers_mC08D13FD7B1C529162DB19D6AB499E8896425D0D(__this, NULL);
\t\t}
\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* L_6 = __this->___dialogueManager;"""

if target_show_q in content:
    content = content.replace(target_show_q, replacement_show_q, 1)
    print("3. Fixed UaaLBridge_HandleShowQuestion dynamic dialogueManager cache")

target_show_fb = """IL_000b:
\t{
\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* L_3 = __this->___dialogueManager;"""
replacement_show_fb = """IL_000b:
\t{
\t\tif (__this->___dialogueManager == NULL || !Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602((Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)__this->___dialogueManager, NULL, NULL))
\t\t{
\t\t\tUaaLBridge_CacheManagers_mC08D13FD7B1C529162DB19D6AB499E8896425D0D(__this, NULL);
\t\t}
\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* L_3 = __this->___dialogueManager;"""

if target_show_fb in content:
    content = content.replace(target_show_fb, replacement_show_fb, 1)
    print("4. Fixed UaaLBridge_HandleShowFeedback dynamic dialogueManager cache")

# ----------------------------------------------------------------------
# 4. SpeakFeedbackThenNotify: Call DialogueManager_ShowNextQuestionButton when feedback finishes speaking
# ----------------------------------------------------------------------
target_speak_fb = """IL_00ed:
\t{
\t\tUaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* L_48 = V_1;
\t\tNullCheck(L_48);
\t\tUaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(L_48, _stringLiteralF533A05338878557789EB12B69E94DD131CCF24B, _stringLiteral9ED931619E39F59A8520C1E3B03FEA2E9A56FB60, NULL);
\t\treturn (bool)0;
\t}"""

replacement_speak_fb = """IL_00ed:
\t{
\t\tUaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* L_48 = V_1;
\t\tNullCheck(L_48);
\t\tif (L_48->___dialogueManager != NULL)
\t\t{
\t\t\tDialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF(L_48->___dialogueManager, NULL);
\t\t}
\t\tUaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(L_48, _stringLiteralF533A05338878557789EB12B69E94DD131CCF24B, _stringLiteral9ED931619E39F59A8520C1E3B03FEA2E9A56FB60, NULL);
\t\treturn (bool)0;
\t}"""

if target_speak_fb in content:
    content = content.replace(target_speak_fb, replacement_speak_fb, 1)
    print("4b. Fixed SpeakFeedbackThenNotify to call ShowNextQuestionButton")

# ----------------------------------------------------------------------
# 5. Speech Bubble Layout: Bounded speech bubble (620 max) and inner text region with TMP wrapping/auto-sizing
coroutine_marker = "U3CResizeSpeechBubbleCoroutineU3Ed__33_MoveNext"
coroutine_idx = content.find(coroutine_marker)
if coroutine_idx != -1:
    idx_bubble_start = content.find("IL_00f5:\n\t{", coroutine_idx)
    idx_bubble_end = content.find("\t\tStringU5BU5D_t7674CD946EC0CE7B3AE0BE70E6EE85F2ECD9F248* L_127 =", idx_bubble_start)

    replacement_bubble_layout = """IL_00f5:
\t{
\t\tconst float kMaxBubbleW = 620.0f;
\t\tconst float kMinBubbleW = 380.0f;
\t\tconst float kPadX = 44.0f;
\t\tconst float kPadY = 28.0f;
\t\tconst float kMaxTextW = kMaxBubbleW - kPadX;
\t\tconst float kMinTextW = kMinBubbleW - kPadX;

\t\tconst float kMinBubbleH = 90.0f;
\t\tconst float kMaxBubbleH = 210.0f;

\t\tTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* txt = __this->___text;
\t\tNullCheck(txt);

\t\t// 1. TextMeshPro configuration: wrap, auto-size 16..22, ellipsis overflow, center alignment
\t\tTMP_Text_set_enableWordWrapping_mFAEE849315B4723F9C86C127B1A59EF50BE1C12F(txt, (bool)1, NULL);
\t\tTMP_Text_set_enableAutoSizing_mDD34BC7AA735EEBEB916FF5C9791B1502F65FBCA(txt, (bool)1, NULL);
\t\tTMP_Text_set_fontSizeMin_mEAF970BB9CA053DF953AF83E638EA0F1D885358F(txt, 16.0f, NULL);
\t\tTMP_Text_set_fontSizeMax_mC84B7090F5CE69BA63556A71FD63ABD67C911750(txt, 22.0f, NULL);
\t\tTMP_Text_set_overflowMode_mB8911BA07CEE0AC1E4E108B5EB79B230F90E96A1(txt, 1, NULL);
\t\tTMP_Text_set_alignment_mE5216A28797987CC19927ED3CB8DFAC438C6B95A(txt, 514, NULL);

\t\tString_t* msg = __this->___message;
\t\tVirtualActionInvoker1< String_t* >::Invoke(66, txt, msg);

\t\t// 2. Measure single-line unconstrained width
\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 prefSingle;
\t\tprefSingle = TMP_Text_GetPreferredValues_m3FAA12BB95111827B71EBDE6B3B3F59EE4EA0C2C(txt, msg, (std::numeric_limits<float>::infinity()), (std::numeric_limits<float>::infinity()), NULL);

\t\tfloat targetTextW = prefSingle.___x;
\t\tif (targetTextW < kMinTextW) targetTextW = kMinTextW;
\t\tif (targetTextW > kMaxTextW) targetTextW = kMaxTextW;

\t\tfloat bubbleW = targetTextW + kPadX;

\t\t// 3. Measure height constrained strictly to targetTextW
\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 prefH;
\t\tprefH = TMP_Text_GetPreferredValues_m3FAA12BB95111827B71EBDE6B3B3F59EE4EA0C2C(txt, msg, targetTextW, (std::numeric_limits<float>::infinity()), NULL);

\t\tfloat neededBubbleH = prefH.___y + kPadY;
\t\tfloat bubbleH = neededBubbleH;
\t\tif (bubbleH < kMinBubbleH) bubbleH = kMinBubbleH;
\t\tif (bubbleH > kMaxBubbleH) bubbleH = kMaxBubbleH;

\t\tfloat targetTextH = bubbleH - kPadY;

\t\tV_7 = kMinTextW;
\t\tV_8 = kMaxTextW;
\t\tV_9 = targetTextW;
\t\tV_10 = targetTextH;
\t\tV_11 = bubbleW;
\t\tV_12 = bubbleH;

\t\t// 4. Center-anchored layout for speech bubble (V_3)
\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_center;
\t\tmemset((&v_center), 0, sizeof(v_center));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_center), 0.5f, 0.5f, NULL);

\t\tRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* bubbleRt = V_3;
\t\tNullCheck(bubbleRt);
\t\tRectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(bubbleRt, v_center, NULL);
\t\tRectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(bubbleRt, v_center, NULL);
\t\tRectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(bubbleRt, v_center, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos;
\t\tmemset((&bubblePos), 0, sizeof(bubblePos));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), 0.0f, 240.0f, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubbleSz;
\t\tmemset((&bubbleSz), 0, sizeof(bubbleSz));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubbleSz), bubbleW, bubbleH, NULL);
\t\tRectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(bubbleRt, bubbleSz, NULL);

\t\t// 5. Constrained inner text region (V_4) inside speech bubble
\t\tRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* textRt = V_4;
\t\tNullCheck(textRt);
\t\tRectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(textRt, v_center, NULL);
\t\tRectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(textRt, v_center, NULL);
\t\tRectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(textRt, v_center, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 textPos;
\t\tmemset((&textPos), 0, sizeof(textPos));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&textPos), 0.0f, 0.0f, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(textRt, textPos, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 textSz;
\t\tmemset((&textSz), 0, sizeof(textSz));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&textSz), targetTextW, targetTextH, NULL);
\t\tRectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(textRt, textSz, NULL);

\t\t// 6. Disable raycast target on bubble image and text
\t\tImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* sbImg = GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D(V_2, GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
\t\tif (sbImg != NULL)
\t\t{
\t\t\tGraphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)sbImg, (bool)0, NULL);
\t\t}
\t\tGraphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)txt, (bool)0, NULL);

\t\t// 7. Force text mesh generation and canvas redraw
\t\tVirtualActionInvoker2< bool, bool >::Invoke(106, txt, (bool)0, (bool)0);
\t\tCanvas_ForceUpdateCanvases_m6ECDBC5E85ADA3301BB20611753C45769F15EB51(NULL);

\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] SpeechBubble bounded layout => bubble:(%.1f, %.1f) text:(%.1f, %.1f) autoSize:16-22", bubbleW, bubbleH, targetTextW, targetTextH);
\t}

IL_0288:
\t{
"""
    if idx_bubble_start != -1 and idx_bubble_end != -1:
        content = content[:idx_bubble_start] + replacement_bubble_layout + content[idx_bubble_end:]
        print("5. Fixed speech bubble bounded layout and text constraint")

# -------------------------------------------------------------
# 6. DialogueManager_ShowSpeaker: Hide both action buttons when new question is shown
# -------------------------------------------------------------
target_show_spk = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_mCD89D0F471D5CE1FEF09482ED02FF990DE9A8777 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, int32_t ___0_speakerIndex, String_t* ___1_message, const RuntimeMethod* method) 
{"""

replacement_show_spk = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_mCD89D0F471D5CE1FEF09482ED02FF990DE9A8777 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, int32_t ___0_speakerIndex, String_t* ___1_message, const RuntimeMethod* method) 
{
\tif (__this != NULL)
\t{
\t\tif (__this->___nextQuestionButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t\t}
\t\tif (__this->___stopRecordingButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
\t\t}
\t}"""

if target_show_spk in content and "GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);" not in content:
    content = content.replace(target_show_spk, replacement_show_spk, 1)
    print("6. Added button deactivation in DialogueManager_ShowSpeaker")

# -------------------------------------------------------------
# 7. DialogueManager_ShowListening & ShowNextQuestionButton button toggles & listeningPanel alpha
# -------------------------------------------------------------
target_listening_alpha = """\t{\n\t\tGraphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* L_79 = V_8;\n\t\tNullCheck(L_79);\n\t\tBehaviour_set_enabled_mF1DCFE60EB09E0529FE9476CA804A3AA2D72B16A(L_79, (bool)1, NULL);\n\t\tGraphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* L_80 = V_8;\n\t\tNullCheck(L_80);\n\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F L_81;\n\t\tL_81 = VirtualFuncInvoker0< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(22, L_80);\n\t\tV_9 = L_81;\n\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F L_82 = V_9;\n\t\tfloat L_83 = L_82.___a;\n\t\tif ((!(((float)L_83) < ((float)(0.200000003f)))))\n\t\t{\n\t\t\tgoto IL_01d8;\n\t\t}\n\t}\n\t{\n\t\t(&V_9)->___a = (1.0f);\n\t\tGraphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* L_84 = V_8;\n\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F L_85 = V_9;\n\t\tNullCheck(L_84);\n\t\tVirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, L_84, L_85);\n\t}"""

replacement_listening_alpha = """\t{
\t\tGraphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* L_79 = V_8;
\t\tNullCheck(L_79);
\t\tBehaviour_set_enabled_mF1DCFE60EB09E0529FE9476CA804A3AA2D72B16A(L_79, (bool)1, NULL);
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* gGo = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)L_79, NULL);
\t\tif (gGo == __this->___listeningPanel)
\t\t{
\t\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F clearCol;
\t\t\tmemset((&clearCol), 0, sizeof(clearCol));
\t\t\tVirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, L_79, clearCol);
\t\t\tGraphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448(L_79, (bool)0, NULL);
\t\t\tgoto IL_01d8;
\t\t}
\t\tGraphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* L_80 = V_8;
\t\tNullCheck(L_80);
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F L_81;
\t\tL_81 = VirtualFuncInvoker0< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(22, L_80);
\t\tV_9 = L_81;
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F L_82 = V_9;
\t\tfloat L_83 = L_82.___a;
\t\tif ((!(((float)L_83) < ((float)(0.200000003f)))))
\t\t{
\t\t\tgoto IL_01d8;
\t\t}
\t}
\t{
\t\t(&V_9)->___a = (1.0f);
\t\tGraphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931* L_84 = V_8;
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F L_85 = V_9;
\t\tNullCheck(L_84);
\t\tVirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, L_84, L_85);
\t}"""

if target_listening_alpha in content:
    content = content.replace(target_listening_alpha, replacement_listening_alpha, 1)
    print("7a. Fixed listeningPanel graphic alpha to prevent obscuring avatar")

target_show_list = """IL_0219:
\t{
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_93 = __this->___stopRecordingButton;"""
replacement_show_list = """IL_0219:
\t{
\t\tif (__this->___nextQuestionButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t\t}
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_93 = __this->___stopRecordingButton;"""

if target_show_list in content:
    content = content.replace(target_show_list, replacement_show_list, 1)
    print("7b. Fixed DialogueManager_ShowListening button toggle")

target_show_nqb = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{"""
replacement_show_nqb = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
\tif (__this != NULL)
\t{
\t\tDialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
\t\tif (__this->___stopRecordingButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
\t\t}
\t}"""

if target_show_nqb in content and "DialogueManager_HideListening" not in content[:content.find(target_show_nqb)+300]:
    content = content.replace(target_show_nqb, replacement_show_nqb, 1)
    print("8. Fixed DialogueManager_ShowNextQuestionButton button toggle and listening cleanup")

# -------------------------------------------------------------
# 8. Helper CreateVRButton & DialogueManager_OnDoneAnsweringClicked & DialogueManager_OnNextQuestionClicked & DialogueManager_EnsureEndInterviewButton
# -------------------------------------------------------------
new_ensure_buttons = """// Method Definition Index: 71589
static inline bool IsValidUnityObject(RuntimeObject* obj)
{
\treturn obj != NULL && Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602((Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)obj, NULL, NULL);
}

static GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* CreateVRButton(
\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm,
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* parentTr,
\tconst char* goName,
\tconst char* labelText,
\tfloat posX,
\tfloat posY,
\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F bgColor,
\tconst RuntimeMethod* callbackMethodVar,
\tTypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* btnCompTypes,
\tTypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* txtCompTypes)
{
\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* btnGo = (GameObject_t76FEDD663AB33C991A9C9A23129337651094216F*)il2cpp_codegen_object_new(GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
\tGameObject__ctor_m721D643351E55308EA4F5F41B67D5446D11C61F0(btnGo, il2cpp_string_new(goName), btnCompTypes, NULL);

\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* btnTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(btnGo, NULL);
\tTransform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(btnTr, parentTr, (bool)0, NULL);

\tRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* rt = GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(btnGo, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
\tif (rt != NULL)
\t{
\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_center;
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_center), 0.5f, 0.5f, NULL);
\t\tRectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(rt, v_center, NULL);
\t\tRectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(rt, v_center, NULL);
\t\tRectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(rt, v_center, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_sz;
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_sz), 220.0f, 65.0f, NULL);
\t\tRectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(rt, v_sz, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_pos;
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_pos), posX, posY, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(rt, v_pos, NULL);
\t}

\tImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* img = GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D(btnGo, GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
\tif (img != NULL)
\t{
\t\tVirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, img, bgColor);
\t\tGraphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)img, (bool)1, NULL);
\t}

\tButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098* btn = GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(btnGo, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var);
\tif (btn != NULL)
\t{
\t\tSelectable_set_targetGraphic_m23DB0DF4E5F2DABD50C662C708B4555162171FB9(btn, (Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)img, NULL);
\t\tButtonClickedEvent_t8EA72E90B3BD1392FB3B3EF167D5121C23569E4C* evt = Button_get_onClick_m701712A7F7F000CC80D517C4510697E15722C35C_inline(btn, NULL);
\t\tif (callbackMethodVar != NULL)
\t\t{
\t\t\tUnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7* act = (UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7*)il2cpp_codegen_object_new(UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7_il2cpp_TypeInfo_var);
\t\t\tUnityAction__ctor_mC53E20D6B66E0D5688CD81B88DBB34F5A58B7131(act, (RuntimeObject*)dm, (intptr_t)callbackMethodVar, NULL);
\t\t\tUnityEvent_AddListener_m8AA4287C16628486B41DA41CA5E7A856A706D302(evt, act, NULL);
\t\t}
\t}

\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* txtGo = (GameObject_t76FEDD663AB33C991A9C9A23129337651094216F*)il2cpp_codegen_object_new(GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
\tGameObject__ctor_m721D643351E55308EA4F5F41B67D5446D11C61F0(txtGo, il2cpp_string_new("Text (TMP)"), txtCompTypes, NULL);

\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* txtTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(txtGo, NULL);
\tTransform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(txtTr, btnTr, (bool)0, NULL);

\tRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* txtRt = GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(txtGo, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
\tif (txtRt != NULL)
\t{
\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_zero;
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_zero), 0.0f, 0.0f, NULL);
\t\tRectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(txtRt, v_zero, NULL);

\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_one;
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_one), 1.0f, 1.0f, NULL);
\t\tRectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(txtRt, v_one, NULL);
\t\tRectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(txtRt, v_zero, NULL);
\t}

\tTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957* tmp = GameObject_GetComponent_TisTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_mBDBF977A8C7734F6EDD83FC65C6FDDE74427611E(txtGo, GameObject_GetComponent_TisTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_mBDBF977A8C7734F6EDD83FC65C6FDDE74427611E_RuntimeMethod_var);
\tif (tmp != NULL)
\t{
\t\tVirtualActionInvoker1< String_t* >::Invoke(66, tmp, il2cpp_string_new(labelText));
\t\tTMP_Text_set_fontSize_m1C3A3BA2BC88E5E1D89375FD35A0AA91E75D3AAD(tmp, 22.0f, NULL);
\t\tTMP_Text_set_alignment_mE5216A28797987CC19927ED3CB8DFAC438C6B95A(tmp, 514, NULL);
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F col_w = Color_get_white_m068F5AF879B0FCA584E3693F762EA41BB65532C6_inline(NULL);
\t\tVirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, tmp, col_w);
\t\tGraphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)tmp, (bool)0, NULL);
\t}

\treturn btnGo;
}

IL2CPP_EXTERN_C void DialogueManager_OnDoneAnsweringClicked (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)
{
\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][DONE_ANSWERING_CLICKED]");
\tif (__this != NULL && IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
\t}
\tUaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* bridge = UaaLBridge_get_Instance_mC704985B67D85B378A99F9C2D52DE746FFC2869A_inline(NULL);
\tif (bridge != NULL && bridge->___recordingManager != NULL)
\t{
\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(bridge->___recordingManager, NULL);
\t}
}

IL2CPP_EXTERN_C void DialogueManager_OnNextQuestionClicked (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)
{
\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][NEXT_QUESTION_CLICKED]");
\tif (__this != NULL && IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t}
\tUaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* bridge = UaaLBridge_get_Instance_mC704985B67D85B378A99F9C2D52DE746FFC2869A_inline(NULL);
\tif (bridge != NULL)
\t{
\t\tUaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(bridge, il2cpp_string_new("NEXT_QUESTION"), il2cpp_string_new("{}"), NULL);
\t}
}

IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Button_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_0_0_0_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_mBDBF977A8C7734F6EDD83FC65C6FDDE74427611E_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_0_0_0_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_0_0_0_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Component_GetComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m8D88AC7AC775DA9FE3783014A4448A8C60283FF1_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_AddComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m308DCE149216D4787C3E6147729C0DF79423E1BF_RuntimeMethod_var);
\t\ts_Il2CppMethodInitialized = true;
\t}

\tif (__this == NULL) return;

\t// Find canvas from speech bubble or scene
\tCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26* canvas = NULL;
\tif (IsValidUnityObject((RuntimeObject*)__this->___speechBubble))
\t{
\t\tcanvas = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(__this->___speechBubble, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
\t}
\tif (canvas == NULL)
\t{
\t\tTransformU5BU5D_tBB9C5F5686CAE82E3D97D43DF0F3D68ABF75EC24* allTr = Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3(Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3_RuntimeMethod_var);
\t\tif (allTr != NULL)
\t\t{
\t\t\tint32_t len = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)allTr)->max_length),NULL));
\t\t\tfor (int32_t i = 0; i < len; ++i)
\t\t\t{
\t\t\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* t = (allTr)->GetAt(static_cast<il2cpp_array_size_t>(i));
\t\t\t\tif (t != NULL && Object_get_hideFlags_mA08F5E41671B8C6B5073C6B9E2799BCE6E0DF7F3(t, NULL) == 0)
\t\t\t\t{
\t\t\t\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* go = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B(t, NULL);
\t\t\t\t\tScene_tA1DC762B79745EB5140F054C884855B922318356 sc = GameObject_get_scene_m747D45E8CECC56DD47D1E103F9E51D5FBEDA4B01(go, NULL);
\t\t\t\t\tif (Scene_get_isLoaded_m5BC54CEB27330040A0BC69E66E94EE97E87298BC((&sc), NULL))
\t\t\t\t\t{
\t\t\t\t\t\tCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26* c = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(go, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
\t\t\t\t\t\tif (c != NULL)
\t\t\t\t\t\t{
\t\t\t\t\t\t\tcanvas = c;
\t\t\t\t\t\t\tbreak;
\t\t\t\t\t\t}
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}
\t\t}
\t}

\tif (canvas == NULL)
\t{
\t\t__android_log_print(ANDROID_LOG_WARN, "Unity", "[DialogueManager] Canvas not found");
\t\treturn;
\t}

\t// Ensure canvas.worldCamera = Camera.main
\tCamera_tA92CC927D7439999BC82DBEDC0AA45B470F9E184* mainCam = Camera_get_main_m52C992F18E05355ABB9EEB64A4BF2215E12762DF(NULL);
\tif (mainCam != NULL)
\t{
\t\tCanvas_set_worldCamera_m007F7DABDB5A3A6BFB043E3500DA82A4D936EDD4(canvas, mainCam, NULL);
\t}

\t// Ensure GraphicRaycaster is present and enabled on the Canvas
\tGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B* gr = Component_GetComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m8D88AC7AC775DA9FE3783014A4448A8C60283FF1((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)canvas, Component_GetComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m8D88AC7AC775DA9FE3783014A4448A8C60283FF1_RuntimeMethod_var);
\tif (gr == NULL)
\t{
\t\tgr = GameObject_AddComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m308DCE149216D4787C3E6147729C0DF79423E1BF(Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)canvas, NULL), GameObject_AddComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m308DCE149216D4787C3E6147729C0DF79423E1BF_RuntimeMethod_var);
\t}
\tif (gr != NULL)
\t{
\t\tBehaviour_set_enabled_mF1DCFE60EB09E0529FE9476CA804A3AA2D72B16A((Behaviour_t01970CFBBA658497AE30F311C447DB0440BAB7FA*)gr, (bool)1, NULL);
\t}

\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* canvasTr = Component_get_transform_m2919A1D81931E6932C7F06D4C2F0AB8DDA9A5371((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)canvas, NULL);

\t// Check if our VR buttons are already children of this Canvas
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* endTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("EndInterviewButton_VR"), NULL);
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* nextTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("NextQuestionButton_VR"), NULL);
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* stopTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("StopRecordingButton_VR"), NULL);

\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* vrEndBtn = endTr != NULL ? Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)endTr, NULL) : NULL;
\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* vrNextBtn = nextTr != NULL ? Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)nextTr, NULL) : NULL;
\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* vrStopBtn = stopTr != NULL ? Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)stopTr, NULL) : NULL;

\t// Hide prefab scene buttons and listeningPanel to eliminate rogue UI elements and circular artifacts
\tif (IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton) && __this->___nextQuestionButton != vrNextBtn)
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t}
\tif (IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton) && __this->___stopRecordingButton != vrStopBtn)
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
\t}
\tif (IsValidUnityObject((RuntimeObject*)__this->___listeningPanel))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, (bool)0, NULL);
\t}

\tTypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* btnCompTypes = NULL;
\tTypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* txtCompTypes = NULL;

\tif (vrEndBtn == NULL || vrNextBtn == NULL || vrStopBtn == NULL)
\t{
\t\tbtnCompTypes = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)4);
\t\tbtnCompTypes->SetAt(0, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var) }, NULL));
\t\tbtnCompTypes->SetAt(1, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var) }, NULL));
\t\tbtnCompTypes->SetAt(2, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_0_0_0_var) }, NULL));
\t\tbtnCompTypes->SetAt(3, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(Button_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_0_0_0_var) }, NULL));

\t\ttxtCompTypes = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)3);
\t\ttxtCompTypes->SetAt(0, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var) }, NULL));
\t\ttxtCompTypes->SetAt(1, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var) }, NULL));
\t\ttxtCompTypes->SetAt(2, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(TextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_0_0_0_var) }, NULL));
\t}

\t// 1. Ensure End Interview Button at (+130, -260)
\tif (vrEndBtn == NULL)
\t{
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F colEnd;
\t\tColor__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colEnd), 0.20f, 0.25f, 0.33f, 0.95f, NULL);
\t\tvrEndBtn = CreateVRButton(__this, canvasTr, "EndInterviewButton_VR", "End Interview", 130.0f, -260.0f, colEnd, (const RuntimeMethod*)DialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919_RuntimeMethod_var, btnCompTypes, txtCompTypes);
\t}
\t__this->___endInterviewButton = vrEndBtn;
\tif (IsValidUnityObject((RuntimeObject*)__this->___endInterviewButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___endInterviewButton, (bool)1, NULL);
\t}

\t// 2. Ensure Next Question Button at (-130, -260)
\tif (vrNextBtn == NULL)
\t{
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F colNq;
\t\tColor__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colNq), 0.12f, 0.45f, 0.75f, 0.95f, NULL);
\t\tvrNextBtn = CreateVRButton(__this, canvasTr, "NextQuestionButton_VR", "Next Question", -130.0f, -260.0f, colNq, NULL, btnCompTypes, txtCompTypes);
\t}
\t__this->___nextQuestionButton = vrNextBtn;

\t// 3. Ensure Done Answering Button at (-130, -260)
\tif (vrStopBtn == NULL)
\t{
\t\tColor_tD001788D726C3A7F1379BEED0260B9591F440C1F colDa;
\t\tColor__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colDa), 0.05f, 0.50f, 0.35f, 0.95f, NULL);
\t\tvrStopBtn = CreateVRButton(__this, canvasTr, "StopRecordingButton_VR", "Done Answering", -130.0f, -260.0f, colDa, NULL, btnCompTypes, txtCompTypes);
\t}
\t__this->___stopRecordingButton = vrStopBtn;

\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All 3 buttons ensured at dedicated lower VR area (y=-260)");
}
"""

idx_ensure_start = content.find("// Method Definition Index: 71589\nstatic inline bool IsValidUnityObject")
if idx_ensure_start == -1:
    idx_ensure_start = content.find("// Method Definition Index: 71589\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883")
idx_ensure_end = content.find("// Method Definition Index: 71590\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919", idx_ensure_start)
assert idx_ensure_start != -1 and idx_ensure_end != -1, "EnsureEndInterviewButton bounds not found"

content = content[:idx_ensure_start] + new_ensure_buttons + "\n" + content[idx_ensure_end:]
print("9. Replaced DialogueManager_EnsureEndInterviewButton definition with unified 3-button setup")

# -------------------------------------------------------------
# 9. VRGazeReticle_PerformGazeRaycast with 3D Canvas Raycast
# -------------------------------------------------------------
new_gaze_raycast = """// Method Definition Index: 71803
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_PerformGazeRaycast_mBFF4B6D7605BF9275D2BEE72B2CCB241339400A6 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);
\t\ts_Il2CppMethodInitialized = true;
\t}

\tif (__this == NULL) return;

\tCamera_tA92CC927D7439999BC82DBEDC0AA45B470F9E184* cam = __this->___targetCamera;
\tif (cam == NULL)
\t{
\t\tcam = Camera_get_main_m52C992F18E05355ABB9EEB64A4BF2215E12762DF(NULL);
\t\t__this->___targetCamera = cam;
\t}
\tif (cam == NULL) return;

\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* camTr = Component_get_transform_m2919A1D81931E6932C7F06D4C2F0AB8DDA9A5371((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)cam, NULL);
\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 rayOrigin = Transform_get_position_m69CD5FA214FDAE7BB701552943674846C220FDE1(camTr, NULL);
\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 rayDir = Transform_get_forward_mFCFACF7165FDAB21E80E384C494DF278386CEE2F(camTr, NULL);

\til2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm = Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04(Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);

\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* hitBtn = NULL;
\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 reticleWorldPos;
\tfloat reticleDist = __this->___defaultReticleDistance;
\tif (reticleDist <= 0.1f) reticleDist = 2.0f;
\treticleWorldPos.___x = rayOrigin.___x + rayDir.___x * reticleDist;
\treticleWorldPos.___y = rayOrigin.___y + rayDir.___y * reticleDist;
\treticleWorldPos.___z = rayOrigin.___z + rayDir.___z * reticleDist;

\tif (dm != NULL)
\t{
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* canvasTr = NULL;
\t\tif (IsValidUnityObject((RuntimeObject*)dm->___endInterviewButton))
\t\t{
\t\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* bTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(dm->___endInterviewButton, NULL);
\t\t\tif (bTr != NULL) canvasTr = Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E(bTr, NULL);
\t\t}

\t\tif (canvasTr != NULL)
\t\t{
\t\t\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 cPos = Transform_get_position_m69CD5FA214FDAE7BB701552943674846C220FDE1(canvasTr, NULL);
\t\t\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 cFwd = Transform_get_forward_mFCFACF7165FDAB21E80E384C494DF278386CEE2F(canvasTr, NULL);

\t\t\tfloat denom = rayDir.___x * cFwd.___x + rayDir.___y * cFwd.___y + rayDir.___z * cFwd.___z;
\t\t\tif (denom < -0.01f || denom > 0.01f)
\t\t{
\t\t\t\tfloat numer = (cPos.___x - rayOrigin.___x) * cFwd.___x + (cPos.___y - rayOrigin.___y) * cFwd.___y + (cPos.___z - rayOrigin.___z) * cFwd.___z;
\t\t\t\tfloat t = numer / denom;
\t\t\t\tif (t > 0.2f && t < 15.0f)
\t\t\t\t{
\t\t\t\t\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 hitP;
\t\t\t\t\thitP.___x = rayOrigin.___x + rayDir.___x * t;
\t\t\t\t\thitP.___y = rayOrigin.___y + rayDir.___y * t;
\t\t\t\t\thitP.___z = rayOrigin.___z + rayDir.___z * t;

\t\t\t\t\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 localHit = Transform_InverseTransformPoint_m18CD395144D9C78F30E15A5B82B6670E792DBA5D(canvasTr, hitP, NULL);

\t\t\t\t\t// Candidate buttons are in row at y ~ -260 (bounds: [-340, -180])
\t\t\t\t\tif (localHit.___y >= -340.0f && localHit.___y <= -180.0f)
\t\t\t\t\t{
\t\t\t\t\t\t// Left button area: [-270, 0]
\t\t\t\t\t\tif (localHit.___x >= -270.0f && localHit.___x <= 0.0f)
\t\t\t\t\t\t{
\t\t\t\t\t\t\tif (IsValidUnityObject((RuntimeObject*)dm->___stopRecordingButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___stopRecordingButton, NULL))
\t\t\t\t\t\t\t{
\t\t\t\t\t\t\t\thitBtn = dm->___stopRecordingButton;
\t\t\t\t\t\t\t}
\t\t\t\t\t\t\telse if (IsValidUnityObject((RuntimeObject*)dm->___nextQuestionButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___nextQuestionButton, NULL))
\t\t\t\t\t\t\t{
\t\t\t\t\t\t\t\thitBtn = dm->___nextQuestionButton;
\t\t\t\t\t\t\t}
\t\t\t\t\t\t}
\t\t\t\t\t\t// Right button area: [0, 270]
\t\t\t\t\t\telse if (localHit.___x > 0.0f && localHit.___x <= 270.0f)
\t\t\t\t\t\t{
\t\t\t\t\t\t\tif (IsValidUnityObject((RuntimeObject*)dm->___endInterviewButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___endInterviewButton, NULL))
\t\t\t\t\t\t\t{
\t\t\t\t\t\t\t\thitBtn = dm->___endInterviewButton;
\t\t\t\t\t\t\t}
\t\t\t\t\t\t}
\t\t\t\t\t}

\t\t\t\t\t// If gaze hits Canvas within bounds, place reticle directly on hit surface
\t\t\t\t\tif (localHit.___x >= -350.0f && localHit.___x <= 350.0f && localHit.___y >= -380.0f && localHit.___y <= 380.0f)
\t\t\t\t\t{
\t\t\t\t\t\treticleWorldPos = hitP;
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}
\t\t}
\t}

\t// Update reticle position and scale
\tif (IsValidUnityObject((RuntimeObject*)__this->___reticleTransform))
\t{
\t\tTransform_set_position_mA1A817124BB41B685043DED2A9BA48CDF37C4156(__this->___reticleTransform, reticleWorldPos, NULL);
\t\tVector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 rScale;
\t\tfloat sc = (hitBtn != NULL) ? 0.040f : 0.025f;
\t\tVector3__ctor_m376936E6B999EF1ECBE57D990A386303E2283DE0_inline((&rScale), sc, sc, sc, NULL);
\t\tTransform_set_localScale_mBA79E811BAF6C47B80FF76414C12B47B3CD03633(__this->___reticleTransform, rScale, NULL);
\t}

\t// Hover target management & logging
\til2cpp_codegen_runtime_class_init_inline(EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707_il2cpp_TypeInfo_var);
\tEventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707* curEvt = EventSystem_get_current_mC87C69FB418563DC2A571A10E2F9DB59A6785016(NULL);
\tPointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB* pData = NULL;
\tif (curEvt != NULL)
\t{
\t\tpData = (PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB*)il2cpp_codegen_object_new(PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB_il2cpp_TypeInfo_var);
\t\tPointerEventData__ctor_m63837790B68893F0022CCEFEF26ADD55A975F71C(pData, curEvt, NULL);
\t}

\tif (hitBtn != NULL)
\t{
\t\tif (hitBtn != __this->___currentHoveredObject)
\t\t{
\t\t\tconst char* btnName = (dm != NULL && hitBtn == dm->___stopRecordingButton) ? "StopRecordingButton_VR" :
\t\t\t                      (dm != NULL && hitBtn == dm->___nextQuestionButton) ? "NextQuestionButton_VR" : "EndInterviewButton_VR";
\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][HOVER_TARGET] target=%s", btnName);
\t\t\tVRGazeReticle_SetHoverTarget_mC19FFE2ADE0DD62BD060AFCA6E69287D37D087B9(__this, hitBtn, pData, NULL);
\t\t}
\t}
\telse
\t{
\t\tif (__this->___currentHoveredObject != NULL)
\t\t{
\t\t\tVRGazeReticle_ClearHoverTarget_m3388506C7483CFA87029336E9A14252E6C8FF76A(__this, pData, NULL);
\t\t}
\t}
}
"""

idx_pgr_start = content.find("// Method Definition Index: 71803\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_PerformGazeRaycast_mBFF4B6D7605BF9275D2BEE72B2CCB241339400A6")
idx_pgr_end = content.find("// Method Definition Index: 71804\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool VRGazeReticle_IsInteractable_m006343EDD8DE082DEDD736C97215B3CA054369B7", idx_pgr_start)
assert idx_pgr_start != -1 and idx_pgr_end != -1, "PerformGazeRaycast bounds not found"

content = content[:idx_pgr_start] + new_gaze_raycast + "\n" + content[idx_pgr_end:]
print("10. Replaced VRGazeReticle_PerformGazeRaycast definition with 3D Canvas Raycast")

# -------------------------------------------------------------
# 10. VRGazeReticle_HandleTriggerInput and TriggerClick
# -------------------------------------------------------------
new_trigger_input = """// Method Definition Index: 71807
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_HandleTriggerInput_mBE124C9C0B94F31B93C0D9419EB160CFD34494FC (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Touchscreen_t5A3B494C10A53A822AEDB3508093860D142D84CE_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);
\t\ts_Il2CppMethodInitialized = true;
\t}

\tif (__this == NULL) return;

\tbool isMouseClick = false;
\tbool isTouch = false;
\tbool isHardwareTrigger = false;

\t// 1. Mouse Left Click
\tMouse_t9A9CC4636FA9CDBAD7FB7A02DB0D6395EDCC338F* mouse = Mouse_get_current_m410C1F9ABC5AA77353574E8815F7E63289707986_inline(NULL);
\tif (mouse != NULL)
\t{
\t\tButtonControl_t85949109B98AAF5B7ADC0285F0EC98A61EC88ECF* leftBtn = Mouse_get_leftButton_m1015BCBE6BE30B1D1D2702736A4E64120F6B5DFB_inline(mouse, NULL);
\t\tif (leftBtn != NULL && ButtonControl_get_wasPressedThisFrame_m6ED1DB185035A406B0659A055C3096A5058DBD5B(leftBtn, NULL))
\t\t{
\t\t\tisMouseClick = true;
\t\t}
\t}

\t// 2. Touchscreen Tap
\tTouchscreen_t5A3B494C10A53A822AEDB3508093860D142D84CE* touch = Touchscreen_get_current_m6D9CD2446B30224D18E695DF0ECC3A00E4F7B708_inline(NULL);
\tif (touch != NULL)
\t{
\t\tTouchControl_t3A64A795FF61A8B27E5EBD61632F23AFCC725079* primary = Touchscreen_get_primaryTouch_mABAC4C0F1DBA6A718B83682A91DF40FD3563F413_inline(touch, NULL);
\t\tif (primary != NULL)
\t\t{
\t\t\tTouchPressControl_tD5BD68D9FDEAC889591DD7A499864893A43C7CEB* press = TouchControl_get_press_mFE6656905CFF085E99AE78F24FF71C0CA5DC5E81_inline(primary, NULL);
\t\t\tif (press != NULL && ButtonControl_get_wasPressedThisFrame_m6ED1DB185035A406B0659A055C3096A5058DBD5B(press, NULL))
\t\t\t{
\t\t\t\tisTouch = true;
\t\t\t}
\t\t}
\t}

\t// 3. Cardboard Hardware Trigger
\tif (Api_get_IsTriggerPressed_mE2356D33F433C078FB257D788BD9B3B219FA920E(NULL))
\t{
\t\tisHardwareTrigger = true;
\t}

\tif (!isMouseClick && !isTouch && !isHardwareTrigger)
\t{
\t\treturn;
\t}

\t// Debounce 0.35s
\tstatic float s_lastClickTime = 0.0f;
\tfloat curTime = Time_get_time_m3A271BB1B20041144AC5B7863B71AB1F0150374B(NULL);
\tif (curTime - s_lastClickTime < 0.35f)
\t{
\t\treturn;
\t}
\ts_lastClickTime = curTime;

\til2cpp_codegen_runtime_class_init_inline(EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707_il2cpp_TypeInfo_var);
\tEventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707* curEvt = EventSystem_get_current_mC87C69FB418563DC2A571A10E2F9DB59A6785016(NULL);
\tif (curEvt == NULL) return;

\tPointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB* pData = (PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB*)il2cpp_codegen_object_new(PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB_il2cpp_TypeInfo_var);
\tPointerEventData__ctor_m63837790B68893F0022CCEFEF26ADD55A975F71C(pData, curEvt, NULL);

\t// 1. If reticle is currently hovering a button, click that button
\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* target = __this->___currentHoveredObject;
\tif (IsValidUnityObject((RuntimeObject*)target))
\t{
\t\tVRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, target, pData, NULL);
\t\treturn;
\t}

\t// 2. Fallback to active primary button in DialogueManager
\til2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm = Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04(Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);
\tif (dm != NULL)
\t{
\t\tif (IsValidUnityObject((RuntimeObject*)dm->___stopRecordingButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___stopRecordingButton, NULL))
\t\t{
\t\t\tVRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, dm->___stopRecordingButton, pData, NULL);
\t\t\treturn;
\t\t}
\t\telse if (IsValidUnityObject((RuntimeObject*)dm->___nextQuestionButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___nextQuestionButton, NULL))
\t\t{
\t\t\tVRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, dm->___nextQuestionButton, pData, NULL);
\t\t\treturn;
\t\t}
\t\telse if (IsValidUnityObject((RuntimeObject*)dm->___endInterviewButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___endInterviewButton, NULL))
\t\t{
\t\t\tVRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, dm->___endInterviewButton, pData, NULL);
\t\t\treturn;
\t\t}
\t}
}

// Method Definition Index: 71808
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* ___0_target, PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB* ___1_data, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&ExecuteEvents_Execute_TisIPointerClickHandler_t77341AA19DE37C26F5F619DE8BD28B70D5A2B5D8_m024FB23AA1DBB1B7A5E1935FA35A1E4FF57AC5F6_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&ExecuteEvents_t74DCF8B83743EE2773ACF182344612A048E2CC59_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponentInParent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_m11FB04DCD776C06BEDBD725026596063074664CF_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);
\t\ts_Il2CppMethodInitialized = true;
\t}

\tif (___0_target == NULL)
\t{
\t\treturn;
\t}

\tButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098* btn = GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(___0_target, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var);
\tif (btn == NULL)
\t{
\t\tbtn = GameObject_GetComponentInParent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_m11FB04DCD776C06BEDBD725026596063074664CF(___0_target, GameObject_GetComponentInParent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_m11FB04DCD776C06BEDBD725026596063074664CF_RuntimeMethod_var);
\t}

\tif (btn != NULL)
\t{
\t\tbool interactable = Selectable_get_interactable_m17DD0484DC62DCB4467109488D7A599BC85EC112((Selectable_t3251808068A17B8E92FB33590A4C2FA66D456712*)btn, NULL);
\t\tif (!interactable)
\t\t{
\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][BUTTON_CLICK] Button not interactable, ignoring");
\t\t\treturn;
\t\t}

\t\til2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm = Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04(Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);

\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* btnGo = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)btn, NULL);
\t\tconst char* bName = (dm != NULL && (btnGo == dm->___stopRecordingButton || btn == GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(dm->___stopRecordingButton, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var))) ? "StopRecordingButton_VR" :
\t\t                    (dm != NULL && (btnGo == dm->___nextQuestionButton || btn == GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(dm->___nextQuestionButton, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var))) ? "NextQuestionButton_VR" : "EndInterviewButton_VR";
\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][BUTTON_CLICK] target=%s", bName);

\t\til2cpp_codegen_runtime_class_init_inline(ExecuteEvents_t74DCF8B83743EE2773ACF182344612A048E2CC59_il2cpp_TypeInfo_var);
\t\tExecuteEvents_Execute_TisIPointerClickHandler_t77341AA19DE37C26F5F619DE8BD28B70D5A2B5D8_m024FB23AA1DBB1B7A5E1935FA35A1E4FF57AC5F6(
\t\t\tbtnGo,
\t\t\t___1_data,
\t\t\tExecuteEvents_get_pointerClickHandler_m0017F9D1EAF7C02CDDB4C148C92D6685D88EA8D5_inline(NULL),
\t\t\tExecuteEvents_Execute_TisIPointerClickHandler_t77341AA19DE37C26F5F619DE8BD28B70D5A2B5D8_m024FB23AA1DBB1B7A5E1935FA35A1E4FF57AC5F6_RuntimeMethod_var);

\t\tButtonClickedEvent_t8EA72E90B3BD1392FB3B3EF167D5121C23569E4C* onClickEvt = Button_get_onClick_m701712A7F7F000CC80D517C4510697E15722C35C_inline(btn, NULL);
\t\tif (onClickEvt != NULL)
\t\t{
\t\t\tUnityEvent_Invoke_mFBF80D59B03C30C5FE6A06F897D954ACADE061D2((UnityEvent_tDC2C3548799DBC91D1E3F3DE60083A66F4751977*)onClickEvt, NULL);
\t\t}

\t\tif (dm != NULL)
\t\t{
\t\t\tbool isDone = (btnGo == dm->___stopRecordingButton) || (dm->___stopRecordingButton != NULL && btn == GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(dm->___stopRecordingButton, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var));
\t\t\tbool isNext = (btnGo == dm->___nextQuestionButton) || (dm->___nextQuestionButton != NULL && btn == GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(dm->___nextQuestionButton, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var));
\t\t\tbool isEnd = (btnGo == dm->___endInterviewButton) || (dm->___endInterviewButton != NULL && btn == GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(dm->___endInterviewButton, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var));

\t\t\tif (!isDone && !isNext && !isEnd)
\t\t\t{
\t\t\t\tString_t* goName = Object_get_name_mAC2F6B897CF1303BA4249B4CB55271AFACBB6392(btnGo, NULL);
\t\t\t\tif (goName != NULL)
\t\t\t\t{
\t\t\t\t\tif (String_Contains_m6D77B121FADA7CA5F397C0FABB65DA62DF03B6C3(goName, il2cpp_string_new("Stop"), NULL) ||
\t\t\t\t\t    String_Contains_m6D77B121FADA7CA5F397C0FABB65DA62DF03B6C3(goName, il2cpp_string_new("Done"), NULL))
\t\t\t\t\t{
\t\t\t\t\t\tisDone = true;
\t\t\t\t\t}
\t\t\t\t\telse if (String_Contains_m6D77B121FADA7CA5F397C0FABB65DA62DF03B6C3(goName, il2cpp_string_new("Next"), NULL))
\t\t\t\t\t{
\t\t\t\t\t\tisNext = true;
\t\t\t\t\t}
\t\t\t\t\telse if (String_Contains_m6D77B121FADA7CA5F397C0FABB65DA62DF03B6C3(goName, il2cpp_string_new("End"), NULL))
\t\t\t\t\t{
\t\t\t\t\t\tisEnd = true;
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}

\t\t\tif (isDone)
\t\t\t{
\t\t\t\tDialogueManager_OnDoneAnsweringClicked(dm, NULL);
\t\t\t}
\t\t\telse if (isNext)
\t\t\t{
\t\t\t\tDialogueManager_OnNextQuestionClicked(dm, NULL);
\t\t\t}
\t\t\telse if (isEnd)
\t\t\t{
\t\t\t\tDialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919(dm, NULL);
\t\t\t}
\t\t}
\t}
}
"""

idx_hti_start = content.find("// Method Definition Index: 71807\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_HandleTriggerInput_mBE124C9C0B94F31B93C0D9419EB160CFD34494FC")
idx_hti_end = content.find("// Method Definition Index: 71809\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle__ctor_m6C8B76ECE9CAE25C4FC6E43EEFD1C6D3F2EAA599", idx_hti_start)
assert idx_hti_start != -1 and idx_hti_end != -1, "HandleTriggerInput bounds not found"

content = content[:idx_hti_start] + new_trigger_input + "\n" + content[idx_hti_end:]
print("11. Replaced VRGazeReticle_HandleTriggerInput and TriggerClick definitions")

# -------------------------------------------------------------
# 12. Local Whisper bypass in U3CStopRecordingU3Ed__31_MoveNext
# -------------------------------------------------------------
whisper_target = """\t\t\t__this->___U3CaudioStoragePathU3E5__2 = L_80;
\t\t\tIl2CppCodeGenWriteBarrier((void**)(&__this->___U3CaudioStoragePathU3E5__2), (void*)L_80);"""

whisper_replacement = """\t\t\t__this->___U3CaudioStoragePathU3E5__2 = L_80;
\t\t\tIl2CppCodeGenWriteBarrier((void**)(&__this->___U3CaudioStoragePathU3E5__2), (void*)L_80);

\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][RECORDING_STOPPED]");
\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][WAV_SAVED]");
\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][TRANSCRIPT_HANDOFF]");

\t\t\tUaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* L_vrBridge = UaaLBridge_get_Instance_mC704985B67D85B378A99F9C2D52DE746FFC2869A_inline(NULL);
\t\t\tif (L_vrBridge != NULL)
\t\t{
\t\t\t\tUaaLBridge_SendTranscriptReady_mC346AC999A0B0926C24E9459A69F3EE5CA4B6A6E(L_vrBridge, L_80, NULL);
\t\t\t\tgoto IL_0347_1;
\t\t}"""

if whisper_target in content and "[VR][WAV_SAVED]" not in content:
    content = content.replace(whisper_target, whisper_replacement, 1)
    print("12. Bypassed local Whisper in U3CStopRecordingU3Ed__31_MoveNext")

with open(cpp_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ALL PATCHES APPLIED TO Assembly-CSharp.cpp")
