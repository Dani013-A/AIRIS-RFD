import re

CPP_PATH = "AIRIS-Mobile/android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp"

with open(CPP_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Ensure IsValidUnityObject helper and EnsureEndInterviewButton implementation
new_ensure_section = """// Method Definition Index: 71589
static inline bool IsValidUnityObject(RuntimeObject* obj)
{
	return obj != NULL && Object_op_Inequality_mD0BE578448EAA61948F25C32F8DD55AB1F778602((Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C*)obj, NULL, NULL);
}

static GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* CreateVRButton(
	DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm,
	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* parentTr,
	const char* goName,
	const char* labelText,
	float posX,
	float posY,
	Color_tD001788D726C3A7F1379BEED0260B9591F440C1F bgColor,
	const RuntimeMethod* callbackMethodVar,
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* btnCompTypes,
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* txtCompTypes)
{
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* btnGo = (GameObject_t76FEDD663AB33C991A9C9A23129337651094216F*)il2cpp_codegen_object_new(GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
	GameObject__ctor_m721D643351E55308EA4F5F41B67D5446D11C61F0(btnGo, il2cpp_string_new(goName), btnCompTypes, NULL);

	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* btnTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(btnGo, NULL);
	Transform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(btnTr, parentTr, (bool)0, NULL);

	RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* rt = GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(btnGo, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
	if (rt != NULL)
	{
		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_center;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_center), 0.5f, 0.5f, NULL);
		RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(rt, v_center, NULL);
		RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(rt, v_center, NULL);
		RectTransform_set_pivot_m79D0177D383D432A93C2615F1932B739B1C6E146(rt, v_center, NULL);

		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_sz;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_sz), 220.0f, 65.0f, NULL);
		RectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(rt, v_sz, NULL);

		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_pos;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_pos), posX, posY, NULL);
		RectTransform_set_anchoredPosition_mF903ACE04F6959B1CD67E2B94FABC0263068F965(rt, v_pos, NULL);
	}

	Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E* img = GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D(btnGo, GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
	if (img != NULL)
	{
		VirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, img, bgColor);
		Graphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)img, (bool)1, NULL);
	}

	Button_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098* btn = GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290(btnGo, GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var);
	if (btn != NULL)
	{
		Selectable_set_targetGraphic_m23DB0DF4E5F2DABD50C662C708B4555162171FB9(btn, (Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)img, NULL);
		ButtonClickedEvent_t8EA72E90B3BD1392FB3B3EF167D5121C23569E4C* evt = Button_get_onClick_m701712A7F7F000CC80D517C4510697E15722C35C_inline(btn, NULL);
		if (callbackMethodVar != NULL)
		{
			UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7* act = (UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7*)il2cpp_codegen_object_new(UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7_il2cpp_TypeInfo_var);
			UnityAction__ctor_mC53E20D6B66E0D5688CD81B88DBB34F5A58B7131(act, (RuntimeObject*)dm, (intptr_t)callbackMethodVar, NULL);
			UnityEvent_AddListener_m8AA4287C16628486B41DA41CA5E7A856A706D302(evt, act, NULL);
		}
	}

	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* txtGo = (GameObject_t76FEDD663AB33C991A9C9A23129337651094216F*)il2cpp_codegen_object_new(GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
	GameObject__ctor_m721D643351E55308EA4F5F41B67D5446D11C61F0(txtGo, il2cpp_string_new("Text (TMP)"), txtCompTypes, NULL);

	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* txtTr = GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(txtGo, NULL);
	Transform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(txtTr, btnTr, (bool)0, NULL);

	RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5* txtRt = GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4(txtGo, GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
	if (txtRt != NULL)
	{
		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_zero;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_zero), 0.0f, 0.0f, NULL);
		RectTransform_set_anchorMin_m931442ABE3368D6D4309F43DF1D64AB64B0F52E3(txtRt, v_zero, NULL);

		Vector2_t1FD6F485C871E832B347AB2DC8CBA08B739D8DF7 v_one;
		Vector2__ctor_m9525B79969AFFE3254B303A40997A56DEEB6F548_inline((&v_one), 1.0f, 1.0f, NULL);
		RectTransform_set_anchorMax_m52829ABEDD229ABD3DA20BCA676FA1DCA4A39B7D(txtRt, v_one, NULL);
		RectTransform_set_sizeDelta_mC9A980EA6036E6725EF24CEDF3EE80A9B2B50EE5(txtRt, v_zero, NULL);
	}

	TextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957* tmp = GameObject_GetComponent_TisTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_mBDBF977A8C7734F6EDD83FC65C6FDDE74427611E(txtGo, GameObject_GetComponent_TisTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_mBDBF977A8C7734F6EDD83FC65C6FDDE74427611E_RuntimeMethod_var);
	if (tmp != NULL)
	{
		VirtualActionInvoker1< String_t* >::Invoke(66, tmp, il2cpp_string_new(labelText));
		TMP_Text_set_fontSize_m1C3A3BA2BC88E5E1D89375FD35A0AA91E75D3AAD(tmp, 22.0f, NULL);
		TMP_Text_set_alignment_mE5216A28797987CC19927ED3CB8DFAC438C6B95A(tmp, 514, NULL);
		Color_tD001788D726C3A7F1379BEED0260B9591F440C1F col_w = Color_get_white_m068F5AF879B0FCA584E3693F762EA41BB65532C6_inline(NULL);
		VirtualActionInvoker1< Color_tD001788D726C3A7F1379BEED0260B9591F440C1F >::Invoke(23, tmp, col_w);
		Graphic_set_raycastTarget_mE3D3CBB94E605C13362A592F17420AEAAC771448((Graphic_tCBFCA4585A19E2B75465AECFEAC43F4016BF7931*)tmp, (bool)0, NULL);
	}

	return btnGo;
}

IL2CPP_EXTERN_C void DialogueManager_OnDoneAnsweringClicked (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)
{
	__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][DONE_ANSWERING_CLICKED]");
	if (__this != NULL && IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton))
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
	}
	UaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* bridge = UaaLBridge_get_Instance_mC704985B67D85B378A99F9C2D52DE746FFC2869A_inline(NULL);
	if (bridge != NULL && bridge->___recordingManager != NULL)
	{
		RecordingManager_StopRecording_m2DB440DFA21CD12C4F485BAFAF229C2AAE13F693(bridge->___recordingManager, NULL);
	}
}

IL2CPP_EXTERN_C void DialogueManager_OnNextQuestionClicked (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method)
{
	__android_log_print(ANDROID_LOG_INFO, "Unity", "[VR][NEXT_QUESTION_CLICKED]");
	if (__this != NULL && IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton))
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
	}
	UaaLBridge_t01892D4E14A0FC836DBF5A0384CB1121D3DC06BC* bridge = UaaLBridge_get_Instance_mC704985B67D85B378A99F9C2D52DE746FFC2869A_inline(NULL);
	if (bridge != NULL)
	{
		UaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1(bridge, il2cpp_string_new("NEXT_QUESTION"), il2cpp_string_new("{}"), NULL);
	}
}

IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883 (DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Button_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Debug_t8394C7EEAECA3689C2C9B9DE9C7166D73596276F_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisButton_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_mB997CBF78A37938DC1624352E12D0205078CB290_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisImage_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_mA59EA7D5F9133B2593F4AB70B099928BA955EE7D_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisRectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_m1592DCB5AA07291F73A76006F0913A64DFB8A9C4_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_GetComponent_TisTextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_mBDBF977A8C7734F6EDD83FC65C6FDDE74427611E_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_t76FEDD663AB33C991A9C9A23129337651094216F_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&UnityAction_t11A1F3B953B365C072A5DCC32677EE1796A962A7_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Component_GetComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m8D88AC7AC775DA9FE3783014A4448A8C60283FF1_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GameObject_AddComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m308DCE149216D4787C3E6147729C0DF79423E1BF_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}

	if (__this == NULL) return;

	// Find canvas from speech bubble or scene
	Canvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26* canvas = NULL;
	if (IsValidUnityObject((RuntimeObject*)__this->___speechBubble))
	{
		canvas = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(__this->___speechBubble, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
	}
	if (canvas == NULL)
	{
		TransformU5BU5D_tBB9C5F5686CAE82E3D97D43DF0F3D68ABF75EC24* allTr = Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3(Resources_FindObjectsOfTypeAll_TisTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1_m56A6F564366266466FB378CA2FE4AE1DB2DB79C3_RuntimeMethod_var);
		if (allTr != NULL)
		{
			int32_t len = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)allTr)->max_length),NULL));
			for (int32_t i = 0; i < len; ++i)
			{
				Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* t = (allTr)->GetAt(static_cast<il2cpp_array_size_t>(i));
				if (t != NULL && Object_get_hideFlags_mA08F5E41671B8C6B5073C6B9E2799BCE6E0DF7F3(t, NULL) == 0)
				{
					GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* go = Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B(t, NULL);
					Scene_tA1DC762B79745EB5140F054C884855B922318356 sc = GameObject_get_scene_m747D45E8CECC56DD47D1E103F9E51D5FBEDA4B01(go, NULL);
					if (Scene_get_isLoaded_m5BC54CEB27330040A0BC69E66E94EE97E87298BC((&sc), NULL))
					{
						Canvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26* c = GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991(go, GameObject_GetComponentInParent_TisCanvas_t2DB4CEFDFF732884866C83F11ABF75F5AE8FFB26_m0A41CB7A7F9A10FCC98D1C7B5799D57C2724D991_RuntimeMethod_var);
						if (c != NULL)
						{
							canvas = c;
							break;
						}
					}
				}
			}
		}
	}

	if (canvas == NULL)
	{
		__android_log_print(ANDROID_LOG_WARN, "Unity", "[DialogueManager] Canvas not found");
		return;
	}

	// Ensure GraphicRaycaster is present and enabled on the Canvas
	GraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B* gr = Component_GetComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m8D88AC7AC775DA9FE3783014A4448A8C60283FF1((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)canvas, Component_GetComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m8D88AC7AC775DA9FE3783014A4448A8C60283FF1_RuntimeMethod_var);
	if (gr == NULL)
	{
		gr = GameObject_AddComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m308DCE149216D4787C3E6147729C0DF79423E1BF(Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)canvas, NULL), GameObject_AddComponent_TisGraphicRaycaster_t16FC39434AE5B47D3C2993134CDCF7F4AE6A6D7B_m308DCE149216D4787C3E6147729C0DF79423E1BF_RuntimeMethod_var);
	}
	if (gr != NULL)
	{
		Behaviour_set_enabled_mF1DCFE60EB09E0529FE9476CA804A3AA2D72B16A((Behaviour_t01970CFBBA658497AE30F311C447DB0440BAB7FA*)gr, (bool)1, NULL);
	}

	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* canvasTr = Component_get_transform_m2919A1D81931E6932C7F06D4C2F0AB8DDA9A5371((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)canvas, NULL);

	// Check if our VR buttons are already children of this Canvas
	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* endTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("EndInterviewButton_VR"), NULL);
	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* nextTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("NextQuestionButton_VR"), NULL);
	Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* stopTr = Transform_Find_m3087032B0E1C5B96A2D2C27020BAEAE2DA08F932(canvasTr, il2cpp_string_new("StopRecordingButton_VR"), NULL);

	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* vrEndBtn = endTr != NULL ? Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)endTr, NULL) : NULL;
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* vrNextBtn = nextTr != NULL ? Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)nextTr, NULL) : NULL;
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* vrStopBtn = stopTr != NULL ? Component_get_gameObject_m57AEFBB14DB39EC476F740BA000E170355DE691B((Component_t39FBE53E5EFCF4409111FB22C15FF73717632EC3*)stopTr, NULL) : NULL;

	// Hide prefab scene buttons and listeningPanel to eliminate rogue UI elements and circular artifacts
	if (IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton) && __this->___nextQuestionButton != vrNextBtn)
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
	}
	if (IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton) && __this->___stopRecordingButton != vrStopBtn)
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
	}
	if (IsValidUnityObject((RuntimeObject*)__this->___listeningPanel))
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, (bool)0, NULL);
	}

	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* btnCompTypes = NULL;
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* txtCompTypes = NULL;

	if (vrEndBtn == NULL || vrNextBtn == NULL || vrStopBtn == NULL)
	{
		btnCompTypes = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)4);
		btnCompTypes->SetAt(0, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var) }, NULL));
		btnCompTypes->SetAt(1, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var) }, NULL));
		btnCompTypes->SetAt(2, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(Image_tBC1D03F63BF71132E9A5E472B8742F172A011E7E_0_0_0_var) }, NULL));
		btnCompTypes->SetAt(3, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(Button_t6786514A57F7AFDEE5431112FEA0CAB24F5AE098_0_0_0_var) }, NULL));

		txtCompTypes = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)3);
		txtCompTypes->SetAt(0, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(RectTransform_t6C5DA5E41A89E0F488B001E45E58963480E543A5_0_0_0_var) }, NULL));
		txtCompTypes->SetAt(1, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(CanvasRenderer_tAB9A55A976C4E3B2B37D0CE5616E5685A8B43860_0_0_0_var) }, NULL));
		txtCompTypes->SetAt(2, Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57((RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B){ reinterpret_cast<intptr_t>(TextMeshProUGUI_t101091AF4B578BB534C92E9D1EEAF0611636D957_0_0_0_var) }, NULL));
	}

	// 1. Ensure End Interview Button at (+130, -260)
	if (vrEndBtn == NULL)
	{
		Color_tD001788D726C3A7F1379BEED0260B9591F440C1F colEnd;
		Color__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colEnd), 0.20f, 0.25f, 0.33f, 0.95f, NULL);
		vrEndBtn = CreateVRButton(__this, canvasTr, "EndInterviewButton_VR", "End Interview", 130.0f, -260.0f, colEnd, (const RuntimeMethod*)DialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919_RuntimeMethod_var, btnCompTypes, txtCompTypes);
	}
	__this->___endInterviewButton = vrEndBtn;
	if (IsValidUnityObject((RuntimeObject*)__this->___endInterviewButton))
	{
		GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___endInterviewButton, (bool)1, NULL);
	}

	// 2. Ensure Next Question Button at (-130, -260)
	if (vrNextBtn == NULL)
	{
		Color_tD001788D726C3A7F1379BEED0260B9591F440C1F colNq;
		Color__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colNq), 0.12f, 0.45f, 0.75f, 0.95f, NULL);
		vrNextBtn = CreateVRButton(__this, canvasTr, "NextQuestionButton_VR", "Next Question", -130.0f, -260.0f, colNq, NULL, btnCompTypes, txtCompTypes);
	}
	__this->___nextQuestionButton = vrNextBtn;

	// 3. Ensure Done Answering Button at (-130, -260)
	if (vrStopBtn == NULL)
	{
		Color_tD001788D726C3A7F1379BEED0260B9591F440C1F colDa;
		Color__ctor_m3786F0D6E510D9CFA544523A955870BD2A514C8C_inline((&colDa), 0.05f, 0.50f, 0.35f, 0.95f, NULL);
		vrStopBtn = CreateVRButton(__this, canvasTr, "StopRecordingButton_VR", "Done Answering", -130.0f, -260.0f, colDa, NULL, btnCompTypes, txtCompTypes);
	}
	__this->___stopRecordingButton = vrStopBtn;

	__android_log_print(ANDROID_LOG_INFO, "Unity", "[DialogueManager] All 3 buttons ensured at dedicated lower VR area (y=-260)");
}"""

idx_ensure_start = content.find("// Method Definition Index: 71589\nstatic GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* CreateVRButton")
if idx_ensure_start == -1:
    idx_ensure_start = content.find("// Method Definition Index: 71589\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883")
assert idx_ensure_start != -1, "Cannot find EnsureEndInterviewButton start"

idx_ensure_end = content.find("// Method Definition Index: 71590\nIL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_OnEndInterviewClicked_m7E4FF429B8EB1FECF8874B87C0E155A521280919", idx_ensure_start)
assert idx_ensure_end != -1, "Cannot find EnsureEndInterviewButton end"

content = content[:idx_ensure_start] + new_ensure_section + "\n" + content[idx_ensure_end:]
print("Updated EnsureEndInterviewButton with IsValidUnityObject and Transform_Find lookup")

# 2. Update ShowSpeaker
show_spk_pattern = r"(IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_mCD89D0F471D5CE1FEF09482ED02FF990DE9A8777 [^{]+\{\n)(?:[^\n]*\n)*?(\tstatic bool s_Il2CppMethodInitialized;)"
new_show_spk = r"""\1	if (__this != NULL)
	{
		DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883(__this, NULL);
		if (IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
		}
		if (IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
		}
		if (IsValidUnityObject((RuntimeObject*)__this->___listeningPanel))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, (bool)0, NULL);
		}
	}
\2"""
content = re.sub(show_spk_pattern, new_show_spk, content, count=1)
print("Updated DialogueManager_ShowSpeaker")

# 3. Update ShowListening
show_listening_pattern = r"(IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowListening_m24F42C86ABB159E331CEE3A759EBCED61BAD95BD [^{]+\{\n)(?:[^\n]*\n)*?(\tTransform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1\* V_10 = NULL;\n\t\{)"
new_show_listening = r"""\1\2
		DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883(__this, NULL);
		if (IsValidUnityObject((RuntimeObject*)__this->___listeningPanel))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, (bool)0, NULL);
		}
		if (IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)0, NULL);
		}
		if (IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)1, NULL);
		}
		return;
	}"""
content = re.sub(show_listening_pattern, new_show_listening, content, count=1)
print("Updated DialogueManager_ShowListening")

# 4. Update ShowNextQuestionButton
show_nqb_pattern = r"(IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF [^{]+\{\n)(?:[^\n]*\n)*?(\tstatic bool s_Il2CppMethodInitialized;)"
new_show_nqb = r"""\1	if (__this != NULL)
	{
		DialogueManager_EnsureEndInterviewButton_m04272AA0BF77748417E7436B0E82F259254FD883(__this, NULL);
		DialogueManager_HideListening_m315365A5231BCA401133E9B2FEA85AD2ABB5A71B(__this, NULL);
		if (IsValidUnityObject((RuntimeObject*)__this->___listeningPanel))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, (bool)0, NULL);
		}
		if (IsValidUnityObject((RuntimeObject*)__this->___stopRecordingButton))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___stopRecordingButton, (bool)0, NULL);
		}
		if (IsValidUnityObject((RuntimeObject*)__this->___nextQuestionButton))
		{
			GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___nextQuestionButton, (bool)1, NULL);
		}
		return;
	}
\2"""
content = re.sub(show_nqb_pattern, new_show_nqb, content, count=1)
print("Updated DialogueManager_ShowNextQuestionButton")

# 5. Update VRGazeReticle_HandleTriggerInput with IsValidUnityObject
handle_trigger_pattern = r"(IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void VRGazeReticle_HandleTriggerInput_m4CE8E72D7602058AEB61BF47B626C8B561CDAE51 [^{]+\{\n)(?:[^\n]*\n)*?(// Method Definition Index: 71808)"
new_handle_trigger = r"""\1	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}

	il2cpp_codegen_runtime_class_init_inline(EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707_il2cpp_TypeInfo_var);
	EventSystem_t61C51380B105BE9D2C39C4F15B7E655659957707* curEvt = EventSystem_get_current_mBE06AF70A64843939BF60A82EC0166299FE89052(NULL);
	if (curEvt == NULL) return;

	PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB* pData = (PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB*)il2cpp_codegen_object_new(PointerEventData_t9670F3C7D823CCB738A1604C72A1EB90292396FB_il2cpp_TypeInfo_var);
	PointerEventData__ctor_m63837790B68893F0022CCEFEF26ADD55A975F71C(pData, curEvt, NULL);

	// 1. If reticle is currently hovering a button, click that button
	GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* target = __this->___currentHoveredObject;
	if (IsValidUnityObject((RuntimeObject*)target))
	{
		__android_log_print(ANDROID_LOG_INFO, "Unity", "[VRGazeReticle] Click on gaze-targeted button");
		VRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, target, pData, NULL);
		return;
	}

	// 2. Fallback to active primary button in DialogueManager
	il2cpp_codegen_runtime_class_init_inline(Object_tC12DECB6760A7F2CBF65D9DCF18D044C2D97152C_il2cpp_TypeInfo_var);
	DialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E* dm = Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04(Object_FindFirstObjectByType_TisDialogueManager_t9C5A5026BF70075C3D71B589FB5D5EA74A3B9B1E_mB5F5E264B53B50B5BBA41B4FF562CA254BAD8F04_RuntimeMethod_var);
	if (dm != NULL)
	{
		if (IsValidUnityObject((RuntimeObject*)dm->___stopRecordingButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___stopRecordingButton, NULL))
		{
			__android_log_print(ANDROID_LOG_INFO, "Unity", "[VRGazeReticle] Trigger clicking StopRecordingButton");
			VRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, dm->___stopRecordingButton, pData, NULL);
			return;
		}
		else if (IsValidUnityObject((RuntimeObject*)dm->___nextQuestionButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___nextQuestionButton, NULL))
		{
			__android_log_print(ANDROID_LOG_INFO, "Unity", "[VRGazeReticle] Trigger clicking NextQuestionButton");
			VRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, dm->___nextQuestionButton, pData, NULL);
			return;
		}
		else if (IsValidUnityObject((RuntimeObject*)dm->___endInterviewButton) && GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(dm->___endInterviewButton, NULL))
		{
			__android_log_print(ANDROID_LOG_INFO, "Unity", "[VRGazeReticle] Trigger clicking EndInterviewButton");
			VRGazeReticle_TriggerClick_m310A824F7DA6C4DA98CD9A584344582F39DE7BCF(__this, dm->___endInterviewButton, pData, NULL);
			return;
		}
		else
		{
			__android_log_print(ANDROID_LOG_INFO, "Unity", "[VRGazeReticle] Trigger ignored: no active button");
		}
	}
}

\2"""
content = re.sub(handle_trigger_pattern, new_handle_trigger, content, count=1)
print("Updated VRGazeReticle_HandleTriggerInput")

with open(CPP_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Assembly-CSharp.cpp patched successfully!")
