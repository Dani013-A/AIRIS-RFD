import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import { submitInterviewAnswer, transcribeAudio } from "../../services/api/interviewApi";
import { PrimaryButton } from "../../components/ui";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";

export default function ActiveSimulationScreen() {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Voice State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const { session, submitAnswer } = useInterviewStore();

  // TTS Logic
  const handleSpeak = () => {
    if (!session) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(session.currentQuestion, {
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  // STT Logic
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      } else {
        Alert.alert("Permission Required", "Please grant microphone permissions to use voice transcription.");
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        // Assume iOS/Android m4a format
        const text = await transcribeAudio(uri, "audio/m4a");
        setAnswer((prev) => (prev ? prev + " " + text : text));
      }
    } catch (error) {
      console.error("Transcription failed", error);
      Alert.alert("Transcription Error", "Failed to process audio.");
    } finally {
      setIsTranscribing(false);
      setRecording(null);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      Alert.alert("Empty Answer", "Please provide an answer before submitting.");
      return;
    }

    if (!session || !currentUser || !activeAnalysis) return;

    setLoading(true);
    try {
      const parsedResumeDict: Record<string, string> = {};
      if (Array.isArray(activeAnalysis.parsedSections)) {
        for (const sec of activeAnalysis.parsedSections) {
          parsedResumeDict[sec.name] = sec.content;
        }
      } else {
        Object.assign(parsedResumeDict, activeAnalysis.parsedSections || {});
      }

      const response = await submitInterviewAnswer({
        targetRole: session.targetRole,
        program: session.program,
        parsedResume: parsedResumeDict,
        history: session.history,
        currentQuestion: session.currentQuestion,
        currentAnswer: answer.trim(),
        currentQuestionType: session.currentQuestionType,
        totalQuestions: session.totalQuestions,
      });

      if (isSpeaking) Speech.stop();

      // Update local state with the evaluation and next question
      submitAnswer(
        answer.trim(),
        response.evaluation,
        response.nextQuestion?.question,
        response.nextQuestion?.questionType,
        response.nextQuestion?.benchmarkAnswer,
        response.isComplete,
        response.isInteractionEvent
      );

      setAnswer("");
      setIsSpeaking(false);

      if (response.isComplete) {
        router.push("/(student)/interview-session/summary" as any);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Submission Error", "Failed to submit answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stop speech if they unmount
  React.useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center">
        <Text className="text-[#1F3A5F]">Session lost. Please restart.</Text>
        <PrimaryButton title="Go Back" variant="outline" onPress={() => router.replace("/(student)/(tabs)/interview" as any)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#EAF2F7] bg-white z-10" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
           <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#1F3A5F" />
           </TouchableOpacity>
           <View className="items-center">
             <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider">Interview Active</Text>
             <Text className="text-base font-extrabold text-[#1F3A5F]">Question {session.questionsAsked}</Text>
           </View>
           <View className="w-7" />
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          
          <View className="flex-row items-start mb-6">
            <View className="h-10 w-10 bg-[#1F3A5F] rounded-full items-center justify-center mr-4 mt-1 border-2 border-white shadow-sm">
              <Ionicons name="person" size={20} color="white" />
            </View>
            <View className="flex-1 bg-white p-5 rounded-2xl rounded-tl-none border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
               <View className="flex-row items-center justify-between mb-2">
                 <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider">Interviewer</Text>
                 <TouchableOpacity onPress={handleSpeak} className="h-8 w-8 rounded-full bg-[#F4F8FB] items-center justify-center border border-[#BFD6EA]">
                   <Ionicons name={isSpeaking ? "volume-mute" : "volume-high"} size={16} color="#CA5D25" />
                 </TouchableOpacity>
               </View>
               <Text className="text-lg font-bold text-[#1F3A5F] leading-7">
                 "{session.currentQuestion}"
               </Text>
            </View>
          </View>

          <View className="mb-2">
            <Text className="text-sm font-bold text-[#1F3A5F] ml-2 mb-2">Your Answer</Text>
            <View className="bg-white rounded-2xl border border-[#BFD6EA] p-2" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <TextInput
                className="text-base text-[#1F3A5F] min-h-[150px] p-4 font-medium leading-6"
                placeholder="Type your response or tap the microphone to dictate..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={answer}
                onChangeText={setAnswer}
                editable={!loading && !isTranscribing}
              />
            </View>
            <View className="flex-row items-center justify-between mt-3 px-2">
              <TouchableOpacity 
                onPress={toggleRecording}
                className={`flex-row items-center px-4 py-2 rounded-full border ${isRecording ? "bg-[#FEF5F1] border-[#F4A47A]" : "bg-white border-[#BFD6EA]"}`}
                style={{ shadowColor: isRecording ? "#CA5D25" : "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: isRecording ? 0.3 : 0.05, shadowRadius: isRecording ? 6 : 2, elevation: 2 }}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color="#CA5D25" />
                ) : (
                  <Ionicons name="mic" size={20} color={isRecording ? "#CA5D25" : "#4F6B82"} />
                )}
                <Text className={`ml-2 font-bold text-sm ${isRecording || isTranscribing ? "text-[#CA5D25]" : "text-[#4F6B82]"}`}>
                  {isTranscribing ? "Transcribing..." : isRecording ? "Stop Recording" : "Dictate Answer"}
                </Text>
              </TouchableOpacity>
              
              <Text className="text-xs text-[#8B95A5] font-medium text-right">
                Be as specific as possible.
              </Text>
            </View>
          </View>

        </ScrollView>

        <View className="p-6 bg-white border-t border-[#EAF2F7]">
          {loading ? (
            <View className="h-14 items-center justify-center flex-row rounded-full bg-[#F4F8FB] border border-[#BFD6EA]">
              <ActivityIndicator size="small" color="#CA5D25" />
              <Text className="ml-3 font-bold text-[#4F6B82]">Analyzing response...</Text>
            </View>
          ) : (
            <PrimaryButton 
              title={session.questionsAsked >= session.totalQuestions ? "Submit & Finish" : "Submit Answer"} 
              variant="orange" 
              icon="send"
              onPress={handleSubmit} 
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
