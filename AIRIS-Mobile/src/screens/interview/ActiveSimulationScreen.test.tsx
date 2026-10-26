jest.mock('../../services/firebase/pendingInterviewCompletion',()=>({rememberInterviewCompletion:jest.fn(async()=>{})}));
import React from 'react';
const {act,create}=require('react-test-renderer');
const mockRouter={push:jest.fn(),replace:jest.fn()};
const mockRecorder={isRecording:false,uri:'file://synthetic-answer.m4a',prepareToRecordAsync:jest.fn(async()=>{}),record:jest.fn(()=>{mockRecorder.isRecording=true;}),stop:jest.fn(async()=>{mockRecorder.isRecording=false;})};
jest.mock('expo-router',()=>({useRouter:()=>mockRouter}));
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView'}));
jest.mock('react-native',()=>({View:'View',TouchableOpacity:'TouchableOpacity',ActivityIndicator:'ActivityIndicator',ScrollView:'ScrollView',Modal:'Modal',Alert:{alert:jest.fn()},Linking:{openSettings:jest.fn()},Animated:{View:'AnimatedView',Value:class{stopAnimation(){}setValue(){}},loop:()=>({start(){},stop(){}}),sequence:()=>({}),timing:()=>({})}}));
jest.mock('../../components/ui/AppText',()=>({Text:'Text'}));
jest.mock('../../components/ui',()=>({PrimaryButton:jest.requireActual('../../components/ui/PrimaryButton').PrimaryButton,SecondaryButton:jest.requireActual('../../components/ui/SecondaryButton').SecondaryButton,CaptureStatusPill:'CaptureStatusPill'}));
jest.mock('expo-audio',()=>({requestRecordingPermissionsAsync:async()=>({granted:true}),setAudioModeAsync:async()=>{},useAudioRecorder:()=>mockRecorder,RecordingPresets:{HIGH_QUALITY:{}}}));
jest.mock('expo-speech',()=>({speak:jest.fn(),stop:jest.fn()}));
jest.mock('../../store/authStore',()=>{const state={currentUser:{uid:'synthetic-owner'}};return{useAuthStore:(selector:any)=>selector(state)};});
jest.mock('../../store/resumeStore',()=>{const state={activeAnalysis:{parsedSections:[{name:'Education',content:'Synthetic coursework'}]}};return{useResumeStore:(selector:any)=>selector(state)};});
jest.mock('../../services/api/interviewApi',()=>({cancelInterviewSimulation:jest.fn(async()=>{}),submitInterviewAnswer:jest.fn(),transcribeAudio:jest.fn()}));
import ActiveSimulationScreen from './ActiveSimulationScreen';
import {useInterviewStore} from '../../store/interviewStore';
import {submitInterviewAnswer,transcribeAudio} from '../../services/api/interviewApi';
import * as Speech from 'expo-speech';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let renderer:any;
const response=(question='Approved Q2',questionType='behavioral')=>({evaluation:{overall:73},nextQuestion:{question,questionType,benchmarkAnswer:'Approved benchmark'},isInteractionEvent:false,isComplete:false});
const labels=()=>renderer.root.findAllByType('Text').map((node:any)=>node.props.children).flat().join(' ');
const mic=(label:string)=>renderer.root.findByProps({accessibilityLabel:label});
const next=()=>renderer.root.findAllByType('TouchableOpacity').find((node:any)=>node.findAllByType('Text').some((text:any)=>['Next Question','Finish Interview'].includes(text.props.children)));
async function mount(){await act(async()=>{renderer=create(<ActiveSimulationScreen/>);});}
async function record(answer='Synthetic complete answer with a specific example.'){
 (transcribeAudio as jest.Mock).mockResolvedValueOnce({transcription:answer});
 await act(async()=>{mic('Record answer').props.onPress();});
 await act(async()=>{mic('Stop recording').props.onPress();});
 expect(labels()).toContain(answer);
}
beforeEach(()=>{jest.clearAllMocks();mockRecorder.isRecording=false;useInterviewStore.getState().initializeSession({userId:'synthetic-owner',targetRole:'Synthetic role',firstQuestion:'Approved Q1',firstQuestionType:'introductory',totalQuestions:10});useInterviewStore.getState().setStatus('active');});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());renderer=undefined;});
it('actual screen advances Q1 to Q2 to Q3 from one press per accepted answer',async()=>{
 await mount();
 for(let index=1;index<=2;index++){
  await record(`Synthetic answer ${index} describing an actual fixture action.`);
  (submitInterviewAnswer as jest.Mock).mockResolvedValueOnce(response(`Approved Q${index+1}`));
  await act(async()=>{await next().props.onPress();});
  expect(useInterviewStore.getState().session?.currentQuestion).toBe(`Approved Q${index+1}`);
  expect(useInterviewStore.getState().session?.history).toHaveLength(index);
  expect(labels()).not.toContain('Your response:');
 }
 expect(submitInterviewAnswer).toHaveBeenCalledTimes(2);
});
it('rapid repeated presses during a delayed request submit and advance exactly once',async()=>{
 await mount();await record();let release:any;
 (submitInterviewAnswer as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 let pending:any;const press=next().props.onPress;
 await act(async()=>{pending=press();void press();});
 expect(submitInterviewAnswer).toHaveBeenCalledTimes(1);expect(useInterviewStore.getState().session?.history).toHaveLength(0);expect(labels()).toContain('Your response:');
 await act(async()=>{release(response());await pending;});
 expect(useInterviewStore.getState().session?.history).toHaveLength(1);expect(labels()).not.toContain('Your response:');
});
it('network failure preserves answer and a deliberate retry commits once',async()=>{
 await mount();await record();(submitInterviewAnswer as jest.Mock).mockRejectedValueOnce(new Error('Synthetic network unavailable'));
 await act(async()=>{await next().props.onPress();});
 expect(labels()).toContain('Synthetic network unavailable');expect(labels()).toContain('Your response:');expect(useInterviewStore.getState().session?.history).toHaveLength(0);
 (submitInterviewAnswer as jest.Mock).mockResolvedValueOnce(response());await act(async()=>{await next().props.onPress();});
 expect(useInterviewStore.getState().session?.history).toHaveLength(1);expect(labels()).not.toContain('Your response:');
});
it('invalid evaluation never clears the answer or advances',async()=>{
 await mount();await record();(submitInterviewAnswer as jest.Mock).mockResolvedValueOnce({...response(),evaluation:{overall:NaN}});
 await act(async()=>{await next().props.onPress();});expect(labels()).toContain('Your response:');expect(labels()).toContain('evaluation is unavailable');expect(useInterviewStore.getState().session?.history).toHaveLength(0);
});
it('stale session result cannot commit or silently discard the retained transcript',async()=>{
 await mount();await record();let release:any;(submitInterviewAnswer as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));let pending:any;
 await act(async()=>{pending=next().props.onPress();});
 await act(async()=>{useInterviewStore.getState().initializeSession({userId:'synthetic-owner',interviewType:'panel',firstQuestion:'Different approved session',firstQuestionType:'introductory'});});
 await act(async()=>{release(response());await pending;});
 expect(useInterviewStore.getState().session?.history).toHaveLength(0);expect(useInterviewStore.getState().session?.currentQuestion).toBe('Different approved session');expect(labels()).toContain('Your response:');expect(labels()).toContain('interview changed');
});
it('empty answers explain the disabled control and never submit',async()=>{
 await mount();expect(next().props.disabled).toBe(true);expect(labels()).toContain('Record your answer with the microphone first.');expect(submitInterviewAnswer).not.toHaveBeenCalled();
});
it('explicit speech replay never submits or advances',async()=>{
 await mount();await act(async()=>{mic('Repeat question').props.onPress();});
 const options=(Speech.speak as jest.Mock).mock.calls[0][1];await act(async()=>{options.onDone();options.onDone();});
 expect(submitInterviewAnswer).not.toHaveBeenCalled();expect(useInterviewStore.getState().session?.history).toHaveLength(0);
 await act(async()=>{mic('Repeat question').props.onPress();});expect(Speech.speak).toHaveBeenCalledTimes(2);expect(submitInterviewAnswer).not.toHaveBeenCalled();
});
it('Q9 produces Q10 closing with no recording control and one completion navigation',async()=>{
 for(let index=1;index<=8;index++)useInterviewStore.getState().submitAnswer('Synthetic answer',{overall:73},`Approved Q${index+1}`,index===8?'candidate_questions':'behavioral','Benchmark');
 await mount();await record('What mentoring is available for a new graduate?');(submitInterviewAnswer as jest.Mock).mockResolvedValueOnce(response('Approved unscored closing','closing'));
 await act(async()=>{await next().props.onPress();});
 const options=(Speech.speak as jest.Mock).mock.calls[0][1];await act(async()=>{options.onDone();options.onDone();});
 expect(mockRouter.replace).toHaveBeenCalledTimes(1);expect(useInterviewStore.getState().status).toBe('evaluating');expect(submitInterviewAnswer).toHaveBeenCalledTimes(1);
});

it('Stop action with insufficient evidence shows modal and does not push summary or complete',async()=>{
  await mount();
  const stopButton = renderer.root.findByProps({accessibilityLabel:'Stop interview'});
  await act(async()=>{stopButton.props.onPress();});
  expect(labels()).toContain('Insufficient Interview Evidence');
  expect(labels()).toContain('of 9 evaluated questions');
  expect(mockRouter.push).not.toHaveBeenCalled();
  // Candidate chooses Exit Without Score
  const exitButton = renderer.root.findAllByType('TouchableOpacity').find((node:any)=>node.findAllByType('Text').some((t:any)=>t.props.children==='Exit Without Score'));
  await act(async()=>{exitButton.props.onPress();});
  expect(mockRouter.replace).toHaveBeenCalledWith('/(student)/(tabs)/interview');
 });

 it('Stop after nine evaluated answers does not finalize cancellation',async()=>{
  for(let i=1;i<=9;i++) useInterviewStore.getState().submitAnswer(`Answer ${i}`,{overall:75},i===9?undefined:`Q${i+1}`);
  await mount();
  const stopButton = renderer.root.findByProps({accessibilityLabel:'Stop interview'});
  await act(async()=>{stopButton.props.onPress();});
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(labels()).toContain('Stop interview?');
 });

 it('Stop during pending evaluation cancels late callback, unlocks UI on Continue Interview, and permits fresh submission',async()=>{
  await mount();
  await record('My original response before stopping');
  let releaseEvaluation: any;
  (submitInterviewAnswer as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { releaseEvaluation = resolve; }));

  // Start submitting answer
  let pendingSubmit: any;
  await act(async () => { pendingSubmit = next().props.onPress(); });
  expect(submitInterviewAnswer).toHaveBeenCalledTimes(1);

  // While submission is in-flight, student presses Stop
  const stopButton = renderer.root.findByProps({ accessibilityLabel: 'Stop interview' });
  await act(async () => { stopButton.props.onPress(); });
  expect(labels()).toContain('Insufficient Interview Evidence');

  // Student selects Continue Interview
  const continueButton = renderer.root.findAllByType('TouchableOpacity').find((node: any) =>
    node.findAllByType('Text').some((t: any) => t.props.children === 'Continue Interview')
  );
  await act(async () => { continueButton.props.onPress(); });

  // Late evaluation response resolves
  await act(async () => {
    releaseEvaluation(response('Should not advance with stale question'));
    await pendingSubmit;
  });

  // Stale callback must NOT commit to history or advance question
  expect(useInterviewStore.getState().session?.history).toHaveLength(0);
  expect(useInterviewStore.getState().session?.currentQuestion).toBe('Approved Q1');

  // Screen remains unlocked and ready for normal submission
  (submitInterviewAnswer as jest.Mock).mockResolvedValueOnce(response('Approved Q2'));
  await act(async () => { await next().props.onPress(); });
  expect(useInterviewStore.getState().session?.history).toHaveLength(1);
  expect(useInterviewStore.getState().session?.currentQuestion).toBe('Approved Q2');
 });

 it('Stop button is idempotent under rapid repeated taps',async()=>{
  await mount();
  const stopButton = renderer.root.findByProps({ accessibilityLabel: 'Stop interview' });
  await act(async () => {
    stopButton.props.onPress();
    stopButton.props.onPress();
    stopButton.props.onPress();
  });
  expect(labels()).toContain('Insufficient Interview Evidence');
  expect(mockRouter.push).not.toHaveBeenCalled();
 });

it('a server-confirmed Stop intent exits without summary or a fabricated evaluation',async()=>{
 await mount();await record('Stop interview');
 (submitInterviewAnswer as jest.Mock).mockResolvedValueOnce({cancelled:true,isComplete:true,evaluation:null});
 await act(async()=>{await next().props.onPress();});
 expect(useInterviewStore.getState().session).toBeNull();
 expect(mockRouter.push).not.toHaveBeenCalled();
});

it('Continue during the unscored closing replays closing and finalizes only its fresh completion event',async()=>{
 for(let n=1;n<=9;n++)useInterviewStore.getState().submitAnswer(`Synthetic answer ${n}`,{overall:73},n===9?'Closing statement':`Q${n+1}`,n===9?'closing':'behavioral');
 await mount();
 const oldDone=(Speech.speak as jest.Mock).mock.calls[0][1].onDone;
 await act(async()=>renderer.root.findByProps({accessibilityLabel:'Stop interview'}).props.onPress());
 const resume=renderer.root.findAllByType('TouchableOpacity').find((node:any)=>node.findAllByType('Text').some((t:any)=>t.props.children==='Continue Interview'));
 await act(async()=>resume.props.onPress());
 expect(Speech.speak).toHaveBeenCalledTimes(2);
 await act(async()=>oldDone());
 expect(mockRouter.replace).not.toHaveBeenCalled();
 const newDone=(Speech.speak as jest.Mock).mock.calls[1][1].onDone;
 await act(async()=>{newDone();newDone();});
 expect(mockRouter.replace).toHaveBeenCalledTimes(1);
 expect(useInterviewStore.getState().status).toBe('evaluating');
 expect(submitInterviewAnswer).not.toHaveBeenCalled();
});
