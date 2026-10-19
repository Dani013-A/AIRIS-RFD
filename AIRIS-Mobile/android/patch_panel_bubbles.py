"""Keep Panel status activation from reviving the previous speaker's bubble."""
from pathlib import Path
import sys

CPP = Path(__file__).parent / 'unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp'
ANCHOR = '\t\tDialogueManager_EnsureListeningPanel_m1569721CDCF8FBE5CF02E53A985BB9CDABAE2AB0(__this, NULL);'
PATCH = '''
		// Move the status panel before ShowListening activates its ancestor chain.
		Scene_tA1DC762B79745EB5140F054C884855B922318356 panelScene = SceneManager_GetActiveScene_m0B320EC4302F51A71495D1CCD1A0FF9C2ED1FDC8(NULL);
		String_t* panelSceneName = Scene_get_name_m3C818DFA663E159274DAD823B780C7616C5E2A8C(&panelScene, NULL);
		if (String_op_Equality_m030E1B219352228970A076136E455C4E568C02C1(panelSceneName, il2cpp_string_new("SampleScene"), NULL))
		{
			Transform_tB27202C6F4E36D225EE28A13E4D662BF99785DB1* questionParent = NULL;
			if (__this->___interviewerSpeechBubbles != NULL && __this->___interviewerSpeechTexts != NULL)
			{
				int32_t count = static_cast<int32_t>(((RuntimeArray*)__this->___interviewerSpeechBubbles)->max_length);
				int32_t textCount = static_cast<int32_t>(((RuntimeArray*)__this->___interviewerSpeechTexts)->max_length);
				for (int32_t i = 0; i < count && i < textCount; ++i)
				{
					auto* root = __this->___interviewerSpeechBubbles->GetAt(i);
					auto* text = __this->___interviewerSpeechTexts->GetAt(i);
					if (root == NULL || text == NULL || !GameObject_get_activeInHierarchy_m49250F4F168DCC5388D5BE4F6A5681386907B109(root, NULL) ||
						String_IsNullOrWhiteSpace_m42E1F3B2C358068D645E46F01CF1834DC77A5A10(text->___m_text, NULL)) continue;
					auto* panel = DialogueManager_FindActualBubblePanel_m85A07EC999B8D34A4E569A121DB46D1CB9077A97(__this, root, text, NULL);
					if (panel != NULL) questionParent = Transform_get_parent_m65354E28A4C94EC00EBCF03532F7B0718380791E(GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(panel, NULL), NULL);
					if (questionParent != NULL) break;
				}
			}
			if (__this->___listeningPanel == NULL) return;
			if (questionParent == NULL)
			{
				GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92(__this->___listeningPanel, false, NULL);
				return;
			}
			Transform_SetParent_m9BDD7B7476714B2D7919B10BDC22CE75C0A0A195(GameObject_get_transform_m0BC10ADFA1632166AE5544BDF9038A2650C2AE56(__this->___listeningPanel, NULL), questionParent, false, NULL);
		}
'''

def patch(source):
    signature = 'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowListening_m24F42C86ABB159E331CEE3A759EBCED61BAD95BD ('
    start = source.index(signature)
    while source[source.index('\n', start) - 1] == ';':
        start = source.index(signature, start + len(signature))
    end = source.index('// Method Definition Index:', start)
    body = source[start:end]
    if body.count(ANCHOR + PATCH) == 1:
        return source
    if body.count(ANCHOR) != 1:
        raise ValueError('Expected exactly one ShowListening panel initialization')
    return source[:start] + body.replace(ANCHOR, ANCHOR + PATCH, 1) + source[end:]

if __name__ == '__main__':
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else CPP
    target.write_text(patch(target.read_text()))
    print('Panel bubble lifecycle patch applied')
