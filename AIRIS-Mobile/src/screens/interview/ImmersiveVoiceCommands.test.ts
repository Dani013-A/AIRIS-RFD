jest.mock('../../services/firebase/pendingInterviewCompletion',()=>({rememberInterviewCompletion:jest.fn(async()=>{})}));
import { parseVRVoiceCommand } from "./voiceCommands";

describe("VR Voice Command Parsing (parseVRVoiceCommand)", () => {
  describe("NEXT / SKIP Commands", () => {
    const nextPhrases = [
      "next",
      "next question",
      "skip",
      "skip this",
      "skip this question",
      "move on",
      "let's move on",
      "go to the next question",
      "continue",
      "let's continue",
      "I want to skip this",
      "can we move to the next one?",
      "can we move on?",
      "Can you ask the next question?",
      "Let's move on to the next question.",
      "Skip this one.",
      "pass",
      "next please",
      "I would like to move on to the next question.",
    ];

    test.each(nextPhrases)("correctly classifies '%s' as NEXT_QUESTION", (phrase) => {
      expect(parseVRVoiceCommand(phrase)).toBe("NEXT_QUESTION");
    });
  });

  describe("REPEAT Commands", () => {
    const repeatPhrases = [
      "repeat",
      "repeat the question",
      "say that again",
      "ask that again",
      "what was the question?",
      "can you repeat that?",
      "Can you repeat the question?",
      "Sorry, what was the question?",
      "Can you say that again?",
      "pardon",
      "could you repeat the question please",
    ];

    test.each(repeatPhrases)("correctly classifies '%s' as REPEAT_QUESTION", (phrase) => {
      expect(parseVRVoiceCommand(phrase)).toBe("REPEAT_QUESTION");
    });
  });

  describe("STOP Commands", () => {
    const stopPhrases = [
      "stop",
      "stop the interview",
      "Stop the interview.",
      "end the interview",
      "quit",
      "exit",
      "please stop",
      "stop please",
    ];

    test.each(stopPhrases)("correctly classifies '%s' as STOP", (phrase) => {
      expect(parseVRVoiceCommand(phrase)).toBe("STOP");
    });
  });

  describe("Substantive Answers (Must NOT be classified as commands)", () => {
    const substantiveAnswers = [
      "In my next project, I will continue to learn Python and move on to advanced topics.",
      "My greatest strength is that I always finish the next task on time and skip unnecessary steps.",
      "For my next role, I want to continue developing as a frontend engineer.",
      "When faced with difficult code, I do not just skip it; I continue debugging until it works.",
      "I think the next step for me in this position is to learn how the team manages deployments.",
      "I repeated the experiment three times to ensure the results were reliable.",
    ];

    test.each(substantiveAnswers)("correctly returns null for substantive answer: '%s'", (answer) => {
      expect(parseVRVoiceCommand(answer)).toBeNull();
    });
  });
});
