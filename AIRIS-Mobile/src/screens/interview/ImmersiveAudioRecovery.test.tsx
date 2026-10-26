import {rememberInterviewCompletion} from '../../services/firebase/pendingInterviewCompletion';
jest.mock('../../services/firebase/pendingInterviewCompletion',()=>({rememberInterviewCompletion:jest.fn(async()=>{})}));
import React from 'react';
import ImmersiveInterviewScreen from './ImmersiveInterviewScreen';
import {checkMicrophonePermission} from '../../utils/audioPermission';
import {useInterviewStore} from '../../store/interviewStore';
import {submitInterviewAnswer,transcribeAudio,cancelInterviewSimulation} from '../../services/api/interviewApi';
const {act,create}=jest.requireActual('react-test-renderer');
const mockMessages:any[]=[];
let mockAppState:(state:string)=>void;
const mockRouter={replace:jest.fn(),push:jest.fn()};
jest.mock('react-native',()=>({View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',ActivityIndicator:'ActivityIndicator',StatusBar:'StatusBar',StyleSheet:{create:(x:any)=>x,absoluteFill:{}},BackHandler:{addEventListener:()=>({remove:jest.fn()})},AppState:{addEventListener:(_:any,fn:any)=>{mockAppState=fn;return{remove:jest.fn()}}}}));
jest.mock('@azesmway/react-native-unity',()=>{
 const React=jest.requireActual('react');return {__esModule:true,default:React.forwardRef((props:any,ref:any)=>{
  React.useImperativeHandle(ref,()=>({postMessage:(_:any,__:any,message:string)=>mockMessages.push(JSON.parse(message))}));
  return React.createElement('UnitySurface',props);
 })};
});
jest.mock('expo-router',()=>({useRouter:()=>mockRouter}));
jest.mock('../../store/authStore',()=>({useAuthStore:(selector:any)=>selector({currentUser:{uid:'synthetic-owner'}})}));
jest.mock('../../utils/AirisOrientation',()=>({__esModule:true,default:{lockPortrait:jest.fn(),lockLandscape:jest.fn()}}));
jest.mock('../../utils/audioPermission',()=>({checkMicrophonePermission:jest.fn(async()=>true),requestMicrophonePermission:async()=>({granted:true}),openMicrophoneSettings:jest.fn()}));
jest.mock('../../services/api/interviewApi',()=>({submitInterviewAnswer:jest.fn(),transcribeAudio:jest.fn(),cancelInterviewSimulation:jest.fn(async()=>{})}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let r:any,capture=0;
const messages=(type:string)=>mockMessages.filter(message=>message.type===type);
async function send(type:string,payload:any={}){
 await act(async()=>r.root.findByType('UnitySurface').props.onUnityMessage({nativeEvent:{message:JSON.stringify({type,payload:JSON.stringify(payload)})}}));
}
async function boot(mode:'panel'|'immersive-one-on-one'='panel',beforeSceneLoaded?:()=>Promise<void>){
 useInterviewStore.getState().initializeSession({sessionId:'a'.repeat(32),userId:'synthetic-owner',interviewType:mode,firstQuestion:'Approved original question',firstQuestionType:'introductory'});
 await act(async()=>{r=create(<ImmersiveInterviewScreen/>)});
 await send('UNITY_READY');if(beforeSceneLoaded)await beforeSceneLoaded();await send('SCENE_LOADED',{sceneName:mode==='panel'?'SampleScene':'OneOnOne'});
 await act(async()=>jest.advanceTimersByTime(1600));
 const last=messages('SHOW_QUESTION').at(-1);expect(last).toBeDefined();
 await send('QUESTION_SPOKEN',{utteranceId:JSON.parse(last.payload).utteranceId});
}
async function started(){capture++;await send('RECORDING_STARTED',{captureId:capture});}
beforeEach(()=>{jest.useFakeTimers();jest.clearAllMocks();(checkMicrophonePermission as jest.Mock).mockResolvedValue(true);mockMessages.length=0;capture=0;useInterviewStore.getState().clearSession();(transcribeAudio as jest.Mock).mockResolvedValue({transcription:'Synthetic substantive coursework answer'});(submitInterviewAnswer as jest.Mock).mockResolvedValue({evaluation:{overall:73},nextQuestion:{question:'Approved next question',questionType:'motivation'}});});
afterEach(async()=>{if(r)await act(async()=>r.unmount());r=null;jest.clearAllTimers();jest.useRealTimers();});
it.each(['panel','immersive-one-on-one'] as const)('%s missing capture acknowledgement stops and exposes recovery',async mode=>{
 await boot(mode);await act(async()=>jest.advanceTimersByTime(5000));
 expect(r.root.findByProps({accessibilityLabel:'Retry interview audio'})).toBeDefined();
 expect(messages('STOP_RECORDING')).toHaveLength(1);expect(submitInterviewAnswer).not.toHaveBeenCalled();
});
it('a lost native completion has a bounded stop/handoff timeout and no fabricated answer',async()=>{
 await boot();await started();await act(async()=>jest.advanceTimersByTime(65000));
 expect(messages('STOP_RECORDING')).toHaveLength(1);
 await act(async()=>jest.advanceTimersByTime(20000));
 expect(r.root.findByProps({accessibilityLabel:'Retry interview audio'})).toBeDefined();expect(submitInterviewAnswer).not.toHaveBeenCalled();
});
it('processing retry resends exactly the retained answer without another microphone or transcription',async()=>{
 await boot();await started();(submitInterviewAnswer as jest.Mock).mockRejectedValueOnce(new Error('Synthetic network error'));
 await send('TRANSCRIPT_READY',{captureId:capture,transcript:'/synthetic.wav'});
 const payload=(submitInterviewAnswer as jest.Mock).mock.calls[0][0];
 await act(async()=>r.root.findByProps({accessibilityLabel:'Retry interview audio'}).props.onPress());
 expect(transcribeAudio).toHaveBeenCalledTimes(1);expect(submitInterviewAnswer).toHaveBeenCalledTimes(2);
 expect((submitInterviewAnswer as jest.Mock).mock.calls[1][0]).toEqual(payload);
 expect(useInterviewStore.getState().session?.evaluations).toHaveLength(1);
});
it('duplicate callbacks cannot submit twice and voice Stop works while Listening',async()=>{
 await boot();await started();await send('TRANSCRIPT_READY',{captureId:capture,transcript:'stop interview'});
 expect(cancelInterviewSimulation).toHaveBeenCalled();expect(submitInterviewAnswer).not.toHaveBeenCalled();expect(useInterviewStore.getState().session).toBeNull();
});
it('background pause releases resources, ignores late work, and can resume the retained answer',async()=>{
 await boot();await started();let finish:any;(transcribeAudio as jest.Mock).mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));
 let pending:any;await act(async()=>{pending=r.root.findByType('UnitySurface').props.onUnityMessage({nativeEvent:{message:JSON.stringify({type:'TRANSCRIPT_READY',payload:JSON.stringify({captureId:capture,transcript:'/pending.wav'})})}})});
 await act(async()=>mockAppState('background'));expect(messages('STOP_RECORDING').length).toBeGreaterThan(0);
 await act(async()=>{finish({transcription:'Synthetic retained answer'});await pending});expect(submitInterviewAnswer).not.toHaveBeenCalled();
 await act(async()=>mockAppState('active'));await act(async()=>r.root.findByProps({accessibilityLabel:'Retry interview audio'}).props.onPress());
 expect(submitInterviewAnswer).toHaveBeenCalledTimes(1);expect(transcribeAudio).toHaveBeenCalledTimes(1);
});
it('unmount releases the retained Unity microphone and speech before dropping its view',async()=>{
 await boot();await started();await act(async()=>r.unmount());r=null;
 expect(messages('STOP_RECORDING').length).toBeGreaterThan(0);expect(messages('SESSION_EXIT').length).toBeGreaterThan(0);
});

it('empty transcription unlocks the microphone retry instead of retaining a processing lock',async()=>{
 await boot();await started();(transcribeAudio as jest.Mock).mockResolvedValueOnce({transcription:''});
 await send('TRANSCRIPT_READY',{captureId:capture,transcript:'/empty.wav'});
 expect(submitInterviewAnswer).not.toHaveBeenCalled();
 await act(async()=>r.root.findByProps({accessibilityLabel:'Retry interview audio'}).props.onPress());
 expect(messages('START_RECORDING')).toHaveLength(2);
});
it('permission denial on recovery does not start an overlapping microphone',async()=>{
 await boot();await act(async()=>jest.advanceTimersByTime(5000));
 (checkMicrophonePermission as jest.Mock).mockResolvedValueOnce(false);
 await act(async()=>r.root.findByProps({accessibilityLabel:'Retry interview audio'}).props.onPress());
 expect(messages('START_RECORDING')).toHaveLength(1);expect(submitInterviewAnswer).not.toHaveBeenCalled();
});
it('repeat is dispatched while listening without a scored answer or stale retry job',async()=>{
 await boot();await started();await send('TRANSCRIPT_READY',{captureId:capture,transcript:'repeat question'});
 expect(messages('SHOW_QUESTION')).toHaveLength(2);expect(submitInterviewAnswer).not.toHaveBeenCalled();
 expect(useInterviewStore.getState().session?.history).toHaveLength(0);
});
it('duplicate handoffs and old capture errors cannot alter a newer turn',async()=>{
 await boot();await started();await send('TRANSCRIPT_READY',{captureId:capture,transcript:'/once.wav'});
 await send('TRANSCRIPT_READY',{captureId:capture,transcript:'/once.wav'});
 expect(submitInterviewAnswer).toHaveBeenCalledTimes(1);
 await act(async()=>jest.advanceTimersByTime(350));
 const next=messages('SHOW_QUESTION').at(-1);await send('QUESTION_SPOKEN',{utteranceId:JSON.parse(next.payload).utteranceId});
 await started();await send('RECORDING_ERROR',{captureId:capture-1});
 expect(r.root.findAllByProps({accessibilityLabel:'Retry interview audio'})).toHaveLength(0);
 expect(useInterviewStore.getState().session?.evaluations).toHaveLength(1);
});

it('permission-dialog or startup inactivity cannot pause a microphone that has not started',async()=>{
 await boot('panel',async()=>{await act(async()=>mockAppState('inactive'))});
 expect(messages('START_RECORDING')).toHaveLength(1);
 expect(r.root.findAllByProps({accessibilityLabel:'Retry interview audio'})).toHaveLength(0);
});

it.each(['panel','immersive-one-on-one'] as const)('%s closing preserves the completed evidence against late native exit',async mode=>{
 useInterviewStore.getState().initializeSession({sessionId:'a'.repeat(32),userId:'synthetic-owner',interviewType:mode,firstQuestion:'Approved Q1',firstQuestionType:'introductory'});
 for(let n=1;n<=9;n++)useInterviewStore.getState().submitAnswer('Synthetic answer',{overall:73},n===9?'Approved closing':`Approved Q${n+1}`,n===9?'closing':'behavioral');
 await act(async()=>{r=create(<ImmersiveInterviewScreen/>)});
 await send('UNITY_READY');await send('SCENE_LOADED',{sceneName:mode==='panel'?'SampleScene':'OneOnOne'});
 await act(async()=>jest.advanceTimersByTime(1600));
 const speech=JSON.parse(messages('SHOW_QUESTION').at(-1).payload);
 await send('QUESTION_SPOKEN',{utteranceId:speech.utteranceId});await send('SESSION_EXIT');
 expect(useInterviewStore.getState().session?.evaluations).toHaveLength(9);
 expect(useInterviewStore.getState().status).toBe('evaluating');
 expect(cancelInterviewSimulation).not.toHaveBeenCalled();expect(submitInterviewAnswer).not.toHaveBeenCalled();
 expect(messages('START_RECORDING')).toHaveLength(0);
 expect(rememberInterviewCompletion).toHaveBeenCalledWith('synthetic-owner','a'.repeat(32));
 expect(mockRouter.replace).toHaveBeenCalledTimes(1);expect(mockRouter.replace).toHaveBeenCalledWith('/(student)/interview-session/summary');
});

it.each(['panel','immersive-one-on-one'] as const)('%s a recovery-marker failure retains closing evidence and can retry without recording',async mode=>{
 useInterviewStore.getState().initializeSession({sessionId:'a'.repeat(32),userId:'synthetic-owner',interviewType:mode,firstQuestion:'Approved Q1',firstQuestionType:'introductory'});
 for(let n=1;n<=9;n++)useInterviewStore.getState().submitAnswer('Synthetic answer',{overall:73},n===9?'Approved closing':`Approved Q${n+1}`,n===9?'closing':'behavioral');
 await act(async()=>{r=create(<ImmersiveInterviewScreen/>)});await send('UNITY_READY');await send('SCENE_LOADED',{sceneName:mode==='panel'?'SampleScene':'OneOnOne'});
 await act(async()=>jest.advanceTimersByTime(1600));
 (rememberInterviewCompletion as jest.Mock).mockRejectedValueOnce(new Error('Synthetic local storage failure'));
 await send('QUESTION_SPOKEN',{utteranceId:JSON.parse(messages('SHOW_QUESTION').at(-1).payload).utteranceId});
 expect(mockRouter.replace).not.toHaveBeenCalled();expect(useInterviewStore.getState().session?.evaluations).toHaveLength(9);
 await act(async()=>r.root.findByProps({accessibilityLabel:'Retry interview audio'}).props.onPress());
 await send('QUESTION_SPOKEN',{utteranceId:JSON.parse(messages('SHOW_QUESTION').at(-1).payload).utteranceId});
 expect(mockRouter.replace).toHaveBeenCalledTimes(1);expect(messages('START_RECORDING')).toHaveLength(0);
 expect(submitInterviewAnswer).not.toHaveBeenCalled();expect(cancelInterviewSimulation).not.toHaveBeenCalled();
});
