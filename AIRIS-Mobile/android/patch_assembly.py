import sys

cpp_path = 'android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp'

with open(cpp_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. RecordingManager_SaveAndUploadRecording: return V_1 instead of empty string
old_ret = """\t\tRecordingManager_SaveWavFile_m6C9CEC9FAFA9B4467F5DA5555A75FB94FDFC002B(__this, L_8, L_9, L_10, NULL);
\t\tString_t* L_11 = V_1;
\t\tString_t* L_12;
\t\tL_12 = String_Concat_m9E3155FB84015C823606188F53B47CB44C444991(_stringLiteral4E74425EDBA23A4BDC02EF5B0A36EC9173D6A2AD, L_11, NULL);
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_12, NULL);
\t\treturn _stringLiteralDA39A3EE5E6B4B0D3255BFEF95601890AFD80709;"""

new_ret = """\t\tRecordingManager_SaveWavFile_m6C9CEC9FAFA9B4467F5DA5555A75FB94FDFC002B(__this, L_8, L_9, L_10, NULL);
\t\tString_t* L_11 = V_1;
\t\tString_t* L_12;
\t\tL_12 = String_Concat_m9E3155FB84015C823606188F53B47CB44C444991(_stringLiteral4E74425EDBA23A4BDC02EF5B0A36EC9173D6A2AD, L_11, NULL);
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_12, NULL);
\t\treturn V_1;"""

assert old_ret in content, "old_ret not found in SaveAndUploadRecording"
content = content.replace(old_ret, new_ret, 1)
print("1. Fixed SaveAndUploadRecording to return V_1 (WAV file path)")

# 2. RecordingManager__ctor: 5.0f silenceDuration and 1.0f minimumRecordingTime, 0.0040f silenceThreshold
old_ctor = """\t\t__this->___silenceThreshold = (0.0179999992f);
\t\t__this->___silenceDuration = (7.0f);
\t\t__this->___minimumRecordingTime = (3.5f);
\t\t__this->___maxInitialSilenceTime = (15.0f);
\t\t__this->___maximumRecordingTime = (90.0f);"""

new_ctor = """\t\t__this->___silenceThreshold = (0.0040f);
\t\t__this->___silenceDuration = (5.0f);
\t\t__this->___minimumRecordingTime = (1.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);
\t\t__this->___maximumRecordingTime = (90.0f);"""

assert old_ctor in content, "old_ctor not found in RecordingManager__ctor"
content = content.replace(old_ctor, new_ctor, 1)
print("2. Set silenceDuration to 5.0f, minimumRecordingTime to 1.0f, silenceThreshold to 0.0040f in ctor")

# 3. RecordingManager_StartRecording: enforce runtime values to override any serialized scene inspector values
old_start_rec = """\t\tfloat L_24;
\t\tL_24 = Time_get_time_m3A271BB1B20041144AC5B7863B71AB1F0150374B(NULL);
\t\t__this->___recordingStartTime = L_24;
\t\t__this->___speechDetected = (bool)0;
\t\t__this->___calibrationComplete = (bool)0;
\t\t__this->___currentSilenceTime = (0.0f);
\t\t__this->___currentVolume = (0.0f);
\t\t__this->___currentPeak = (0.0f);
\t\t__this->___smoothedVolume = (0.0f);
\t\t__this->___ambientNoiseFloor = (0.00200000009f);"""

new_start_rec = """\t\tfloat L_24;
\t\tL_24 = Time_get_time_m3A271BB1B20041144AC5B7863B71AB1F0150374B(NULL);
\t\t__this->___recordingStartTime = L_24;
\t\t__this->___speechDetected = (bool)0;
\t\t__this->___calibrationComplete = (bool)0;
\t\t__this->___currentSilenceTime = (0.0f);
\t\t__this->___currentVolume = (0.0f);
\t\t__this->___currentPeak = (0.0f);
\t\t__this->___smoothedVolume = (0.0f);
\t\t__this->___ambientNoiseFloor = (0.00200000009f);
\t\t__this->___silenceThreshold = (0.0040f);
\t\t__this->___silenceDuration = (5.0f);
\t\t__this->___minimumRecordingTime = (1.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);"""

assert old_start_rec in content, "old_start_rec not found in RecordingManager_StartRecording"
content = content.replace(old_start_rec, new_start_rec, 1)
print("3. Enforced runtime silence parameters (5.0s silence) in RecordingManager_StartRecording")

# 4. DialogueManager buttons removal: disable VR button creation and hide all controls
old_buttons = """\t// Check if our VR buttons are already children of this Canvas
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

\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All 3 buttons ensured at dedicated lower VR area (y=-260)");"""

new_buttons = """\t// Disable all VR buttons cleanly - interaction is voice and silence driven
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* endTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("EndInterviewButton_VR"), NULL);
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* nextTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("NextQuestionButton_VR"), NULL);
\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* stopTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("StopRecordingButton_VR"), NULL);

\tif (endTr != NULL) GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)endTr, NULL), (bool)0, NULL);
\tif (nextTr != NULL) GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)nextTr, NULL), (bool)0, NULL);
\tif (stopTr != NULL) GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)stopTr, NULL), (bool)0, NULL);

\tif (IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t}
\tif (IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
\t}
\tif (IsValidUnityObject((RuntimeObject*)__this->___endInterviewButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___endInterviewButton, (bool)0, NULL);
\t}
\tif (IsValidUnityObject((RuntimeObject*)__this->___listeningPanel))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, (bool)0, NULL);
\t}

\t__this->___endInterviewButton = NULL;
\t__this->___nextQuestionButton = NULL;
\t__this->___stopRecordingButton = NULL;

\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All buttons hidden and disabled. VR interaction is voice & silence driven.");"""

assert old_buttons in content, "old_buttons not found in EnsureStopRecordingButton"
content = content.replace(old_buttons, new_buttons, 1)
print("4. Removed all VR buttons cleanly from DialogueManager")

# 5. DialogueManager_Start: DO NOT hide speech bubble on scene start!
old_dm_start = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_Start_m4C2D94B2DD22F681BF418599E65069676ABF4750 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		DialogueManager_AlignCanvasToCamera_m6283568B3E1D6325FD1E394444AD7F473D4E67B5(__this, NULL);
		DialogueManager_HideSpeech_mF2561CD4DC99F9685993B4821272D95E2239D17E(__this, NULL);
		DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
		return;
	}
}"""

new_dm_start = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_Start_m4C2D94B2DD22F681BF418599E65069676ABF4750 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		DialogueManager_AlignCanvasToCamera_m6283568B3E1D6325FD1E394444AD7F473D4E67B5(__this, NULL);
		// Note: Do NOT hide speech bubble here so incoming/active question is not destroyed
		DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
		return;
	}
}"""

assert old_dm_start in content, "old_dm_start not found in DialogueManager_Start"
content = content.replace(old_dm_start, new_dm_start, 1)
print("5. Removed DialogueManager_HideSpeech from DialogueManager_Start")

# 6. DialogueManager_ShowSpeaker: do NOT align canvas to camera on every ShowSpeaker call (preserves room stability)
print("6. Skipped AlignCanvasToCamera in ShowSpeaker to preserve room stability")

# 7. Speech bubble positioning: set to y = 210.0f (above avatar head), overflowMode 0 (Overflow, NOT Ellipsis), auto-size 18-24
old_bubble_cfg = """\t\tconst float kMaxBubbleW = 620.0f;
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
\t\tTMP_Text_set_alignment_mE5216A28797987CC19927ED3CB8DFAC438C6B95A(txt, 514, NULL);"""

new_bubble_cfg = """\t\tconst float kMaxBubbleW = 760.0f;
\t\tconst float kMinBubbleW = 460.0f;
\t\tconst float kPadX = 52.0f;
\t\tconst float kPadY = 32.0f;
\t\tconst float kMaxTextW = kMaxBubbleW - kPadX;
\t\tconst float kMinTextW = kMinBubbleW - kPadX;

\t\tconst float kMinBubbleH = 100.0f;
\t\tconst float kMaxBubbleH = 260.0f;

\t\tTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* txt = __this->___text;
\t\tNullCheck(txt);

\t\t// 1. TextMeshPro configuration: wrap, auto-size 20..26, NO ELLIPSIS (overflowMode 0), center alignment
\t\tTMP_Text_set_enableWordWrapping_mFAEE849315B4723F9C86C127B1A59EF50BE1C12F(txt, (bool)1, NULL);
\t\tTMP_Text_set_enableAutoSizing_mDD34BC7AA735EEBEB916FF5C9791B1502F65FBCA(txt, (bool)1, NULL);
\t\tTMP_Text_set_fontSizeMin_mEAF970BB9CA053DF953AF83E638EA0F1D885358F(txt, 20.0f, NULL);
\t\tTMP_Text_set_fontSizeMax_mC84B7090F5CE69BA63556A71FD63ABD67C911750(txt, 26.0f, NULL);
\t\tTMP_Text_set_overflowMode_mB8911BA07CEE0AC1E4E108B5EB79B230F90E96A1(txt, 0, NULL);
\t\tTMP_Text_set_alignment_mE5216A28797987CC19927ED3CB8DFAC438C6B95A(txt, 514, NULL);"""

assert old_bubble_cfg in content, "old_bubble_cfg not found"
content = content.replace(old_bubble_cfg, new_bubble_cfg, 1)

old_bubble_pos = """\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos;
\t\tmemset((&bubblePos), 0, sizeof(bubblePos));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), 0.0f, 240.0f, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);"""

new_bubble_pos = """\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos;
\t\tmemset((&bubblePos), 0, sizeof(bubblePos));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), 0.0f, 370.0f, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);"""

assert old_bubble_pos in content, "old_bubble_pos not found"
content = content.replace(old_bubble_pos, new_bubble_pos, 1)
print("7. Positioned speech bubble to y = 370.0f (above avatar head) with overflowMode 0 and font size 20..26")

# 7b. ResizeSpeechBubbleCoroutine: bypass activeInHierarchy check so it never prematurely aborts
old_coroutine_check = """\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_9 = __this->___bubbleRoot;
\t\tNullCheck(L_9);
\t\tbool L_10;
\t\tL_10 = GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(L_9, NULL);
\t\tif (L_10)
\t\t{
\t\t\tgoto IL_0064;
\t\t}"""

new_coroutine_check = """\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_9 = __this->___bubbleRoot;
\t\tNullCheck(L_9);
\t\tbool L_10;
\t\tL_10 = GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(L_9, NULL);
\t\tgoto IL_0064;"""

assert old_coroutine_check in content, "old_coroutine_check not found"
content = content.replace(old_coroutine_check, new_coroutine_check, 1)
print("7b. Bypassed activeInHierarchy check in ResizeSpeechBubbleCoroutine")

# 8. MonitorSilence: replace hardcoded clamps so speech threshold is strictly >= 0.0040 and silence threshold is >= 0.0025
old_clamps = """\t\t(L_44)->SetAt(static_cast<il2cpp_array_size_t>(0), (float)((float)il2cpp_codegen_add(((float)il2cpp_codegen_multiply(L_46, (2.5f))), (0.00800000038f))));
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_47 = L_44;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_48 = V_1;
\t\tNullCheck(L_48);
\t\tfloat L_49 = L_48->___silenceThreshold;
\t\tNullCheck(L_47);
\t\t(L_47)->SetAt(static_cast<il2cpp_array_size_t>(1), (float)L_49);
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_50 = L_47;
\t\tNullCheck(L_50);
\t\t(L_50)->SetAt(static_cast<il2cpp_array_size_t>(2), (float)(0.0179999992f));
\t\tfloat L_51;
\t\tL_51 = Mathf_Max_m870B77F6A5225EC21D9778043F987B9B17D08F6B_inline(L_50, NULL);
\t\tV_6 = L_51;
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_52 = (SingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C*)(SingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C*)SZArrayNew(SingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C_il2cpp_TypeInfo_var, (uint32_t)3);
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_53 = L_52;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_54 = V_1;
\t\tNullCheck(L_54);
\t\tfloat L_55 = L_54->___ambientNoiseFloor;
\t\tNullCheck(L_53);
\t\t(L_53)->SetAt(static_cast<il2cpp_array_size_t>(0), (float)((float)il2cpp_codegen_add(((float)il2cpp_codegen_multiply(L_55, (1.5f))), (0.00400000019f))));
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_56 = L_53;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_57 = V_1;
\t\tNullCheck(L_57);
\t\tfloat L_58 = L_57->___silenceThreshold;
\t\tNullCheck(L_56);
\t\t(L_56)->SetAt(static_cast<il2cpp_array_size_t>(1), (float)((float)il2cpp_codegen_multiply(L_58, (0.75f))));
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_59 = L_56;
\t\tNullCheck(L_59);
\t\t(L_59)->SetAt(static_cast<il2cpp_array_size_t>(2), (float)(0.0140000004f));"""

new_clamps = """\t\t(L_44)->SetAt(static_cast<il2cpp_array_size_t>(0), (float)((float)il2cpp_codegen_add(((float)il2cpp_codegen_multiply(L_46, (2.0f))), (0.00200000000f))));
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_47 = L_44;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_48 = V_1;
\t\tNullCheck(L_48);
\t\tfloat L_49 = (0.00400000000f);
\t\tNullCheck(L_47);
\t\t(L_47)->SetAt(static_cast<il2cpp_array_size_t>(1), (float)L_49);
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_50 = L_47;
\t\tNullCheck(L_50);
\t\t(L_50)->SetAt(static_cast<il2cpp_array_size_t>(2), (float)(0.00400000000f));
\t\tfloat L_51;
\t\tL_51 = Mathf_Max_m870B77F6A5225EC21D9778043F987B9B17D08F6B_inline(L_50, NULL);
\t\tV_6 = L_51;
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_52 = (SingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C*)(SingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C*)SZArrayNew(SingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C_il2cpp_TypeInfo_var, (uint32_t)3);
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_53 = L_52;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_54 = V_1;
\t\tNullCheck(L_54);
\t\tfloat L_55 = L_54->___ambientNoiseFloor;
\t\tNullCheck(L_53);
\t\t(L_53)->SetAt(static_cast<il2cpp_array_size_t>(0), (float)((float)il2cpp_codegen_add(((float)il2cpp_codegen_multiply(L_55, (1.2f))), (0.00100000000f))));
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_56 = L_53;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_57 = V_1;
\t\tNullCheck(L_57);
\t\tfloat L_58 = (0.00250000000f);
\t\tNullCheck(L_56);
\t\t(L_56)->SetAt(static_cast<il2cpp_array_size_t>(1), (float)L_58);
\t\tSingleU5BU5D_t89DEFE97BCEDB5857010E79ECE0F52CF6E93B87C* L_59 = L_56;
\t\tNullCheck(L_59);
\t\t(L_59)->SetAt(static_cast<il2cpp_array_size_t>(2), (float)(0.00250000000f));"""

assert old_clamps in content, "old_clamps not found"
content = content.replace(old_clamps, new_clamps, 1)
print("8. Fixed speech/silence threshold clamps to 0.0040f / 0.0025f")

# 9. VRGazeReticle: completely eliminate gaze reticle visuals & raycasting (no gaze dot artifacts)
old_reticle_awake = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_Awake_m7172E8CEA1EB396C009383D6CE6EBD3CF6BA9D65 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;"""

new_reticle_awake = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_Awake_m7172E8CEA1EB396C009383D6CE6EBD3CF6BA9D65 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tif (__this != NULL)
\t{
\t\tif (IsValidUnityObject((RuntimeObject*)__this->___reticleTransform))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(
\t\t\t\tComponent_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)__this->___reticleTransform, NULL),
\t\t\t\t(bool)0, NULL);
\t\t\t__this->___reticleTransform = NULL;
\t\t}
\t\tif (IsValidUnityObject((RuntimeObject*)__this->___reticleRenderer))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(
\t\t\t\tComponent_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)__this->___reticleRenderer, NULL),
\t\t\t\t(bool)0, NULL);
\t\t\t__this->___reticleRenderer = NULL;
\t\t}
\t\tif (IsValidUnityObject((RuntimeObject*)__this->___progressRadialImage))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(
\t\t\t\tComponent_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)__this->___progressRadialImage, NULL),
\t\t\t\t(bool)0, NULL);
\t\t\t__this->___progressRadialImage = NULL;
\t\t}
\t}
\treturn;
\tstatic bool s_Il2CppMethodInitialized;"""

assert old_reticle_awake in content, "old_reticle_awake not found"
content = content.replace(old_reticle_awake, new_reticle_awake, 1)

old_reticle_update = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_Update_mF3144F9651ED8ADFD729DF67FEF503CDA2592AE8 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;"""

new_reticle_update = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_Update_mF3144F9651ED8ADFD729DF67FEF503CDA2592AE8 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\treturn;
\tstatic bool s_Il2CppMethodInitialized;"""

assert old_reticle_update in content, "old_reticle_update not found"
content = content.replace(old_reticle_update, new_reticle_update, 1)

old_ensure_reticle = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_EnsureReticleVisual_m6E15906D81420A03152D85CCCBE4C8B12D5321EF (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;"""

new_ensure_reticle = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_EnsureReticleVisual_m6E15906D81420A03152D85CCCBE4C8B12D5321EF (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\treturn;
\tstatic bool s_Il2CppMethodInitialized;"""

assert old_ensure_reticle in content, "old_ensure_reticle not found in Assembly-CSharp.cpp"
content = content.replace(old_ensure_reticle, new_ensure_reticle, 1)
print("9. Completely disabled gaze reticle visual creation & update (no gaze dots)")

with open(cpp_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: All 9 patches applied to Assembly-CSharp.cpp!")
