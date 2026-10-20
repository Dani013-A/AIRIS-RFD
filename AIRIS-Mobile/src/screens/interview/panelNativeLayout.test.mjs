import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cpp = readFileSync(
  new URL("../../../android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp", import.meta.url),
  "utf8",
);
const patch = readFileSync(new URL("../../../android/patch_assembly.py", import.meta.url), "utf8");

function section(start, end) {
  const from = cpp.indexOf(start, cpp.indexOf("static bool IsOneOnOneScene"));
  assert.notEqual(from, -1);
  const to = cpp.indexOf(end, from);
  assert.notEqual(to, -1);
  return cpp.slice(from, to);
}

test("Panel resolves the visible speaker's paired bubble and text", () => {
  const selector = section("static GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* PanelQuestionPanel", "static void EnsureListeningBackground");
  assert.match(selector, /for \(int32_t i = 0; i < bubbleCount; \+\+i\)/);
  assert.match(selector, /interviewerSpeechBubbles->GetAt\(i\)/);
  assert.match(selector, /interviewerSpeechTexts->GetAt\(i\)/);
  assert.match(selector, /if \(!IsValidUnityObject\(\(RuntimeObject\*\)text\)\) text = dm->___speechText/);
  assert.match(selector, /GameObject_get_activeSelf_m/);
  assert.match(selector, /DialogueManager_FindActualBubblePanel_m/);
  assert.doesNotMatch(selector, /GetAt\(static_cast<il2cpp_array_size_t>\(1\)\)/);
  assert.doesNotMatch(cpp, /s_ActivePanelSpeakerIndex/);
  assert.match(patch, /static GameObject_t[^\n]* PanelQuestionPanel/);
});

test("Panel keeps one pill in the active bubble's parent and resizes for status changes", () => {
  const helper = section("static void EnsureListeningBackground", "IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m");
  assert.match(helper, /Transform_SetParent_m[^\n]*\(lpTr, canvasTr, \(bool\)0, NULL\)/);
  assert.match(helper, /Transform_Find_m[^\n]*ListeningBackground_VR/);
  assert.match(helper, /RectTransform_get_sizeDelta_m[^\n]*bubbleRt/);
  assert.match(helper, /RectTransform_get_anchoredPosition_m[^\n]*bubbleRt/);
  assert.match(helper, /RectTransform_set_anchorMin_m[^\n]*lpRt, bubbleAnchorMin/);
  assert.match(helper, /RectTransform_set_anchorMax_m[^\n]*lpRt, bubbleAnchorMax/);
  assert.match(helper, /Transform_set_localScale_m[^\n]*\(lpTr, bubbleScale, NULL\)/);
  assert.match(helper, /Transform_set_localRotation_m[^\n]*\(lpTr, bubbleRotation, NULL\)/);
  assert.match(helper, /refBubble = IsOneOnOneScene\(\) \? dm->___speechBubble : PanelQuestionPanel\(dm\)/);
  assert.match(helper, /TMP_Text_get_preferredWidth_m/);
  assert.match(helper, /TMP_Text_get_preferredHeight_m/);
  assert.match(helper, /310\.0f - 50\.0f/);
  const panelCenter = helper.indexOf("// Panel's serialized status text has an offset from its parent.");
  const position = helper.indexOf("const float gap = 14.0f;");
  assert.ok(panelCenter > 0 && panelCenter < position);
  const centered = helper.slice(panelCenter, position);
  assert.match(centered, /RectTransform_set_sizeDelta_m[^\n]*\(lpRt, rootSize, NULL\)/);
  assert.match(centered, /RectTransform_set_anchoredPosition_m[^\n]*\(bgRt, zero, NULL\)/);
  assert.match(centered, /RectTransform_set_anchoredPosition_m[^\n]*\(txtRt, zero, NULL\)/);

  const setter = section("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_SetListeningStatusText_m", "// Method Definition Index:");
  assert.match(setter, /VirtualActionInvoker1< String_t\* >::Invoke\(66, L_2, L_3\);\s*EnsureListeningBackground\(__this\);/);
  const resize = section("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool U3CResizeSpeechBubbleCoroutineU3Ed__33_MoveNext_m", "// Method Definition Index:");
  assert.match(resize, /Canvas_ForceUpdateCanvases_m[^\n]*\(NULL\);\s*if \(!IsOneOnOneScene\(\)/);
  assert.match(resize, /EnsureListeningBackground\(V_1\)/);
});

test("Panel bubble and pill stay separated across speaker and multiline sizes", () => {
  for (const speaker of [0, 1, 2]) {
    for (const bubbleHeight of [100, 160, 260]) {
      for (const pillHeight of [60, 90]) {
        const pivot = 0.5;
        const gap = 14;
        const baseline = 310 - 50;
        const bubbleBottom = baseline + pillHeight + gap;
        const bubblePosition = bubbleBottom + pivot * bubbleHeight;
        const pillPosition = bubbleBottom - gap - (1 - pivot) * pillHeight;
        const actualBubbleBottom = bubblePosition - pivot * bubbleHeight;
        const actualPillTop = pillPosition + (1 - pivot) * pillHeight;
        assert.equal(actualBubbleBottom - actualPillTop, gap, `speaker ${speaker}`);
        assert.equal(pillPosition - pivot * pillHeight, baseline, `speaker ${speaker}`);
      }
    }
  }
});

test("Panel shares the 3.5-second duration and keeps Processing status", () => {
  const recording = section("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void RecordingManager_StartRecording_m", "// Method Definition Index:");
  assert.match(recording, /___silenceDuration = \(3\.5f\)/);
  assert.doesNotMatch(recording, /___silenceDuration = IsOneOnOneScene\(\) \? \(3\.5f\) : \(5\.0f\)/);
  assert.match(cpp, /il2cpp_string_new\("Processing answer\.\.\."\)/);
});

test("Panel suppresses serialized desk buttons after ShowSpeaker reactivates bubble children", () => {
  const speaker = section("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowSpeaker_m", "// Method Definition Index:");
  const activate = speaker.indexOf("DialogueManager_SetAllChildrenActive_m");
  const suppress = speaker.lastIndexOf("if (!IsOneOnOneScene()) SuppressAllDeskButtons(__this);");
  assert.ok(activate >= 0, "ShowSpeaker must activate the selected bubble children");
  assert.ok(suppress > activate, "Panel buttons must be hidden after child activation");
});
