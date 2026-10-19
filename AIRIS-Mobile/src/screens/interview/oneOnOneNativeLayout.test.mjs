import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cpp = readFileSync(
  new URL("../../../android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp", import.meta.url),
  "utf8",
);

function method(name, nextMarker = "// Method Definition Index:") {
  const start = cpp.indexOf(name, cpp.indexOf("static bool IsOneOnOneScene"));
  assert.notEqual(start, -1, `${name} is missing`);
  const end = cpp.indexOf(nextMarker, start);
  return cpp.slice(start, end);
}

test("StartRecording retains the 3.5-second One-on-One duration", () => {
  const start = cpp.indexOf("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void RecordingManager_StartRecording_m", cpp.indexOf("static bool IsOneOnOneScene"));
  const body = cpp.slice(start, cpp.indexOf("// Method Definition Index:", start));
  const assignments = [...body.matchAll(/___silenceDuration = ([^;]+);/g)].map((match) => match[1]);
  assert.equal(assignments.at(-1), "(3.5f)");
  assert.equal(assignments.filter((value) => value === "(5.0f)").length, 0);
  assert.match(body, /___currentSilenceTime = \(0\.0f\)/);
});

test("One-on-One pill follows the resized bubble and reserves its own height", () => {
  const helper = method("static void EnsureListeningBackground", "IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_EnsureEndInterviewButton_m");
  const selector = method("static GameObject_t76FEDD663AB33C991A9C9A23129337651094216F* OneOnOneQuestionPanel", "static void EnsureListeningBackground");
  assert.match(selector, /interviewerSpeechBubbles\)->GetAt\(0\)/);
  assert.match(selector, /interviewerSpeechTexts\)->GetAt\(0\)/);
  assert.match(selector, /DialogueManager_FindActualBubblePanel_m/);
  assert.match(helper, /OneOnOneQuestionPanel\(dm\)/);
  assert.match(helper, /RectTransform_get_sizeDelta_m/);
  assert.match(helper, /RectTransform_get_anchoredPosition_m/);
  assert.match(helper, /if \(IsOneOnOneScene\(\) && lpRt != NULL/);
  assert.match(helper, /bubblePos\.___y - bubbleSize\.___y \* 0\.5f - gap - bgH \* 0\.5f/);
  assert.match(helper, /PanelQuestionPanel\(dm\)/);

  for (const bubbleHeight of [100, 160, 260]) {
    for (const pillHeight of [60, 90]) {
      const gap = 12;
      const bubbleBottom = 370 - 50 + pillHeight + gap;
      const bubbleCenter = bubbleBottom + bubbleHeight / 2;
      const pillCenter = bubbleCenter - bubbleHeight / 2 - gap - pillHeight / 2;
      assert.equal(bubbleCenter - bubbleHeight / 2 - (pillCenter + pillHeight / 2), gap);
      assert.equal(pillCenter - pillHeight / 2, 320);
    }
  }
});

test("Processing refreshes the pill after changing text", () => {
  const setter = method("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_SetListeningStatusText_m", "// Method Definition Index:");
  const textUpdate = setter.indexOf("VirtualActionInvoker1< String_t* >::Invoke(66, L_2, L_3);");
  assert.notEqual(textUpdate, -1);
  assert.ok(setter.indexOf("EnsureListeningBackground(__this);", textUpdate) > textUpdate);
  assert.match(cpp, /il2cpp_string_new\("Processing answer\.\.\."\)/);
});
