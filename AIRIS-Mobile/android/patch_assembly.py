import sys
import re

cpp_path = 'android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp'

with open(cpp_path, 'r', encoding='utf-8') as f:
    content = f.read()

def apply_patch(name, old_str, new_str, text):
    if new_str in text:
        print(f"[PATCH] Already present: {name}")
    elif old_str in text:
        text = text.replace(old_str, new_str, 1)
        print(f"[PATCH] Applied: {name}")
    else:
        print(f"[PATCH] Target pattern not found for: {name}")
    return text

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

content = apply_patch("1. Return V_1 in SaveAndUploadRecording", old_ret, new_ret, content)

# 2. RecordingManager__ctor: 3.0f silenceDuration, 2.0f minimumRecordingTime, 0.0040f silenceThreshold, 60.0f maximumRecordingTime
old_ctor_clean = """\t\t__this->___silenceThreshold = (0.0179999992f);
\t\t__this->___silenceDuration = (7.0f);
\t\t__this->___minimumRecordingTime = (3.5f);
\t\t__this->___maxInitialSilenceTime = (15.0f);
\t\t__this->___maximumRecordingTime = (90.0f);"""

old_ctor_alt = """\t\t__this->___silenceThreshold = (0.0045f);
\t\t__this->___silenceDuration = (2.5f);
\t\t__this->___minimumRecordingTime = (1.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);
\t\t__this->___maximumRecordingTime = (60.0f);"""

old_ctor_30 = """\t\t__this->___silenceThreshold = (0.0040f);
\t\t__this->___silenceDuration = (3.0f);
\t\t__this->___minimumRecordingTime = (2.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);
\t\t__this->___maximumRecordingTime = (60.0f);"""

new_ctor = """\t\t__this->___silenceThreshold = (0.0040f);
\t\t__this->___silenceDuration = (3.5f);
\t\t__this->___minimumRecordingTime = (2.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);
\t\t__this->___maximumRecordingTime = (60.0f);"""

if new_ctor in content:
    print("[PATCH] Already present: 2. silence parameters in RecordingManager__ctor")
elif old_ctor_30 in content:
    content = apply_patch("2. silence parameters in RecordingManager__ctor (from 3.0)", old_ctor_30, new_ctor, content)
elif old_ctor_clean in content:
    content = apply_patch("2. silence parameters in RecordingManager__ctor (from clean)", old_ctor_clean, new_ctor, content)
elif old_ctor_alt in content:
    content = apply_patch("2. silence parameters in RecordingManager__ctor (from alt)", old_ctor_alt, new_ctor, content)

# 3. RecordingManager_StartRecording: enforce runtime values to override any serialized scene inspector values
old_start_rec_clean = """\t\tfloat L_24;
\t\tL_24 = Time_get_time_m3A271BB1B20041144AC5B7863B71AB1F0150374B(NULL);
\t\t__this->___recordingStartTime = L_24;
\t\t__this->___speechDetected = (bool)0;
\t\t__this->___calibrationComplete = (bool)0;
\t\t__this->___currentSilenceTime = (0.0f);
\t\t__this->___currentVolume = (0.0f);
\t\t__this->___currentPeak = (0.0f);
\t\t__this->___smoothedVolume = (0.0f);
\t\t__this->___ambientNoiseFloor = (0.00200000009f);"""

old_start_rec_30 = """\t\tfloat L_24;
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
\t\t__this->___silenceDuration = (3.0f);
\t\t__this->___minimumRecordingTime = (2.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);
\t\t__this->___maximumRecordingTime = (60.0f);"""

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
\t\t__this->___silenceDuration = (3.5f);
\t\t__this->___minimumRecordingTime = (2.0f);
\t\t__this->___maxInitialSilenceTime = (10.0f);
\t\t__this->___maximumRecordingTime = (60.0f);"""

if new_start_rec in content:
    print("[PATCH] Already present: 3. Enforce silence parameters in StartRecording")
elif old_start_rec_30 in content:
    content = apply_patch("3. Enforce silence parameters in StartRecording (from 3.0)", old_start_rec_30, new_start_rec, content)
else:
    content = apply_patch("3. Enforce silence parameters in StartRecording", old_start_rec_clean, new_start_rec, content)

# 4. Injected EnsureListeningBackground definition above EnsureEndInterviewButton
ensure_listening_bg_code = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Transform_SetAsFirstSibling_mBE0D0E76099F829466DC2FBD71ACFCF3C8EC03BD (Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Sprite_tAFF74BC83CD68037494CB0B4F28CBDF8971CAB99* Image_get_sprite_mB2AA377708722E100574F6F75BC102513BB3BCB1 (Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Image_set_sprite_mC0C248340BA27AAEE56855A3FAFA0D8CA12956DE (Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* __this, Sprite_tAFF74BC83CD68037494CB0B4F28CBDF8971CAB99* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Image_set_type_mECB8D34772AA393FFBC867B03D18EA0F1A8546BF (Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* __this, int32_t ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Quaternion_tDA59F214EF07D7700B26E40E562F267AF7306974 Transform_get_localRotation_mD53D37611A5DAE93EC6C7BBCAC337408C5CACA77 (Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Transform_set_localRotation_mAB4A011D134BA58AB780BECC0025CA65F16185FA (Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* __this, Quaternion_tDA59F214EF07D7700B26E40E562F267AF7306974 ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 RectTransform_get_anchorMin_mD85363930BE38EC188F933B9F4D58320CAB72F03 (RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 RectTransform_get_anchorMax_mEF870BE2A134CEB9C2326930A71D3961271297DB (RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 RectTransform_get_pivot_mA8334AF05AA7FF09A173A2430F2BB9E85E5CBFFF (RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR float TMP_Text_get_preferredWidth_mE30D1F5B8573BD0A558054D004A53DE868BD208A (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR float TMP_Text_get_preferredHeight_m4F28E8FB388AFF1DC052F5F982DB2F959598B004 (TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* __this, const RuntimeMethod* method) ;

static bool IsOneOnOneScene()
{
	Scene_tA1DC762B79745EB5140F054C884855B922318356 scene = SceneManager_GetActiveScene_m0B320EC4302F51A71495D1CCD1A0FF9C2ED1FDC8(NULL);
	String_t* sceneName = Scene_get_name_m3C818DFA663E159274DAD823B780C7616C5E2A8C(&scene, NULL);
	return sceneName != NULL && String_op_Equality_m030E1B219352228970A076136E455C4E568C02C1(sceneName, il2cpp_string_new("OneOnOne"), NULL);
}

static GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* OneOnOneQuestionPanel(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm)
{
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* root = dm->___speechBubble;
	TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* text = dm->___speechText;
	if (dm->___interviewerSpeechBubbles != NULL && (((RuntimeArray*)dm->___interviewerSpeechBubbles)->max_length) > 0)
	{
		GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* first = (dm->___interviewerSpeechBubbles)->GetAt(0);
		if (IsValidUnityObject((RuntimeObject*)first)) root = first;
	}
	if (dm->___interviewerSpeechTexts != NULL && (((RuntimeArray*)dm->___interviewerSpeechTexts)->max_length) > 0)
	{
		TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* first = (dm->___interviewerSpeechTexts)->GetAt(0);
		if (IsValidUnityObject((RuntimeObject*)first)) text = first;
	}
	if (!IsValidUnityObject((RuntimeObject*)root) || !IsValidUnityObject((RuntimeObject*)text)) return NULL;
	return DialogueManager_FindActualBubblePanel_m85A07EC999B8D34A4E569A121DB46D1CB9077A97(dm, root, text, NULL);
}

static GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* PanelQuestionPanel(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm)
{
	if (dm == NULL) return NULL;
	if (dm->___interviewerSpeechBubbles != NULL)
	{
		int32_t bubbleCount = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)dm->___interviewerSpeechBubbles)->max_length),NULL));
		int32_t textCount = dm->___interviewerSpeechTexts != NULL
			? (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)dm->___interviewerSpeechTexts)->max_length),NULL)) : 0;
		for (int32_t i = 0; i < bubbleCount; ++i)
		{
			GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* root = dm->___interviewerSpeechBubbles->GetAt(i);
			if (IsValidUnityObject((RuntimeObject*)root) && GameObject_get_activeSelf_m4F3E5240E138B66AAA080EA30759A3D0517DA368(root, NULL))
			{
				TMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9* text = i < textCount ? dm->___interviewerSpeechTexts->GetAt(i) : NULL;
				if (!IsValidUnityObject((RuntimeObject*)text)) text = dm->___speechText;
				if (!IsValidUnityObject((RuntimeObject*)text))
				{
					TMP_TextU5BU5D_t12384CBAF397196B9A7886087BDC8C19D800C24F* texts = GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D(root, (bool)1, GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D_RuntimeMethod_var);
					if (texts != NULL && (((RuntimeArray*)texts)->max_length) > 0) text = texts->GetAt(0);
				}
				if (IsValidUnityObject((RuntimeObject*)text))
					return DialogueManager_FindActualBubblePanel_m85A07EC999B8D34A4E569A121DB46D1CB9077A97(dm, root, text, NULL);
			}
		}
	}
	if (IsValidUnityObject((RuntimeObject*)dm->___speechBubble) && IsValidUnityObject((RuntimeObject*)dm->___speechText) &&
		GameObject_get_activeSelf_m4F3E5240E138B66AAA080EA30759A3D0517DA368(dm->___speechBubble, NULL))
	{
		return DialogueManager_FindActualBubblePanel_m85A07EC999B8D34A4E569A121DB46D1CB9077A97(dm, dm->___speechBubble, dm->___speechText, NULL);
	}
	return NULL;
}

static void EnsureListeningBackground(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm)
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}

	if (dm == NULL || !IsValidUnityObject((RuntimeObject*)dm->___listeningPanel)) return;
	if (!IsOneOnOneScene() && !IsValidUnityObject((RuntimeObject*)PanelQuestionPanel(dm)))
	{
		__android_log_print(ANDROID_LOG_WARN, "Unity", "[AIRIS][PanelPill] No active question bubble; hiding status panel");
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(dm->___listeningPanel, (bool)0, NULL);
		return;
	}

	if (!IsValidUnityObject((RuntimeObject*)dm->___listeningStatusText))
	{
		TMP_TextU5BU5D_t12384CBAF397196B9A7886087BDC8C19D800C24F* texts = GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D(dm->___listeningPanel, (bool)1, GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D_RuntimeMethod_var);
		if (texts != NULL && (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)texts)->max_length),NULL)) > 0)
		{
			dm->___listeningStatusText = texts->GetAt(0);
			Il2CppCodeGenWriteBarrier((void**)(&dm->___listeningStatusText), (void*)texts->GetAt(0));
		}
	}

	if (!IsValidUnityObject((RuntimeObject*)dm->___listeningStatusText)) return;

	Color_tD001788D726C3A7F1379BEED0260B9591F440C1F colNavy;
	Color__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colNavy), 0.12f, 0.23f, 0.37f, 1.0f, NULL);
	VirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, (Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)dm->___listeningStatusText, colNavy);
	TMP_Text_set_fontSize_m1C3A3BA2BC88E5E1D89375FD35A0AA91E75D3AAD(dm->___listeningStatusText, 24.0f, NULL);
	TMP_Text_set_alignment_mE5216A28797987CC19927ED3CB8DFAC438C6B95A(dm->___listeningStatusText, 514, NULL);

	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* lpTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(dm->___listeningPanel, NULL);
	if (lpTr == NULL) return;

	// Reparent ListeningPanel to question canvas and position cleanly below question bubble
	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* canvasTr = NULL;
	float targetY = 230.0f;

	if (IsOneOnOneScene())
	{
		GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* bubble = OneOnOneQuestionPanel(dm);
		if (IsValidUnityObject((RuntimeObject*)bubble))
		{
			Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* bubbleTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(bubble, NULL);
			if (bubbleTr != NULL) canvasTr = Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E(bubbleTr, NULL);
		}
	}
	else
	{
		GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* bubble = PanelQuestionPanel(dm);
		if (IsValidUnityObject((RuntimeObject*)bubble))
		{
			Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* bubbleTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(bubble, NULL);
			if (bubbleTr != NULL) canvasTr = Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E(bubbleTr, NULL);
		}
	}

	if (canvasTr != NULL && Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E(lpTr, NULL) != canvasTr)
	{
		Transform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(lpTr, canvasTr, (bool)0, NULL);
	}

	RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* lpRt = GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(dm->___listeningPanel, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
	if (lpRt != NULL)
	{
		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_center;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_center), 0.5f, 0.5f, NULL);
		RectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(lpRt, v_center, NULL);
		RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(lpRt, v_center, NULL);
		RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(lpRt, v_center, NULL);
		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 lpPos;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&lpPos), 0.0f, targetY, NULL);
		RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(lpRt, lpPos, NULL);
	}

	// Disable any legacy image directly on listeningPanel so it doesn't draw an old rect
	Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* lpImg = GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D(dm->___listeningPanel, GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
	if (lpImg != NULL)
	{
		Behaviour_set_enabled_mF1DCFE60EB09E0529FE9476CA804A3AA2D72B16A((Behaviour_t01970CFBBA658497AE30F311C447DB0440BAB7FA*)lpImg, (bool)0, NULL);
	}

	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* bgTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(lpTr, il2cpp_string_new("ListeningBackground_VR"), NULL);
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* bgGo = NULL;
	Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* bgImg = NULL;
	RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* bgRt = NULL;

	if (bgTr == NULL)
	{
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* bgCompTypes = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)3);
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		bgCompTypes->SetAt(0, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var) }, NULL));
		bgCompTypes->SetAt(1, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var) }, NULL));
		bgCompTypes->SetAt(2, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_0_0_0_var) }, NULL));

		bgGo = (GameObject_t76FEDD663AB33C991A9C9A23129337651094216F*)il2cpp_codegen_object_new(GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
		GameObject__ctor_m721D643351E55308EA4F5F41B67D5446D11C61F0(bgGo, il2cpp_string_new("ListeningBackground_VR"), bgCompTypes, NULL);

		bgTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(bgGo, NULL);
		Transform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(bgTr, lpTr, (bool)0, NULL);
		Transform_SetAsFirstSibling_mBE0D0E76099F829466DC2FBD71ACFCF3C8EC03BD(bgTr, NULL);

		bgImg = GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D(bgGo, GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
		if (bgImg != NULL)
		{
			// Try to get rounded sprite from speech bubble
			Sprite_tAFF74BC83CD68037494CB0B4F28CBDF8971CAB99* bubbleSpr = NULL;
			GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* refBubble = IsOneOnOneScene() ? dm->___speechBubble : PanelQuestionPanel(dm);
			if (!IsValidUnityObject((RuntimeObject*)refBubble)) refBubble = dm->___speechBubble;
			if (!IsValidUnityObject((RuntimeObject*)refBubble) && dm->___interviewerSpeechBubbles != NULL && (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)dm->___interviewerSpeechBubbles)->max_length),NULL)) > 1)
			{
				refBubble = (dm->___interviewerSpeechBubbles)->GetAt(static_cast<il2cpp_array_size_t>(1));
			}
			if (IsValidUnityObject((RuntimeObject*)refBubble))
			{
				Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* refImg = GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D(refBubble, GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
				if (refImg != NULL)
				{
					bubbleSpr = Image_get_sprite_mB2AA377708722E100574F6F75BC102513BB3BCB1(refImg, NULL);
				}
			}
			if (bubbleSpr != NULL)
			{
				Image_set_sprite_mC0C248340BA27AAEE56855A3FAFA0D8CA12956DE(bgImg, bubbleSpr, NULL);
				Image_set_type_mECB8D34772AA393FFBC867B03D18EA0F1A8546BF(bgImg, 1, NULL);
			}
			Color_tD001788D726C3A7F1379BEED0260B9591F440C1F colWhite;
			Color__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colWhite), 1.0f, 1.0f, 1.0f, 0.96f, NULL);
			VirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, bgImg, colWhite);
			Graphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)bgImg, (bool)0, NULL);
		}
	}
	else
	{
		bgGo = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)bgTr, NULL);
		Transform_SetAsFirstSibling_mBE0D0E76099F829466DC2FBD71ACFCF3C8EC03BD(bgTr, NULL);
	}

	if (bgGo != NULL)
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(bgGo, (bool)1, NULL);
		bgRt = GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(bgGo, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);

		RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* txtRt = dm->___listeningStatusText->___m_rectTransform;
		if (bgRt != NULL && txtRt != NULL)
		{
			Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 aMin = RectTransform_get_anchorMin_mD85363930BE38EC188F933B9F4D58320CAB72F03(txtRt, NULL);
			Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 aMax = RectTransform_get_anchorMax_mEF870BE2A134CEB9C2326930A71D3961271297DB(txtRt, NULL);
			Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 piv = RectTransform_get_pivot_mA8334AF05AA7FF09A173A2430F2BB9E85E5CBFFF(txtRt, NULL);
			Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 pos = RectTransform_get_anchoredPosition_m38F25A4253B0905BB058BE73DBF43C7172CE0680(txtRt, NULL);

			RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(bgRt, aMin, NULL);
			RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(bgRt, aMax, NULL);
			RectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(bgRt, piv, NULL);
			RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bgRt, pos, NULL);

			float prefW = TMP_Text_get_preferredWidth_mE30D1F5B8573BD0A558054D004A53DE868BD208A(dm->___listeningStatusText, NULL);
			float prefH = TMP_Text_get_preferredHeight_m4F28E8FB388AFF1DC052F5F982DB2F959598B004(dm->___listeningStatusText, NULL);

			float bgW = (prefW > 10.0f) ? (prefW + 64.0f) : 520.0f;
			float bgH = (prefH > 10.0f) ? (prefH + 28.0f) : 60.0f;
			if (!IsOneOnOneScene() && lpRt != NULL)
			{
				// Panel's serialized status text has an offset from its parent. Make the
				// visible background and text share the root rect used for placement.
				Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 center;
				Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&center), 0.5f, 0.5f, NULL);
				Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 zero;
				Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&zero), 0.0f, 0.0f, NULL);
				Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 rootSize;
				Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&rootSize), bgW, bgH, NULL);
				RectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(lpRt, rootSize, NULL);
				RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(bgRt, center, NULL);
				RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(bgRt, center, NULL);
				RectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(bgRt, center, NULL);
				RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bgRt, zero, NULL);
				RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(txtRt, center, NULL);
				RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(txtRt, center, NULL);
				RectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(txtRt, center, NULL);
				RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(txtRt, zero, NULL);
				Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 textSize;
				Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&textSize), bgW - 32.0f, bgH - 12.0f, NULL);
				RectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(txtRt, textSize, NULL);
			}
			if (IsOneOnOneScene() && lpRt != NULL)
			{
				GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* bubble = OneOnOneQuestionPanel(dm);
				RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* bubbleRt = IsValidUnityObject((RuntimeObject*)bubble)
					? GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(bubble, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var) : NULL;
				if (bubbleRt != NULL && Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E((Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1*)bubbleRt, NULL) == canvasTr)
				{
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubbleSize = RectTransform_get_sizeDelta_m822A8493F2035677384F1540A2E9E5ACE63010BB(bubbleRt, NULL);
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos = RectTransform_get_anchoredPosition_m38F25A4253B0905BB058BE73DBF43C7172CE0680(bubbleRt, NULL);
					const float gap = 12.0f;
					// The existing question layout uses a 370 center and 100 minimum height. Reserve room for the pill above the avatar.
					float bubbleBottom = 370.0f - 50.0f + bgH + gap;
					Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), bubblePos.___x, bubbleBottom + bubbleSize.___y * 0.5f, NULL);
					RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 pillPos;
					Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&pillPos), bubblePos.___x, bubblePos.___y - bubbleSize.___y * 0.5f - gap - bgH * 0.5f, NULL);
					RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(lpRt, pillPos, NULL);
				}
			}
			else if (lpRt != NULL)
			{
				GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* bubble = PanelQuestionPanel(dm);
				RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* bubbleRt = IsValidUnityObject((RuntimeObject*)bubble)
					? GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(bubble, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var) : NULL;
				if (bubbleRt != NULL && Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E((Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1*)bubbleRt, NULL) == canvasTr)
				{
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubbleSize = RectTransform_get_sizeDelta_m822A8493F2035677384F1540A2E9E5ACE63010BB(bubbleRt, NULL);
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos = RectTransform_get_anchoredPosition_m38F25A4253B0905BB058BE73DBF43C7172CE0680(bubbleRt, NULL);
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePivot = RectTransform_get_pivot_mA8334AF05AA7FF09A173A2430F2BB9E85E5CBFFF(bubbleRt, NULL);
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubbleAnchorMin = RectTransform_get_anchorMin_mD85363930BE38EC188F933B9F4D58320CAB72F03(bubbleRt, NULL);
					Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubbleAnchorMax = RectTransform_get_anchorMax_mEF870BE2A134CEB9C2326930A71D3961271297DB(bubbleRt, NULL);
					// ResizeSpeechBubble sets center anchors, pivot, and sizeDelta for the rendered question panel.
					if (bubbleAnchorMin.___x == bubbleAnchorMax.___x && bubbleAnchorMin.___y == bubbleAnchorMax.___y)
					{
						RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(lpRt, bubbleAnchorMin, NULL);
						RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(lpRt, bubbleAnchorMax, NULL);
						RectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(lpRt, bubblePivot, NULL);
						const float gap = 14.0f;
						// Move the Panel question and pill together; retain the measured 14-unit gap.
						float safeBottom = 310.0f - 50.0f;
						float bubbleBottom = safeBottom + bgH + gap;
						Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), bubblePos.___x, bubbleBottom + bubblePivot.___y * bubbleSize.___y, NULL);
						RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);
						Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 pillPos;
						Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&pillPos), bubblePos.___x + (0.5f - bubblePivot.___x) * (bubbleSize.___x - bgW), bubbleBottom - gap - (1.0f - bubblePivot.___y) * bgH, NULL);
						RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(lpRt, pillPos, NULL);
						Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 bubbleWorld = Transform_get_position_m69CD5FA214FDAE7BB701552943674846C220FDE1((Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1*)bubbleRt, NULL);
						Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 pillWorld = Transform_get_position_m69CD5FA214FDAE7BB701552943674846C220FDE1(lpTr, NULL);
						Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 bubbleScale = Transform_get_localScale_m804A002A53A645CDFCD15BB0F37209162720363F((Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1*)bubbleRt, NULL);
						// Panel's serialized status panel is scaled to 0.002; after reparenting it beside the bubble, use the bubble's canvas scale.
						Transform_set_localScale_mBA79E811BAF6C47B80FF76414C12B47B3CD03633(lpTr, bubbleScale, NULL);
						Quaternion_tDA59F214EF07D7700B26E40E562F267AF7306974 bubbleRotation = Transform_get_localRotation_mD53D37611A5DAE93EC6C7BBCAC337408C5CACA77((Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1*)bubbleRt, NULL);
						Transform_set_localRotation_mAB4A011D134BA58AB780BECC0025CA65F16185FA(lpTr, bubbleRotation, NULL);
						Vector3_t24C512C7B96BBABAD472002D0BA2BDA40A5A80B2 pillScale = Transform_get_localScale_m804A002A53A645CDFCD15BB0F37209162720363F(lpTr, NULL);
						__android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][PanelPill] bubble=(%.2f,%.2f,%.2f) pill=(%.2f,%.2f,%.2f) size=(%.0f,%.0f) scale=(%.3f,%.3f)/(%.3f,%.3f) active=%d",
							bubbleWorld.___x, bubbleWorld.___y, bubbleWorld.___z, pillWorld.___x, pillWorld.___y, pillWorld.___z,
							bgW, bgH, bubbleScale.___x, bubbleScale.___y, pillScale.___x, pillScale.___y,
							GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___listeningPanel, NULL));
					}
					else __android_log_print(ANDROID_LOG_WARN, "Unity", "[AIRIS][PanelPill] Bubble has stretched anchors");
				}
				else __android_log_print(ANDROID_LOG_WARN, "Unity", "[AIRIS][PanelPill] Bubble RectTransform unavailable or parent mismatch");
			}

			Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 sz;
			Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&sz), bgW, bgH, NULL);
			RectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(bgRt, sz, NULL);
		}
	}
}
"""

ensure_end_interview_def = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{"""

if "static void EnsureListeningBackground" not in content:
    content = content.replace(ensure_end_interview_def, ensure_listening_bg_code + "\n" + ensure_end_interview_def, 1)
    print("[PATCH] Injected EnsureListeningBackground before EnsureEndInterviewButton definition")
elif ensure_listening_bg_code not in content:
    idx_start = content.find("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Transform_SetAsFirstSibling_mBE0D0E76099F829466DC2FBD71ACFCF3C8EC03BD")
    idx_end = content.find(ensure_end_interview_def)
    if idx_start != -1 and idx_end != -1:
        existing_suppress = ""
        idx_suppress = content.find("static void SuppressAllDeskButtons(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm)\n{", idx_start, idx_end)
        idx_helper = content.find("static void EnsureListeningBackground", idx_start, idx_end)
        if idx_suppress != -1 and idx_helper != -1:
            suppress_end = idx_helper if idx_suppress < idx_helper else idx_end
            existing_suppress = content[idx_suppress:suppress_end]
        content = content[:idx_start] + ensure_listening_bg_code + "\n" + existing_suppress + content[idx_end:]
        print("[PATCH] Updated EnsureListeningBackground definition")

suppress_buttons_code = """static void SuppressAllDeskButtons(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm)
{
\tstatic bool s_SuppressInit;
\tif (!s_SuppressInit)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3_RuntimeMethod_var);
\t\ts_SuppressInit = true;
\t}

\tif (dm != NULL)
\t{
\t\tif (IsValidUnityObject((RuntimeObject*)dm->___nextQuestionButton))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(dm->___nextQuestionButton, (bool)0, NULL);
\t\t}
\t\tif (IsValidUnityObject((RuntimeObject*)dm->___stopRecordingButton))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(dm->___stopRecordingButton, (bool)0, NULL);
\t\t}
\t\tif (IsValidUnityObject((RuntimeObject*)dm->___endInterviewButton))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(dm->___endInterviewButton, (bool)0, NULL);
\t\t}
\t\tif (IsValidUnityObject((RuntimeObject*)dm->___startInterviewButton))
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(dm->___startInterviewButton, (bool)0, NULL);
\t\t}
\t\tdm->___endInterviewButton = NULL;
\t\tdm->___nextQuestionButton = NULL;
\t\tdm->___stopRecordingButton = NULL;
\t\tdm->___startInterviewButton = NULL;
\t}

\tTransformU5BU5D_tBB9C5F5686CAE82E3D97D43DF0F3D68ABF75EC24* allTr = Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3(Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3_RuntimeMethod_var);
\tif (allTr != NULL)
\t{
\t\tint32_t len = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)allTr)->max_length),NULL));
\t\tfor (int32_t i = 0; i < len; ++i)
\t\t{
\t\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* t = (allTr)->GetAt(static_cast<il2cpp_array_size_t>(i));
\t\t\tif (t != NULL)
\t\t\t{
\t\t\t\tString_t* uName = Object_get_name_mAC2F6B897CF1303BA4249B4CB55271AFACBB6392(t, NULL);
\t\t\t\tif (uName != NULL && uName->____stringLength > 0)
\t\t\t\t{
\t\t\t\t\tchar buf[128];
\t\t\t\t\tint copyLen = (uName->____stringLength < 127) ? uName->____stringLength : 127;
					const Il2CppChar* chars = &uName->____firstChar;
\t\t\t\t\tfor (int c = 0; c < copyLen; ++c)
\t\t\t\t\t{
\t\t\t\t\t\tIl2CppChar ch = chars[c];
\t\t\t\t\t\tif (ch >= 'A' && ch <= 'Z') ch += ('a' - 'A');
\t\t\t\t\t\tbuf[c] = (char)ch;
\t\t\t\t\t}
\t\t\t\t\tbuf[copyLen] = '\\0';

\t\t\t\t\tif (strstr(buf, "nextquestion") != NULL ||
\t\t\t\t\t    strstr(buf, "next question") != NULL ||
\t\t\t\t\t    strstr(buf, "next_question") != NULL ||
\t\t\t\t\t    strstr(buf, "startinterview") != NULL ||
\t\t\t\t\t    strstr(buf, "start interview") != NULL ||
\t\t\t\t\t    strstr(buf, "start_interview") != NULL ||
\t\t\t\t\t    strstr(buf, "stoprecording") != NULL ||
\t\t\t\t\t    strstr(buf, "stop recording") != NULL ||
\t\t\t\t\t    strstr(buf, "stop_recording") != NULL ||
\t\t\t\t\t    strstr(buf, "endinterview") != NULL ||
\t\t\t\t\t    strstr(buf, "end interview") != NULL ||
\t\t\t\t\t    strstr(buf, "end_interview") != NULL ||
\t\t\t\t\t    strstr(buf, "done answering") != NULL ||
\t\t\t\t\t    strstr(buf, "doneanswering") != NULL)
\t\t\t\t\t{
\t\t\t\t\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* go = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)t, NULL);
\t\t\t\t\t\tif (go != NULL)
\t\t\t\t\t\t{
\t\t\t\t\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(go, (bool)0, NULL);
\t\t\t\t\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] Suppressed desk/VR button: %s", buf);
\t\t\t\t\t\t}
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}
\t\t}
\t}
}
"""

if suppress_buttons_code not in content:
    idx_ensure_bg = content.find("static void EnsureListeningBackground")
    if idx_ensure_bg != -1:
        content = content[:idx_ensure_bg] + suppress_buttons_code + "\n" + content[idx_ensure_bg:]
        print("[PATCH] Injected SuppressAllDeskButtons before EnsureListeningBackground")

# Forward declaration before Awake
awake_decl = "IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_Awake_m1E03D7AA32F5A9A8F8FBE2EC1C9ABB2742341207 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)"
if "static void SuppressAllDeskButtons(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm);" not in content and awake_decl in content:
    content = content.replace(awake_decl, "static void SuppressAllDeskButtons(DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm);\n" + awake_decl, 1)
    print("[PATCH] Injected SuppressAllDeskButtons forward declaration before Awake")

# 4a. Update Canvas lookup in EnsureEndInterviewButton to also check central interviewer bubble
old_canvas_find_v1 = """	// Find canvas from speech bubble or scene
	Canvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26* canvas = NULL;
	if (IsValidUnityObject((RuntimeObject*)__this->___speechBubble))
	{
		canvas = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(__this->___speechBubble, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
	}"""

new_canvas_find_v2 = """	// Find canvas from speech bubble or scene
	SuppressAllDeskButtons(__this);
	Canvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26* canvas = NULL;
	if (IsValidUnityObject((RuntimeObject*)__this->___speechBubble))
	{
		canvas = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(__this->___speechBubble, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
	}
	if (canvas == NULL && __this->___interviewerSpeechBubbles != NULL &&
		(il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)__this->___interviewerSpeechBubbles)->max_length),NULL)) > 1)
	{
		GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* centerBubble = (__this->___interviewerSpeechBubbles)->GetAt(1);
		if (IsValidUnityObject((RuntimeObject*)centerBubble))
		{
			canvas = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(centerBubble, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
		}
	}"""

content = apply_patch("4a. Canvas lookup with Panel bubble fallback", old_canvas_find_v1, new_canvas_find_v2, content)

# 4. DialogueManager buttons removal: permanently disable and hide all desk and VR buttons
old_buttons_v1 = """\t// Disable all VR buttons cleanly - interaction is voice and silence driven
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

new_buttons_full = """\t// Disable all VR & desk buttons cleanly - interaction is voice and silence driven
\tSuppressAllDeskButtons(__this);
\tconst char* const kUnwantedButtons[] = {
\t\t"NextQuestion", "StartInterview", "StopRecording", "EndInterview", "StopInterview",
\t\t"Next Question", "Start Interview", "Stop Recording", "End Interview", "Stop Interview",
\t\t"NextQuestionButton", "StartInterviewButton", "StopRecordingButton", "EndInterviewButton",
\t\t"NextQuestionButton_VR", "StopRecordingButton_VR", "EndInterviewButton_VR", "StartInterviewButton_VR",
\t\t"Next Question Button", "Stop Recording Button", "End Interview Button"
\t};
\tfor (int i = 0; i < 21; ++i)
\t{
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* tr = (canvasTr != NULL) ? Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new(kUnwantedButtons[i]), NULL) : NULL;
\t\tif (tr != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)tr, NULL), (bool)0, NULL);
\t\t}
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* gBtn = GameObject_Find_m7A669B4EEC2617AB82F6E3FF007CDCD9F21DB300(il2cpp_string_new(kUnwantedButtons[i]), NULL);
\t\tif (gBtn != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(gBtn, (bool)0, NULL);
\t\t}
\t}

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
\tif (IsValidUnityObject((RuntimeObject*)__this->___startInterviewButton))
\t{
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___startInterviewButton, (bool)0, NULL);
\t}

\t__this->___endInterviewButton = NULL;
\t__this->___nextQuestionButton = NULL;
\t__this->___stopRecordingButton = NULL;
\t__this->___startInterviewButton = NULL;

\tSuppressAllDeskButtons(__this);
\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All buttons hidden and disabled. VR interaction is voice & silence driven.");"""

old_buttons_full_prev = """\t// Disable all VR & desk buttons cleanly - interaction is voice and silence driven
\tconst char* const kUnwantedButtons[] = {"""

if new_buttons_full in content:
    print("[PATCH] Already present: 4. Disable VR desk buttons in DialogueManager")
elif old_buttons_full_prev in content:
    idx_p = content.find(old_buttons_full_prev)
    idx_end_p = content.find('__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All buttons hidden and disabled. VR interaction is voice & silence driven.");', idx_p)
    if idx_p != -1 and idx_end_p != -1:
        end_stmt = '__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All buttons hidden and disabled. VR interaction is voice & silence driven.");'
        content = content[:idx_p] + new_buttons_full + content[idx_end_p + len(end_stmt):]
        print("[PATCH] Updated: 4. Disable VR desk buttons in DialogueManager")
else:
    content = apply_patch("4. Disable VR desk buttons in DialogueManager", old_buttons_v1, new_buttons_full, content)

# 4b. Make DialogueManager_ShowNextQuestionButton a complete no-op so buttons are never re-enabled
old_show_nq_clean = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\ts_Il2CppMethodInitialized = true;
\t}
\t//<source_info:<no-source>:1>
\t{
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_0 = __this->___nextQuestionButton;
\t\til2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\tbool L_1;
\t\tL_1 = Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602(L_0, (Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)NULL, NULL);
\t\tif (!L_1)
\t\t{
\t\t\tgoto IL_001a;
\t\t}
\t}
\t{
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_2 = __this->___nextQuestionButton;
\t\tNullCheck(L_2);
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(L_2, (bool)1, NULL);
\t}

IL_001a:
\t{
\t\treturn;
\t}
}"""

new_show_nq = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)
{
	// Complete no-op: voice-first interaction suppresses all desk Next Question buttons permanently
	SuppressAllDeskButtons(__this);
	return;
}"""

old_show_nq_prev = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)
{
	// Complete no-op: voice-first interaction suppresses all desk Next Question buttons permanently
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* gBtn1 = GameObject_Find_m7A669B4EEC2617AB82F6E3FF007CDCD9F21DB300(il2cpp_string_new("NextQuestionButton"), NULL);
	if (gBtn1 != NULL) GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(gBtn1, (bool)0, NULL);
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* gBtn2 = GameObject_Find_m7A669B4EEC2617AB82F6E3FF007CDCD9F21DB300(il2cpp_string_new("NextQuestion"), NULL);
	if (gBtn2 != NULL) GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(gBtn2, (bool)0, NULL);
	return;
}"""

if new_show_nq in content:
    print("[PATCH] Already present: 4b. No-op DialogueManager_ShowNextQuestionButton")
elif old_show_nq_prev in content:
    content = apply_patch("4b. No-op DialogueManager_ShowNextQuestionButton (from prev)", old_show_nq_prev, new_show_nq, content)
elif old_show_nq_clean in content:
    content = apply_patch("4b. No-op DialogueManager_ShowNextQuestionButton (from clean)", old_show_nq_clean, new_show_nq, content)

# 4b3. DialogueManager_ShowSpeaker: call SuppressAllDeskButtons
old_show_speaker_clean = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_mCD89D0F471D5CE1FEF09482ED02FF990DE9A8777 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, int32_t ___0_speakerIndex, String_t* ___1_message, const RuntimeMethod* method) 
{
	if (__this != NULL)
	{
		if (__this->___nextQuestionButton != NULL)
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
		}
		if (__this->___stopRecordingButton != NULL)
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
		}
	}"""

new_show_speaker = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_mCD89D0F471D5CE1FEF09482ED02FF990DE9A8777 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, int32_t ___0_speakerIndex, String_t* ___1_message, const RuntimeMethod* method) 
{
	if (__this != NULL)
	{
		SuppressAllDeskButtons(__this);
	}"""

content = apply_patch("4b3. DialogueManager_ShowSpeaker SuppressAllDeskButtons", old_show_speaker_clean, new_show_speaker, content)

# ShowSpeaker reactivates every child of the selected bubble after its initial
# suppression pass. The serialized Panel Next Question button is among them.
speaker_start = content.index("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_mCD89D0F471D5CE1FEF09482ED02FF990DE9A8777 (", content.index("static bool IsOneOnOneScene"))
speaker_end = content.index("// Method Definition Index:", speaker_start)
speaker = content[speaker_start:speaker_end]
speaker_tail_old = "\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_84, NULL);\n\t\treturn;"
speaker_tail_new = "\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_84, NULL);\n\t\tif (!IsOneOnOneScene()) SuppressAllDeskButtons(__this);\n\t\treturn;"
if speaker_tail_new not in speaker:
    if speaker_tail_old not in speaker:
        raise RuntimeError("ShowSpeaker completion path not found")
    speaker = speaker.replace(speaker_tail_old, speaker_tail_new, 1)
    print("[PATCH] Applied: Panel button suppression after ShowSpeaker child activation")
content = content[:speaker_start] + speaker + content[speaker_end:]

# 4b2. DialogueManager_ShowStartButton: set active to 0 to disable start button
old_show_start = """\t{
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_2 = __this->___startInterviewButton;
\t\tNullCheck(L_2);
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(L_2, (bool)1, NULL);
\t}

IL_001a:
\t{
\t\treturn;
\t}
}
// Method Definition Index: 71611"""

new_show_start = """\t{
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_2 = __this->___startInterviewButton;
\t\tNullCheck(L_2);
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(L_2, (bool)0, NULL);
\t}

IL_001a:
\t{
\t\treturn;
\t}
}
// Method Definition Index: 71611"""

content = apply_patch("4b2. Disable DialogueManager_ShowStartButton", old_show_start, new_show_start, content)

# 4c. DialogueManager_ShowListening: bypass stopRecordingButton activation completely and ensure listening background
old_show_listening_block = """IL_0219:
\t{
\t\tif (__this->___nextQuestionButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t\t}
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_93 = __this->___stopRecordingButton;
\t\til2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\tbool L_94;
\t\tL_94 = Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602(L_93, (Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)NULL, NULL);
\t\tif (!L_94)
\t\t{
\t\t\tgoto IL_027a;
\t\t}
\t}
\t{
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_95 = __this->___stopRecordingButton;
\t\tNullCheck(L_95);
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(L_95, (bool)1, NULL);
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_96 = __this->___stopRecordingButton;
\t\tNullCheck(L_96);
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* L_97;
\t\tL_97 = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(L_96, NULL);
\t\tV_10 = L_97;
\t\tgoto IL_0266;
\t}

IL_0242:
\t{
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* L_98 = V_10;
\t\tNullCheck(L_98);
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_99;
\t\tL_99 = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B(L_98, NULL);
\t\tNullCheck(L_99);
\t\tbool L_100;
\t\tL_100 = GameObject_get_activeSelf_m4F3E5240E138B66AAA080EA30759A3D0517DA368(L_99, NULL);
\t\tif (L_100)
\t\t{
\t\t\tgoto IL_025d;
\t\t}
\t}
\t{
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* L_101 = V_10;
\t\tNullCheck(L_101);
\t\tGameObject_t76FEDD663AB33C991A9C9A23129337651094216F* L_102;
\t\tL_102 = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B(L_101, NULL);
\t\tNullCheck(L_102);
\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(L_102, (bool)1, NULL);
\t}

IL_025d:
\t{
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* L_103 = V_10;
\t\tNullCheck(L_103);
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* L_104;
\t\tL_104 = Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E(L_103, NULL);
\t\tV_10 = L_104;
\t}

IL_0266:
\t{
\t\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* L_105 = V_10;
\t\til2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\tbool L_106;
\t\tL_106 = Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602(L_105, (Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)NULL, NULL);
\t\tif (L_106)
\t\t{
\t\t\tgoto IL_0242;
\t\t}
\t}
\t{
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(_stringLiteral72330AF296DC7DB08A62B0C388EDA82371616C1C, NULL);
\t}

IL_027a:
\t{
\t\treturn;
\t}
}"""

new_show_listening_block = """IL_0219:
\t{
\t\tif (__this->___nextQuestionButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
\t\t}
\t\tif (__this->___stopRecordingButton != NULL)
\t\t{
\t\t\tGameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
\t\t}
\t\tEnsureListeningBackground(__this);
\t\treturn;
\t}
}"""

content = apply_patch("4c. DialogueManager_ShowListening stopRecordingButton bypass", old_show_listening_block, new_show_listening_block, content)

# 4d. Ensure SetListeningStatusText calls EnsureListeningBackground
old_set_status_clean = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, String_t* ___0_text, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\ts_Il2CppMethodInitialized = true;
\t}"""

new_set_status = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, String_t* ___0_text, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;
\tif (!s_Il2CppMethodInitialized)
\t{
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponentsInChildren_TisTMP_Text_tE8D677872D43AD4B2AAF0D6101692A17D0B251A9_m295DA22DDE480845F095A35E3B49535BDA03219D_RuntimeMethod_var);
\t\til2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
\t\ts_Il2CppMethodInitialized = true;
\t}
\tEnsureListeningBackground(__this);"""

content = apply_patch("4d. Ensure SetListeningStatusText calls EnsureListeningBackground", old_set_status_clean, new_set_status, content)

# 4e. DialogueManager_ShowListening explicit status text
old_show_listening_text = """\t{
\t\tDialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D(__this, _stringLiteral55864DA1FE58C25100E0AC53EC7D5DE4161E2D1D, NULL);"""

new_show_listening_text = """\t{
\t\tDialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D(__this, il2cpp_string_new("Listening... Speak your answer"), NULL);"""

content = apply_patch("4e. ShowListening explicit status text", old_show_listening_text, new_show_listening_text, content)

# 4f. StopRecording sets 'Processing answer...'
old_stop_rec_text = """\t\t{
\t\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* L_52 = V_3;
\t\t\tNullCheck(L_52);
\t\t\tDialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D(L_52, _stringLiteral1A3C68B450C788258AA185AFD6AA1D7D12713886, NULL);
\t\t}"""

new_stop_rec_text = """\t\t{
\t\t\tDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* L_52 = V_3;
\t\t\tNullCheck(L_52);
\t\t\tDialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D(L_52, il2cpp_string_new("Processing answer..."), NULL);
\t\t}"""

content = apply_patch("4f. StopRecording explicit status text", old_stop_rec_text, new_stop_rec_text, content)

# 5. DialogueManager_Start: DO NOT hide speech bubble on scene start!
old_dm_start = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_Start_m4C2D94B2DD22F681BF418599E65069676ABF4750 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
\t//<source_info:<no-source>:1>
\t{
\t\tDialogueManager_AlignCanvasToCamera_m6283568B3E1D6325FD1E394444AD7F473D4E67B5(__this, NULL);
\t\tDialogueManager_HideSpeech_mF2561CD4DC99F9685993B4821272D95E2239D17E(__this, NULL);
\t\tDialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
\t\treturn;
\t}
}"""

new_dm_start = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_Start_m4C2D94B2DD22F681BF418599E65069676ABF4750 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		SuppressAllDeskButtons(__this);
		DialogueManager_AlignCanvasToCamera_m6283568B3E1D6325FD1E394444AD7F473D4E67B5(__this, NULL);
		// Note: Do NOT hide speech bubble here so incoming/active question is not destroyed
		DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
		return;
	}
}"""

old_dm_start_applied = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_Start_m4C2D94B2DD22F681BF418599E65069676ABF4750 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		DialogueManager_AlignCanvasToCamera_m6283568B3E1D6325FD1E394444AD7F473D4E67B5(__this, NULL);
		// Note: Do NOT hide speech bubble here so incoming/active question is not destroyed
		DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
		return;
	}
}"""

if new_dm_start in content:
    print("[PATCH] Already present: 5. DialogueManager_Start speech retention")
elif old_dm_start_applied in content:
    content = apply_patch("5. DialogueManager_Start speech retention (from applied)", old_dm_start_applied, new_dm_start, content)
else:
    content = apply_patch("5. DialogueManager_Start speech retention", old_dm_start, new_dm_start, content)

# 6. Speech bubble width and font autosize
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

content = apply_patch("6. Speech bubble width and font autosize", old_bubble_cfg, new_bubble_cfg, content)

# 7. Speech bubble position: y = 370.0f for One-on-One, y = 340.0f for Panel mode (optimal visual balance)
old_bubble_pos = """\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos;
\t\tmemset((&bubblePos), 0, sizeof(bubblePos));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), 0.0f, 370.0f, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);"""

new_bubble_pos = """\t\tfloat bubbleY = 370.0f;
\t\tif (V_1 != NULL && V_1->___interviewerSpeechBubbles != NULL &&
\t\t\t(il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)V_1->___interviewerSpeechBubbles)->max_length),NULL)) > 1)
\t\t{
\t\t\tbubbleY = 310.0f;
\t\t}
\t\tVector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 bubblePos;
\t\tmemset((&bubblePos), 0, sizeof(bubblePos));
\t\tVector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&bubblePos), 0.0f, bubbleY, NULL);
\t\tRectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(bubbleRt, bubblePos, NULL);"""

content = content.replace("\t\t\tbubbleY = 340.0f;", "\t\t\tbubbleY = 310.0f;")
content = apply_patch("7. Speech bubble y position (Panel 310, One-on-One 370)", old_bubble_pos, new_bubble_pos, content)

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

content = apply_patch("7b. ResizeSpeechBubbleCoroutine active check bypass", old_coroutine_check, new_coroutine_check, content)

# 8a. MonitorSilence calibration safety: 0.8s, noise rejection for > 0.006f, baseline clamp between 0.0010f and 0.0035f
old_calib = """\t\tfloat L_33 = V_5;
\t\tif ((!(((float)L_33) < ((float)(2.5f)))))
\t\t{
\t\t\tgoto IL_0125;
\t\t}
\t}
\t{
\t\tfloat L_34 = __this->___U3CnoiseSampleAccumulatorU3E5__2;
\t\tfloat L_35 = V_3;
\t\t__this->___U3CnoiseSampleAccumulatorU3E5__2 = ((float)il2cpp_codegen_add(L_34, L_35));
\t\tint32_t L_36 = __this->___U3CnoiseSampleCountU3E5__3;
\t\tV_8 = L_36;
\t\tint32_t L_37 = V_8;
\t\t__this->___U3CnoiseSampleCountU3E5__3 = ((int32_t)il2cpp_codegen_add(L_37, 1));
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_38 = V_1;
\t\tfloat L_39 = __this->___U3CnoiseSampleAccumulatorU3E5__2;
\t\tint32_t L_40 = __this->___U3CnoiseSampleCountU3E5__3;
\t\tint32_t L_41;
\t\tL_41 = Mathf_Max_m7FA442918DE37E3A00106D1F2E789D65829792B8_inline(1, L_40, NULL);
\t\tfloat L_42 = (il2cpp_codegen_conv<float,int32_t,int32_t,false,false>(L_41,NULL));
\t\tNullCheck(L_38);
\t\tL_38->___ambientNoiseFloor = ((float)(L_39/L_42));
\t\tgoto IL_0401;
\t}"""

new_calib = """		float L_33 = V_5;
		if ((!(((float)L_33) < ((float)(0.8f)))))
		{
			goto IL_0125;
		}
	}
	{
		float L_35 = V_3;
		if (L_35 < 0.006f)
		{
			float L_34 = __this->___U3CnoiseSampleAccumulatorU3E5__2;
			__this->___U3CnoiseSampleAccumulatorU3E5__2 = ((float)il2cpp_codegen_add(L_34, L_35));
			int32_t L_36 = __this->___U3CnoiseSampleCountU3E5__3;
			V_8 = L_36;
			int32_t L_37 = V_8;
			__this->___U3CnoiseSampleCountU3E5__3 = ((int32_t)il2cpp_codegen_add(L_37, 1));
		}
		RecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_38 = V_1;
		float L_39 = __this->___U3CnoiseSampleAccumulatorU3E5__2;
		int32_t L_40 = __this->___U3CnoiseSampleCountU3E5__3;
		int32_t L_41;
		L_41 = Mathf_Max_m7FA442918DE37E3A00106D1F2E789D65829792B8_inline(1, L_40, NULL);
		float L_42 = (il2cpp_codegen_conv<float,int32_t,int32_t,false,false>(L_41,NULL));
		NullCheck(L_38);
		float calculated_noise = (L_40 > 0) ? ((float)(L_39/L_42)) : 0.0020f;
		if (calculated_noise > 0.0035f) calculated_noise = 0.0035f;
		if (calculated_noise < 0.0010f) calculated_noise = 0.0010f;
		L_38->___ambientNoiseFloor = calculated_noise;
		goto IL_0401;
	}
"""

content = apply_patch("8a. Calibration safety and noise floor clamp", old_calib, new_calib, content)

# 8b. Dual-threshold VAD hysteresis in MonitorSilence: prevents cutting candidate off while speaking!
old_monitor_silence_clean = """IL_025f:
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_115 = V_1;
\t\tNullCheck(L_115);
\t\tfloat L_116 = L_115->___smoothedVolume;
\t\tfloat L_117 = V_6;
\t\tif ((((float)L_116) > ((float)L_117)))
\t\t{
\t\t\tgoto IL_0275;
\t\t}
\t}
\t{
\t\tfloat L_118 = V_4;
\t\tfloat L_119 = V_6;
\t\tif ((!(((float)L_118) > ((float)((float)il2cpp_codegen_multiply(L_119, (2.0f)))))))
\t\t{
\t\t\tgoto IL_02d5;
\t\t}
\t}

IL_0275:
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_120 = V_1;
\t\tNullCheck(L_120);
\t\tbool L_121 = L_120->___speechDetected;
\t\tif (L_121)
\t\t{
\t\t\tgoto IL_02c5;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_122 = V_1;
\t\tNullCheck(L_122);
\t\tL_122->___speechDetected = (bool)1;
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_123 = (ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918*)(ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918*)SZArrayNew(ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918_il2cpp_TypeInfo_var, (uint32_t)4);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_124 = L_123;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_125 = V_1;
\t\tNullCheck(L_125);
\t\tfloat L_126 = L_125->___smoothedVolume;
\t\tfloat L_127 = L_126;
\t\tRuntimeObject* L_128 = Box(il2cpp_defaults.single_class, &L_127);
\t\tNullCheck(L_124);
\t\tArrayElementTypeCheck (L_124, L_128);
\t\t(L_124)->SetAt(static_cast<il2cpp_array_size_t>(0), (RuntimeObject*)L_128);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_129 = L_124;
\t\tfloat L_130 = V_4;
\t\tfloat L_131 = L_130;
\t\tRuntimeObject* L_132 = Box(il2cpp_defaults.single_class, &L_131);
\t\tNullCheck(L_129);
\t\tArrayElementTypeCheck (L_129, L_132);
\t\t(L_129)->SetAt(static_cast<il2cpp_array_size_t>(1), (RuntimeObject*)L_132);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_133 = L_129;
\t\tfloat L_134 = V_6;
\t\tfloat L_135 = L_134;
\t\tRuntimeObject* L_136 = Box(il2cpp_defaults.single_class, &L_135);
\t\tNullCheck(L_133);
\t\tArrayElementTypeCheck (L_133, L_136);
\t\t(L_133)->SetAt(static_cast<il2cpp_array_size_t>(2), (RuntimeObject*)L_136);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_137 = L_133;
\t\tfloat L_138 = V_5;
\t\tfloat L_139 = L_138;
\t\tRuntimeObject* L_140 = Box(il2cpp_defaults.single_class, &L_139);
\t\tNullCheck(L_137);
\t\tArrayElementTypeCheck (L_137, L_140);
\t\t(L_137)->SetAt(static_cast<il2cpp_array_size_t>(3), (RuntimeObject*)L_140);
\t\tString_t* L_141;
\t\tL_141 = String_Format_m918500C1EFB475181349A79989BB79BB36102894(_stringLiteral84562C33F1D37BA893358127B1E15805B60ACAC8, L_137, NULL);
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_141, NULL);
\t}

IL_02c5:
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_142 = V_1;
\t\tNullCheck(L_142);
\t\tL_142->___currentSilenceTime = (0.0f);
\t\tgoto IL_03d5;
\t}

IL_02d5:
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_143 = V_1;
\t\tNullCheck(L_143);
\t\tfloat L_144 = L_143->___smoothedVolume;
\t\tfloat L_145 = V_7;
\t\tif ((!(((float)L_144) <= ((float)L_145))))
\t\t{
\t\t\tgoto IL_03ae;
\t\t}
\t}
\t{
\t\tfloat L_146 = V_4;
\t\tfloat L_147 = V_6;
\t\tif ((!(((float)L_146) <= ((float)((float)il2cpp_codegen_multiply(L_147, (1.20000005f)))))))
\t\t{
\t\t\tgoto IL_03ae;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_148 = V_1;
\t\tNullCheck(L_148);
\t\tbool L_149 = L_148->___speechDetected;
\t\tif (!L_149)
\t\t{
\t\t\tgoto IL_034f;
\t\t}
\t}
\t{
\t\tfloat L_150 = V_5;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_151 = V_1;
\t\tNullCheck(L_151);
\t\tfloat L_152 = L_151->___minimumRecordingTime;
\t\tif ((!(((float)L_150) >= ((float)L_152))))
\t\t{
\t\t\tgoto IL_034f;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_153 = V_1;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_154 = V_1;
\t\tNullCheck(L_154);
\t\tfloat L_155 = L_154->___currentSilenceTime;
\t\tNullCheck(L_153);
\t\tL_153->___currentSilenceTime = ((float)il2cpp_codegen_add(L_155, (0.100000001f)));
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_156 = V_1;
\t\tNullCheck(L_156);
\t\tfloat L_157 = L_156->___currentSilenceTime;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_158 = V_1;
\t\tNullCheck(L_158);
\t\tfloat L_159 = L_158->___silenceDuration;
\t\tif ((!(((float)L_157) >= ((float)L_159))))
\t\t{
\t\t\tgoto IL_03d5;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_160 = V_1;
\t\tNullCheck(L_160);
\t\tfloat L_161 = L_160->___currentSilenceTime;
\t\tfloat L_162 = L_161;
\t\tRuntimeObject* L_163 = Box(il2cpp_defaults.single_class, &L_162);
\t\tfloat L_164 = V_5;
\t\tfloat L_165 = L_164;
\t\tRuntimeObject* L_166 = Box(il2cpp_defaults.single_class, &L_165);
\t\tString_t* L_167;
\t\tL_167 = String_Format_mFB7DA489BD99F4670881FF50EC017BFB0A5C0987(_stringLiteral36D6E322AAFC7C83B7E70034F871754C4E0C5A7C, L_163, L_166, NULL);
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_167, NULL);
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_168 = V_1;
\t\tNullCheck(L_168);
\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(L_168, NULL);
\t\treturn (bool)0;
\t}

IL_034f:
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_169 = V_1;
\t\tNullCheck(L_169);
\t\tbool L_170 = L_169->___speechDetected;
\t\tif (L_170)
\t\t{
\t\t\tgoto IL_03d5;
\t\t}
\t}
\t{
\t\tfloat L_171 = V_5;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_172 = V_1;
\t\tNullCheck(L_172);
\t\tfloat L_173 = L_172->___maxInitialSilenceTime;
\t\tif ((!(((float)L_171) >= ((float)L_173))))
\t\t{
\t\t\tgoto IL_03d5;
\t\t}
\t}
\t{
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_174 = (ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918*)(ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918*)SZArrayNew(ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918_il2cpp_TypeInfo_var, (uint32_t)4);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_175 = L_174;
\t\tfloat L_176 = V_5;
\t\tfloat L_177 = L_176;
\t\tRuntimeObject* L_178 = Box(il2cpp_defaults.single_class, &L_177);
\t\tNullCheck(L_175);
\t\tArrayElementTypeCheck (L_175, L_178);
\t\t(L_175)->SetAt(static_cast<il2cpp_array_size_t>(0), (RuntimeObject*)L_178);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_179 = L_175;
\t\tfloat L_180 = V_6;
\t\tfloat L_181 = L_180;
\t\tRuntimeObject* L_182 = Box(il2cpp_defaults.single_class, &L_181);
\t\tNullCheck(L_179);
\t\tArrayElementTypeCheck (L_179, L_182);
\t\t(L_179)->SetAt(static_cast<il2cpp_array_size_t>(1), (RuntimeObject*)L_182);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_183 = L_179;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_184 = V_1;
\t\tNullCheck(L_184);
\t\tfloat L_185 = L_184->___currentPeak;
\t\tfloat L_186 = L_185;
\t\tRuntimeObject* L_187 = Box(il2cpp_defaults.single_class, &L_186);
\t\tNullCheck(L_183);
\t\tArrayElementTypeCheck (L_183, L_187);
\t\t(L_183)->SetAt(static_cast<il2cpp_array_size_t>(2), (RuntimeObject*)L_187);
\t\tObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_188 = L_183;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_189 = V_1;
\t\tNullCheck(L_189);
\t\tfloat L_190 = L_189->___smoothedVolume;
\t\tfloat L_191 = L_190;
\t\tRuntimeObject* L_192 = Box(il2cpp_defaults.single_class, &L_191);
\t\tNullCheck(L_188);
\t\tArrayElementTypeCheck (L_188, L_192);
\t\t(L_188)->SetAt(static_cast<il2cpp_array_size_t>(3), (RuntimeObject*)L_192);
\t\tString_t* L_193;
\t\tL_193 = String_Format_m918500C1EFB475181349A79989BB79BB36102894(_stringLiteral214A4EAD3C428A816677FD4B25341018EAA7BB71, L_188, NULL);
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_193, NULL);
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_194 = V_1;
\t\tNullCheck(L_194);
\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(L_194, NULL);
\t\treturn (bool)0;
\t}

IL_03ae:
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_195 = V_1;
\t\tNullCheck(L_195);
\t\tbool L_196 = L_195->___speechDetected;
\t\tif (!L_196)
\t\t{
\t\t\tgoto IL_03d5;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_197 = V_1;
\t\tNullCheck(L_197);
\t\tfloat L_198 = L_197->___currentSilenceTime;
\t\tif ((!(((float)L_198) > ((float)(0.0f)))))
\t\t{
\t\t\tgoto IL_03d5;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_199 = V_1;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_200 = V_1;
\t\tNullCheck(L_200);
\t\tfloat L_201 = L_200->___currentSilenceTime;
\t\tNullCheck(L_199);
\t\tL_199->___currentSilenceTime = ((float)il2cpp_codegen_add(L_201, (0.0300000012f)));
\t}

IL_03d5:
\t{
\t\tfloat L_202 = V_5;
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_203 = V_1;
\t\tNullCheck(L_203);
\t\tfloat L_204 = L_203->___maximumRecordingTime;
\t\tif ((!(((float)L_202) >= ((float)L_204))))
\t\t{
\t\t\tgoto IL_0401;
\t\t}
\t}
\t{
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_205 = V_1;
\t\tNullCheck(L_205);
\t\tfloat L_206 = L_205->___maximumRecordingTime;
\t\tfloat L_207 = L_206;
\t\tRuntimeObject* L_208 = Box(il2cpp_defaults.single_class, &L_207);
\t\tString_t* L_209;
\t\tL_209 = String_Format_mA8DBB4C2516B9723C5A41E6CB1E2FAF4BBE96DD8(_stringLiteral64D3D3EC3DB3CBFC17C378509305A9A6C8A55627, L_208, NULL);
\t\til2cpp_codegen_runtime_class_init_inline(Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
\t\tDebug_Log_m87A9A3C761FF5C43ED8A53B16190A53D08F818BB(L_209, NULL);
\t\tRecordingManager_tC9C0101B7FDE7694D4CC094118FCF4FA0EDD9349* L_210 = V_1;
\t\tNullCheck(L_210);
\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(L_210, NULL);
\t\treturn (bool)0;
\t}"""

new_monitor_silence_body = """IL_025f:
\t{
\t\t// 1. Dual-threshold VAD hysteresis:
\t\t// Onset requires higher threshold V_6 (ambientNoiseFloor * 2.5) or strong peak
\t\t// Once speechDetected is true, active voice continuity requires only silence threshold V_7 (0.0040f) or moderate peak
\t\tbool isVoiceActive = false;
\t\tif (!V_1->___speechDetected)
\t\t{
\t\t\t// Looking for speech onset
\t\t\tisVoiceActive = (V_1->___smoothedVolume > V_6) || (V_4 > ((float)il2cpp_codegen_multiply(V_6, (1.6f))));
\t\t\tif (isVoiceActive)
\t\t\t{
\t\t\t\tV_1->___speechDetected = (bool)1;
\t\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][RecordingManager] Speech onset detected! vol=%.5f, peak=%.5f, onsetThresh=%.5f, elapsed=%.2fs",
\t\t\t\t\tV_1->___smoothedVolume, V_4, V_6, V_5);
\t\t\t}
\t\t}
\t\telse
\t\t{
\t\t\t// Speech was already detected; maintain voice hold against silence threshold V_7
\t\t\tisVoiceActive = (V_1->___smoothedVolume > V_7) || (V_4 > ((float)il2cpp_codegen_multiply(V_7, (1.3f)))) || (V_3 > ((float)il2cpp_codegen_multiply(V_7, (1.2f))));
\t\t}

\t\tif (isVoiceActive)
\t\t{
\t\t\tV_1->___currentSilenceTime = (0.0f);
\t\t}

\t\t// 2. Silence / post-speech detection
\t\tif (V_1->___speechDetected)
\t\t{
\t\t\t// Candidate spoke. If not actively speaking, accumulate silence
\t\t\tif (!isVoiceActive)
\t\t\t{
\t\t\t\tif ((((float)V_5) >= ((float)V_1->___minimumRecordingTime)))
\t\t\t\t{
\t\t\t\t\tV_1->___currentSilenceTime = ((float)il2cpp_codegen_add(V_1->___currentSilenceTime, (0.100000001f)));
\t\t\t\t\tif ((((float)V_1->___currentSilenceTime) >= ((float)V_1->___silenceDuration)))
\t\t\t\t\t{
\t\t\t\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][RecordingManager] Post-speech silence threshold reached (silence=%.2fs, elapsed=%.2fs). Stopping recording.",
\t\t\t\t\t\t\tV_1->___currentSilenceTime, V_5);
\t\t\t\t\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(V_1, NULL);
\t\t\t\t\t\treturn (bool)0;
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}
\t\t}
\t\telse
\t\t{
\t\t\t// Candidate has not spoken yet: check initial silence timeout
\t\t\tif ((((float)V_5) >= ((float)V_1->___maxInitialSilenceTime)))
\t\t\t{
\t\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][RecordingManager] Initial silence timeout reached (%.2fs >= %.2fs). Stopping recording.",
\t\t\t\t\tV_5, V_1->___maxInitialSilenceTime);
\t\t\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(V_1, NULL);
\t\t\t\treturn (bool)0;
\t\t\t}
\t\t}

\t\t// 3. Absolute maximum recording time fallback
\t\tif ((((float)V_5) >= ((float)V_1->___maximumRecordingTime)))
\t\t{
\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][RecordingManager] Maximum recording time reached (%.2fs >= %.2fs). Stopping recording.",
\t\t\t\tV_5, V_1->___maximumRecordingTime);
\t\t\tRecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(V_1, NULL);
\t\t\treturn (bool)0;
\t\t}

\t\tgoto IL_0401;
\t}"""

if "isVoiceActive = IsOneOnOneScene() ?" in content:
    print("[PATCH] Already present: 8b. Unified silence detection with VAD Hysteresis in MonitorSilence")
else:
    content = apply_patch("8b. Unified silence detection with VAD Hysteresis in MonitorSilence", old_monitor_silence_clean, new_monitor_silence_body, content)

# Panel microphone peaks include isolated impulses well above the ambient RMS.
# Treat sustained smoothed energy as voice hold there; retain One-on-One's
# existing hold behavior until its source project can be changed and re-exported.
panel_voice_hold_old = "isVoiceActive = (V_1->___smoothedVolume > V_7) || (V_4 > ((float)il2cpp_codegen_multiply(V_7, (1.3f)))) || (V_3 > ((float)il2cpp_codegen_multiply(V_7, (1.2f))));"
panel_voice_hold_new = "isVoiceActive = IsOneOnOneScene() ? ((V_1->___smoothedVolume > V_7) || (V_4 > ((float)il2cpp_codegen_multiply(V_7, (1.3f)))) || (V_3 > ((float)il2cpp_codegen_multiply(V_7, (1.2f))))) : (V_1->___smoothedVolume > V_7);"
content = apply_patch("8c. Panel voice hold ignores isolated peaks", panel_voice_hold_old, panel_voice_hold_new, content)
panel_onset_old = "isVoiceActive = (V_1->___smoothedVolume > V_6) || (V_4 > ((float)il2cpp_codegen_multiply(V_6, (1.6f))));"
panel_onset_new = "isVoiceActive = IsOneOnOneScene() ? ((V_1->___smoothedVolume > V_6) || (V_4 > ((float)il2cpp_codegen_multiply(V_6, (1.6f))))) : (V_1->___smoothedVolume > V_6);"
content = apply_patch("8d. Panel speech onset requires sustained energy", panel_onset_old, panel_onset_new, content)

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

content = apply_patch("9a. VRGazeReticle_Awake disable visual", old_reticle_awake, new_reticle_awake, content)

old_reticle_update = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_Update_mF3144F9651ED8ADFD729DF67FEF503CDA2592AE8 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;"""

new_reticle_update = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_Update_mF3144F9651ED8ADFD729DF67FEF503CDA2592AE8 (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\treturn;
\tstatic bool s_Il2CppMethodInitialized;"""

content = apply_patch("9b. VRGazeReticle_Update no-op", old_reticle_update, new_reticle_update, content)

old_ensure_reticle = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_EnsureReticleVisual_m6E15906D81420A03152D85CCCBE4C8B12D5321EF (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\tstatic bool s_Il2CppMethodInitialized;"""

new_ensure_reticle = """IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_EnsureReticleVisual_m6E15906D81420A03152D85CCCBE4C8B12D5321EF (VRGazeReticle_t93A047DE1836AD4B5A7E07ACAD30DDAF5F1DAD28* __this, const RuntimeMethod* method) 
{
\treturn;
\tstatic bool s_Il2CppMethodInitialized;"""

content = apply_patch("9c. VRGazeReticle_EnsureReticleVisual no-op", old_ensure_reticle, new_ensure_reticle, content)

setter_start = content.index("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_SetListeningStatusText_m9E105A170221D9E6F8F90E11932F9ABE7DAB4E0D (", content.index("static bool IsOneOnOneScene"))
setter_end = content.index("// Method Definition Index:", setter_start)
setter = content[setter_start:setter_end]
setter = apply_patch(
    "Pill refresh after status text update",
    "\t\tVirtualActionInvoker1< String_t* >::Invoke(66, L_2, L_3);\n\t\treturn;",
    "\t\tVirtualActionInvoker1< String_t* >::Invoke(66, L_2, L_3);\n\t\tEnsureListeningBackground(__this);\n\t\treturn;",
    setter,
)
setter = setter.replace(
    "if (IsOneOnOneScene()) EnsureListeningBackground(__this);\n\t\telse EnsureListeningBackground(__this);",
    "EnsureListeningBackground(__this);",
)
setter = setter.replace("if (IsOneOnOneScene()) EnsureListeningBackground(__this);", "EnsureListeningBackground(__this);")
content = content[:setter_start] + setter + content[setter_end:]

resize_start = content.index("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool U3CResizeSpeechBubbleCoroutineU3Ed__33_MoveNext_m", content.index("static bool IsOneOnOneScene"))
resize_end = content.index("// Method Definition Index:", resize_start)
resize = content[resize_start:resize_end]
resize = resize.replace(
    "\t\tCanvas_ForceUpdateCanvases_m6ECDBC5E85ADA3301BB20611753C45769F15EB51(NULL);\n\n\t\t__android_log_print",
    "\t\tCanvas_ForceUpdateCanvases_m6ECDBC5E85ADA3301BB20611753C45769F15EB51(NULL);\n\t\tif (!IsOneOnOneScene() && IsValidUnityObject((RuntimeObject*)V_1->___listeningPanel) &&\n\t\t\tGameObject_get_activeSelf_m4F3E5240E138B66AAA080EA30759A3D0517DA368(V_1->___listeningPanel, NULL))\n\t\t{\n\t\t\tEnsureListeningBackground(V_1);\n\t\t}\n\n\t\t__android_log_print",
)
content = content[:resize_start] + resize + content[resize_end:]

# Earlier generated-only Panel experiments tracked a process-wide speaker index.
# The active bubble is now read from this DialogueManager's visible speaker objects.
content = content.replace("static int32_t s_ActivePanelSpeakerIndex = -1;\n", "")
content = content.replace("\ts_ActivePanelSpeakerIndex = -1;\n", "")
content = content.replace(
    "\t\tif (___0_speakerIndex >= 0 && ___0_speakerIndex < 3)\n\t\t{\n\t\t\ts_ActivePanelSpeakerIndex = ___0_speakerIndex;\n\t\t}\n",
    "",
)

recording_start = content.index("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void RecordingManager_StartRecording_m580F92B936D4B2E0C0E103900D80E922C3CF26FA (", content.index("static bool IsOneOnOneScene"))
recording_end = content.index("// Method Definition Index:", recording_start)
recording = content[recording_start:recording_end]
if "\t\t__this->___silenceDuration = (5.0f);" in recording:
    recording = apply_patch(
        "One-on-One effective silence duration",
        "\t\t__this->___silenceDuration = (5.0f);",
        "\t\t__this->___silenceDuration = IsOneOnOneScene() ? (3.5f) : (5.0f);",
        recording,
    )
panel_duration_old = "\t\t__this->___silenceDuration = IsOneOnOneScene() ? (3.5f) : (5.0f);"
panel_duration_new = "\t\t__this->___silenceDuration = (3.5f);"
if panel_duration_old in recording:
    recording = recording.replace(panel_duration_old, panel_duration_new, 1)
    print("[PATCH] Applied: Panel effective silence duration")
elif panel_duration_new not in recording:
    raise RuntimeError("Panel effective silence duration target not found")
content = content[:recording_start] + recording + content[recording_end:]

# A Panel recording with no detected speech must never reach transcription.
# StopRecording has already released the microphone at this point; the event
# lets RN restart listening without saving or submitting the silent WAV.
stop_start = content.rfind("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CStopRecordingU3Ed__31_MoveNext_m")
stop_end = content.index("// Method Definition Index:", stop_start)
stop_body = content[stop_start:stop_end]
stop_body = stop_body.replace("if (!IsOneOnOneScene() && !V_1->___speechDetected)", "if (!V_1->___speechDetected)")
no_speech_anchor = "\t\ttry\n\t\t{\n\t\t\t{\n\t\t\t\tAndroidJavaClass_tE6296B30CC4BF84434A9B765267F3FD0DD8DDB03* L_17 ="
no_speech_branch = '''\t\tif (!V_1->___speechDetected)
\t\t{
\t\t\t__android_log_print(ANDROID_LOG_INFO, "Unity", "[AIRIS][RecordingManager] Panel no-speech recording discarded");
\t\t\tUaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* bridge = UaaLBridge_get_Instance_mC704985B67D85B378A99F9C2D52DE746FFC2869A_inline(NULL);
\t\t\tif (bridge != NULL)
\t\t\t{
\t\t\t\tUaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(bridge, il2cpp_string_new("NO_SPEECH"), il2cpp_string_new("{}"), NULL);
\t\t\t}
\t\t\tgoto IL_0369;
\t\t}
'''
stop_body = stop_body.replace('il2cpp_string_new("NO_SPEECH"), il2cpp_string_new("{}"), NULL);', 'il2cpp_string_new("NO_SPEECH"), WithAirisCaptureId(il2cpp_string_new("{}")), NULL);')
no_speech_branch = no_speech_branch.replace('il2cpp_string_new("{}"), NULL);', 'WithAirisCaptureId(il2cpp_string_new("{}")), NULL);')
if no_speech_branch in stop_body:
    print("[PATCH] Already present: Panel no-speech handoff guard")
elif no_speech_anchor in stop_body:
    stop_body = stop_body.replace(no_speech_anchor, no_speech_branch + no_speech_anchor, 1)
    print("[PATCH] Applied: Panel no-speech handoff guard")
else:
    raise RuntimeError("Panel no-speech handoff target not found")
content = content[:stop_start] + stop_body + content[stop_end:]

# Associate every native recording event with the capture that created it.
# This prevents a delayed WAV from a timed-out capture from consuming its retry.
capture_helper = '''#include <cstdio>
static unsigned long long s_AirisCaptureId = 0;
static String_t* WithAirisCaptureId(String_t* json)
{
    char suffix[64];
    snprintf(suffix, sizeof(suffix), "%s\\"captureId\\":%llu}", String_get_Length_m42625D67623FA5CC7A44D47425CE86FB946542D2_inline(json, NULL) > 2 ? "," : "", s_AirisCaptureId);
    String_t* prefix = String_Substring_mB1D94F47935D22E130FF2C01DBB6A4135FBB76CE(json, 0, String_get_Length_m42625D67623FA5CC7A44D47425CE86FB946542D2_inline(json, NULL) - 1, NULL);
    return String_Concat_m9E3155FB84015C823606188F53B47CB44C444991(prefix, il2cpp_string_new(suffix), NULL);
}
'''
capture_declaration = 'static String_t* WithAirisCaptureId(String_t* json);'
if capture_declaration not in content:
    definition = re.search(r'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UaaLBridge_SendTranscriptReady_m[^\n]*\n\{', content)
    if definition is None:
        raise RuntimeError('Transcript-ready definition missing')
    content = content[:definition.start()] + capture_declaration + '\n' + content[definition.start():]
if capture_helper not in content:
    marker = 'static bool IsOneOnOneScene()'
    if content.count(marker) != 1:
        raise RuntimeError('Expected one scene helper before recording ID helpers')
    old_helper = content.find('#include <cstdio>\nstatic unsigned long long s_AirisCaptureId')
    if old_helper >= 0:
        helper_end = content.index(marker, old_helper)
        content = content[:old_helper] + capture_helper + '\n' + content[helper_end:]
    else:
        content = content.replace(marker, capture_helper + '\n' + marker, 1)

for method_name in ('UaaLBridge_SendRecordingStarted_m', 'UaaLBridge_SendRecordingStopped_m', 'UaaLBridge_SendTranscriptReady_m'):
    signature = re.compile(r'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void ' + method_name + r'[^\n]*\n\{')
    matches = list(signature.finditer(content))
    if len(matches) != 1:
        raise RuntimeError('Expected one definition for ' + method_name)
    start = matches[0].start()
    end = content.index('// Method Definition Index:', start)
    body = content[start:end]
    send = re.compile(r'(UaaLBridge_SendToRN_m\w+\(__this, [^,]+, )([^,\n]+)(, NULL\);)')
    if 'WithAirisCaptureId(' not in body:
        body, count = send.subn(lambda m: m[1] + 'WithAirisCaptureId(' + m[2] + ')' + m[3], body)
        if count != 1:
            raise RuntimeError('Expected one recording event sender in ' + method_name)
    content = content[:start] + body + content[end:]

capture_start = '\t\t__this->___recordingStartTime = L_24;'
if '\t\t++s_AirisCaptureId;\n' + capture_start not in content:
    if content.count(capture_start) != 1:
        raise RuntimeError('Expected one successful capture start')
    content = content.replace(capture_start, '\t\t++s_AirisCaptureId;\n' + capture_start, 1)
content = content.replace('il2cpp_string_new("NO_SPEECH"), il2cpp_string_new("{}"), NULL);',
                          'il2cpp_string_new("NO_SPEECH"), WithAirisCaptureId(il2cpp_string_new("{}")), NULL);')

# Retry capture has no question/TTS completion event to restore the status label.
start_handler = content.rindex('IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UaaLBridge_HandleStartRecording_')
start_end = content.index('// Method Definition Index:', start_handler)
body = content[start_handler:start_end]
start_call = '\t\tRecordingManager_StartRecording_m580F92B936D4B2E0C0E103900D80E922C3CF26FA(L_2, NULL);'
listening_reset = start_call + '\n\t\tif (L_2->___U3CIsRecordingU3Ek__BackingField && __this->___dialogueManager != NULL)\n\t\t{\n\t\t\tDialogueManager_ShowListening_m24F42C86ABB159E331CEE3A759EBCED61BAD95BD(__this->___dialogueManager, NULL);\n\t\t}'
if listening_reset not in body:
    if body.count(start_call) != 1:
        raise RuntimeError('Expected one bridge capture start')
    body = body.replace(start_call, listening_reset, 1)
content = content[:start_handler] + body + content[start_end:]

# Unity can retain a recording flag when its coroutine is interrupted by scene exit.
load_start = content.rindex('IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UaaLBridge_HandleLoadScene_')
load_end = content.index('// Method Definition Index:', load_start)
load_body = content[load_start:load_end]
load_anchor = '\t//<source_info:<no-source>:1>\n'
load_reset = """\t// Cancel the previous scene's capture without saving or submitting an answer.
\tif (__this->___recordingManager != NULL)
\t{
\t\tauto recorder = __this->___recordingManager;
\t\tif (recorder->___U3CIsRecordingU3Ek__BackingField)
\t\t{
\t\t\tMicrophone_End_mB368877FCC9EA1522914006671E637848A0F7CC6(recorder->___microphoneDevice, NULL);
\t\t\trecorder->___U3CIsRecordingU3Ek__BackingField = false;
\t\t}
\t\tif (recorder->___silenceDetectionCoroutine != NULL)
\t\t{
\t\t\tMonoBehaviour_StopCoroutine_mB0FC91BE84203BD8E360B3FBAE5B958B4C5ED22A(recorder, recorder->___silenceDetectionCoroutine, NULL);
\t\t\trecorder->___silenceDetectionCoroutine = NULL;
\t\t}
\t\trecorder->___speechDetected = false;
\t\trecorder->___recording = NULL;
\t}
"""
if load_reset not in load_body:
    if load_body.count(load_anchor) != 1:
        raise RuntimeError('Expected one scene-load entry')
    load_body = load_body.replace(load_anchor, load_reset + load_anchor, 1)
content = content[:load_start] + load_body + content[load_end:]

with open(cpp_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: patch_assembly.py completed cleanly!")
