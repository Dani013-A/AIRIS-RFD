import React from 'react';
import SavedInterviewSummaryScreen from './SavedInterviewSummaryScreen';
import {fetchSavedInterviewSession} from '../../services/firebase/interviewService';
const {act,create}=jest.requireActual('react-test-renderer');
let mockUid:string|undefined='synthetic';let mockSessionId:any='selected';
jest.mock('react-native',()=>({ActivityIndicator:'ActivityIndicator',ScrollView:'ScrollView',View:'View'}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView'}));
jest.mock('../../components/ui/AppText',()=>({Text:'Text'}));
jest.mock('../../components/ui',()=>({PrimaryButton:'PrimaryButton',SecondaryButton:'SecondaryButton'}));
jest.mock('expo-router',()=>({useLocalSearchParams:()=>({sessionId:mockSessionId}),useRouter:()=>({replace:jest.fn()})}));
jest.mock('../../store/authStore',()=>({useAuthStore:(selector:any)=>selector({currentUser:mockUid?{uid:mockUid}:null})}));
jest.mock('../../services/firebase/interviewService',()=>({fetchSavedInterviewSession:jest.fn()}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const labels=(r:any)=>r.root.findAllByType('Text').flatMap((node:any)=>[node.props.children].flat()).join(' ');
beforeEach(()=>{jest.clearAllMocks();mockUid='synthetic';mockSessionId='selected';});
it('loads exactly the selected owned record and displays saved scores and feedback',async()=>{
 (fetchSavedInterviewSession as jest.Mock).mockResolvedValue({completedAt:123,interviewType:'panel',finalReport:{overallPerformance:0,categoryBreakdown:{SemanticCorrectness:10,AIHolisticEvaluation:20,CommunicationClarity:30},strengths:['Recorded strength'],weaknesses:['Recorded gap'],areasToImprove:['Recorded improvement'],recommendedPractice:['Recorded recommendation']}});
 let r:any;await act(async()=>{r=create(<SavedInterviewSummaryScreen/>)});
 expect(fetchSavedInterviewSession).toHaveBeenCalledWith('synthetic','selected');
 for(const text of ['0/100','10/100','20/100','30/100','panel','Recorded strength','Recorded gap','Recorded improvement','Recorded recommendation'])expect(labels(r)).toContain(text);
 await act(async()=>r.unmount());
});
it('legacy records display saved score without inventing missing metrics or feedback',async()=>{
 (fetchSavedInterviewSession as jest.Mock).mockResolvedValue({overallScore:88,weakestAnswer:{howToImprove:'Stored legacy advice'}});
 let r:any;await act(async()=>{r=create(<SavedInterviewSummaryScreen/>)});
 expect(labels(r)).toContain('88/100');expect(labels(r)).toContain('Stored legacy advice');expect(labels(r)).toContain('Unavailable');expect(labels(r)).toContain('Not available in this saved interview.');
 await act(async()=>r.unmount());
});
it('missing record is unavailable and a read failure can be retried without generating a report',async()=>{
 (fetchSavedInterviewSession as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null);
 let r:any;await act(async()=>{r=create(<SavedInterviewSummaryScreen/>)});
 expect(labels(r)).toContain('Unable to load this interview');
 await act(async()=>r.root.findByProps({title:'Try again'}).props.onPress());
 expect(labels(r)).toContain('This saved interview is unavailable');expect(fetchSavedInterviewSession).toHaveBeenCalledTimes(2);
 await act(async()=>r.unmount());
});
it('an account change discards an old in-flight read',async()=>{
 let finish:any;(fetchSavedInterviewSession as jest.Mock).mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));
 let r:any;await act(async()=>{r=create(<SavedInterviewSummaryScreen/>)});
 mockUid=undefined;await act(async()=>r.update(<SavedInterviewSummaryScreen/>));
 await act(async()=>finish({finalReport:{overallPerformance:99,strengths:['Private stale result']}}));
 expect(labels(r)).not.toContain('99/100');expect(labels(r)).not.toContain('Private stale result');expect(labels(r)).toContain('Please sign in');
 await act(async()=>r.unmount());
});
it('invalid or missing route IDs do not query an arbitrary latest interview',async()=>{
 mockSessionId=['one','two'];let r:any;await act(async()=>{r=create(<SavedInterviewSummaryScreen/>)});
 expect(fetchSavedInterviewSession).not.toHaveBeenCalled();expect(labels(r)).toContain('reference is missing');
 await act(async()=>r.unmount());
});
