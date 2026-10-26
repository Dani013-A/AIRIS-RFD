import {InterviewCompletionError} from '../../services/api/interviewCompletion';
let mockParams:any={};
import React from 'react';
import InterviewSummaryScreen from './InterviewSummaryScreen';
import {useInterviewStore} from '../../store/interviewStore';
import {cancelInterviewSimulation,generateInterviewReport} from '../../services/api/interviewApi';
import {saveUserActivity} from '../../services/firebase/activityService';
const {act,create}=jest.requireActual('react-test-renderer');
jest.mock('react-native',()=>({View:'View',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',TouchableOpacity:'TouchableOpacity'}));
jest.mock('../../components/ui/AppText',()=>({Text:'Text'}));
jest.mock('../../components/ui',()=>({PrimaryButton:'PrimaryButton',SecondaryButton:'SecondaryButton'}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({bottom:0})}));
jest.mock('expo-router',()=>({useRouter:()=>({replace:jest.fn()}),useLocalSearchParams:()=>mockParams}));
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
jest.mock('../../utils/AirisOrientation',()=>({__esModule:true,default:{lockPortrait:jest.fn()}}));
jest.mock('../../services/api/interviewApi',()=>({cancelInterviewSimulation:jest.fn(async()=>{}),generateInterviewReport:jest.fn()}));

jest.mock('../../services/firebase/activityService',()=>({saveUserActivity:jest.fn(async()=>{})}));
jest.mock('../../store/authStore',()=>({useAuthStore:Object.assign((selector:any)=>selector({currentUser:{uid:'synthetic'}}),{getState:()=>({currentUser:{uid:'synthetic'}})})}));
jest.mock('../../services/firebase/pendingInterviewCompletion',()=>({rememberInterviewCompletion:jest.fn(async()=>{}),forgetInterviewCompletion:jest.fn(async()=>{})}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>{
 mockParams={};jest.clearAllMocks();useInterviewStore.getState().clearSession();
 useInterviewStore.getState().initializeSession({sessionId:'a'.repeat(32),userId:'synthetic',firstQuestion:'Synthetic Q1',firstQuestionType:'intro'});
 for(let n=1;n<=9;n++)useInterviewStore.getState().submitAnswer(`Synthetic answer ${n}`,{overall:50},n===9?'Closing':`Synthetic Q${n+1}`,n===9?'closing':'behavioral','Synthetic reference');
 useInterviewStore.getState().completeClosing();
 (generateInterviewReport as jest.Mock).mockImplementation(async()=>({overallPerformance:64,persisted:true,status:'completed',reportId:'a'.repeat(32),sessionId:useInterviewStore.getState().session?.sessionId,completedAt:123}));
});
it('does not mark completion on server persistence failure and safely retries the session ID',async()=>{
 (generateInterviewReport as jest.Mock).mockRejectedValueOnce(new Error('Synthetic storage failure'));
 let renderer:any;await act(async()=>{renderer=create(<InterviewSummaryScreen/>)});
 try {
  expect(useInterviewStore.getState().session?.finalReport).toBeUndefined();
  expect(useInterviewStore.getState().status).toBe('evaluating');
  await act(async()=>renderer.root.findByProps({title:'Try again'}).props.onPress());
  expect(generateInterviewReport).toHaveBeenCalledTimes(2);
  expect((generateInterviewReport as jest.Mock).mock.calls[0][0]).toEqual({sessionId:useInterviewStore.getState().session?.sessionId});
  expect(useInterviewStore.getState().status).toBe('completed');
  expect(saveUserActivity).not.toHaveBeenCalled();
 } finally {await act(async()=>renderer.unmount())}
});
it.each(['unpersisted','wrong-session','missing-time'])('does not display success for %s response',async reason=>{
 const report:any={overallPerformance:64,persisted:true,status:'completed',reportId:'a'.repeat(32),sessionId:useInterviewStore.getState().session?.sessionId,completedAt:123};
 if(reason==='unpersisted')report.persisted=false;
 if(reason==='wrong-session')report.sessionId='different';
 if(reason==='missing-time')delete report.completedAt;
 (generateInterviewReport as jest.Mock).mockResolvedValueOnce(report);
 let renderer:any;await act(async()=>{renderer=create(<InterviewSummaryScreen/>)});
 expect(useInterviewStore.getState().status).toBe('evaluating');
 expect(useInterviewStore.getState().session?.finalReport).toBeUndefined();
 await act(async()=>renderer.unmount());
});
it('clearing the local session during a pending report prevents stale UI completion',async()=>{
 let finish:any;(generateInterviewReport as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve}));
 let renderer:any;await act(async()=>{renderer=create(<InterviewSummaryScreen/>)});
 await act(async()=>{useInterviewStore.getState().clearSession();finish({overallPerformance:64})});
 expect(saveUserActivity).not.toHaveBeenCalled();
 expect(useInterviewStore.getState().session).toBeNull();await act(async()=>renderer.unmount());
});

it('unmounting during finalization preserves recovery and discards the late UI response',async()=>{
 const sessionId=useInterviewStore.getState().session!.sessionId;
 let finish:any;(generateInterviewReport as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve}));
 let renderer:any;await act(async()=>{renderer=create(<InterviewSummaryScreen/>)});
 await act(async()=>renderer.unmount());
 expect(cancelInterviewSimulation).not.toHaveBeenCalled();
 await act(async()=>finish({overallPerformance:64,persisted:true,status:'completed',reportId:sessionId,sessionId,completedAt:123}));
 expect(useInterviewStore.getState().status).toBe('evaluating');
});

it('React StrictMode effect replay does not cancel the live server session',async()=>{
 let finish:any;(generateInterviewReport as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve}));
 let renderer:any;await act(async()=>{renderer=create(<React.StrictMode><InterviewSummaryScreen/></React.StrictMode>)});
 try {
  expect(cancelInterviewSimulation).not.toHaveBeenCalled();
  const sessionId=useInterviewStore.getState().session!.sessionId;
  await act(async()=>finish({overallPerformance:64,persisted:true,status:'completed',reportId:sessionId,sessionId,completedAt:123}));
  expect(useInterviewStore.getState().status).toBe('completed');
 } finally {await act(async()=>renderer.unmount())}
});

it('can resume the same server session after the local store is cleared',async()=>{
 useInterviewStore.getState().clearSession();mockParams={sessionId:'a'.repeat(32)};
 (generateInterviewReport as jest.Mock).mockResolvedValue({overallPerformance:64,persisted:true,status:'completed',reportId:'a'.repeat(32),sessionId:'a'.repeat(32),completedAt:123});
 let r:any;await act(async()=>{r=create(<InterviewSummaryScreen/>)});
 expect(generateInterviewReport).toHaveBeenCalledWith({sessionId:'a'.repeat(32)});
 expect(r.root.findAllByType('Text').some((node:any)=>String(node.props.children).toLowerCase()==='your interview score')).toBe(true);
 expect(useInterviewStore.getState().session).toBeNull();await act(async()=>r.unmount());
});

it('optional missing or malformed feedback cannot invent data or crash a confirmed result',async()=>{
 (generateInterviewReport as jest.Mock).mockResolvedValue({overallPerformance:64,persisted:true,status:'completed',reportId:'a'.repeat(32),sessionId:'a'.repeat(32),completedAt:123,strengths:'Invalid optional field',areasToImprove:{invalid:true},weakestAnswer:{question:'Synthetic question',whyItWasWeak:{invalid:true}}});
 let r:any;await act(async()=>{r=create(<InterviewSummaryScreen/>)});
 expect(useInterviewStore.getState().status).toBe('completed');
 expect(r.root.findAllByType('Text').some((n:any)=>n.props.children==='Not available in this report.')).toBe(true);
 await act(async()=>r.unmount());
});

it.each([400,401,403,404,409,410,422])('HTTP %s is a clear stop state rather than an endless retry suggestion',async status=>{
 (generateInterviewReport as jest.Mock).mockRejectedValueOnce(new InterviewCompletionError(status));
 let r:any;await act(async()=>{r=create(<InterviewSummaryScreen/>)});
 expect(useInterviewStore.getState().status).toBe('evaluating');
 expect(r.root.findAllByProps({title:'Try again'})).toHaveLength(0);
 expect(r.root.findAllByProps({title:'Dismiss recovery notice'})).toHaveLength(1);
 expect(cancelInterviewSimulation).not.toHaveBeenCalled();await act(async()=>r.unmount());
});
