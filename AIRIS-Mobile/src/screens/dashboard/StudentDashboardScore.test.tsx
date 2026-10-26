let mockFocused=true;
let mockUid='synthetic';
import React from 'react';
import {Alert} from 'react-native';
import StudentDashboardScreen from './StudentDashboardScreen';
import {pendingInterviewCompletion} from '../../services/firebase/pendingInterviewCompletion';
import {fetchUserActivities} from '../../services/firebase/activityService';
const {act,create}=jest.requireActual('react-test-renderer');
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
const mockPush=jest.fn();
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush}),useFocusEffect:(effect:any)=>jest.requireActual('react').useEffect(()=>mockFocused?effect():undefined,[effect,mockFocused])}));
jest.mock('react-native',()=>({Alert:{alert:jest.fn()},ActivityIndicator:'ActivityIndicator',ScrollView:'ScrollView',TouchableOpacity:'TouchableOpacity',View:'View',RefreshControl:'RefreshControl'}));
jest.mock('../../components/ui/AppText',()=>({Text:'Text'}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView'}));
jest.mock('../../components/ui',()=>({PrimaryButton:'PrimaryButton',UserAvatar:'UserAvatar'}));
jest.mock('../../store/authStore',()=>{return {useAuthStore:(selector:any)=>selector({currentUser:{uid:mockUid,fullName:'Synthetic Candidate'}})}});
jest.mock('../../store/resumeStore',()=>({useResumeStore:(selector:any)=>selector({activeResume:null,activeAnalysis:null})}));
jest.mock('../../services/firebase/activityService',()=>({fetchUserActivities:jest.fn()}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it.each([
 {resume:undefined,interview:80,expected:undefined},
 {resume:0,interview:0,expected:0},
 {resume:90,interview:80,expected:84},
 {resume:NaN,interview:80,expected:undefined},
 {resume:100,interview:101,expected:undefined},
])('only displays a composite for two valid score records: $resume / $interview',async fixture=>{
 const rows=[...(fixture.resume===undefined?[]:[{id:'resume',type:'Resume Analysis',score:fixture.resume,completedAt:'2026-10-25'}]),{id:'interview',type:'Mock Interview',score:fixture.interview,completedAt:'2026-10-25'}];
 jest.mocked(fetchUserActivities).mockResolvedValue(rows as any);
 let renderer:any;await act(async()=>{renderer=create(<StudentDashboardScreen/>)});
 try {
  const labels=renderer.root.findAllByType('Text').flatMap((node:any)=>[node.props.children].flat()).join('');
  if(fixture.expected===undefined)expect(labels).toContain('No score yet');
  else {expect(labels).toContain(`${fixture.expected}%`);expect(labels).not.toContain('No score yet')}
 } finally {await act(async()=>renderer.unmount())}
});

it('View opens the selected saved interview rather than a new interview',async()=>{
 mockPush.mockClear();
 jest.mocked(fetchUserActivities).mockResolvedValue([{id:'selected-session',type:'Mock Interview',title:'Saved interview',score:70,completedAt:'2026-10-25'}] as any);
 let renderer:any;await act(async()=>{renderer=create(<StudentDashboardScreen/>)});
 try {
  const view=renderer.root.findAllByType('TouchableOpacity').find((node:any)=>node.findAllByType('Text').some((text:any)=>text.props.children==='View'));
  expect(view).toBeDefined();await act(async()=>view.props.onPress());
  expect(mockPush).toHaveBeenCalledWith({pathname:'/(student)/interview-session/saved',params:{sessionId:'selected-session'}});
 } finally {await act(async()=>renderer.unmount())}
});

it('a navigation failure is explained instead of starting another interview',async()=>{
 mockPush.mockImplementationOnce(()=>{throw new Error('Synthetic unavailable route')});
 jest.mocked(fetchUserActivities).mockResolvedValue([{id:'selected-session',type:'Mock Interview',title:'Saved interview',score:70}] as any);
 let r:any;await act(async()=>{r=create(<StudentDashboardScreen/>)});
 const view=r.root.findAllByType('TouchableOpacity').find((node:any)=>node.findAllByType('Text').some((text:any)=>text.props.children==='View'));
 await act(async()=>view.props.onPress());expect(Alert.alert).toHaveBeenCalledWith('Interview unavailable',expect.any(String));
 await act(async()=>r.unmount());
});

jest.mock('../../services/firebase/pendingInterviewCompletion',()=>({pendingInterviewCompletion:jest.fn(async()=>null)}));

beforeEach(()=>{mockFocused=true;mockUid='synthetic';jest.mocked(pendingInterviewCompletion).mockResolvedValue(null)});
it('returning to dashboard refreshes the durable result and unchanged EPS after completion',async()=>{
 jest.mocked(fetchUserActivities).mockResolvedValue([]);
 let r:any;await act(async()=>{r=create(<StudentDashboardScreen/>)});
 expect(r.root.findAllByType('Text').map((n:any)=>[n.props.children].flat().join('')).join('')).toContain('No score yet');
 jest.mocked(fetchUserActivities).mockResolvedValue([{id:'resume',type:'Resume Analysis',score:55},{id:'a'.repeat(32),type:'Mock Interview',score:68}] as any);
 await act(async()=>{mockFocused=false;r.update(<StudentDashboardScreen/>)});
 await act(async()=>{mockFocused=true;r.update(<StudentDashboardScreen/>)});
 expect(r.root.findAllByType('Text').map((n:any)=>[n.props.children].flat().join('')).join('')).toContain('63%');
 expect(r.root.findAllByType('TouchableOpacity').filter((n:any)=>n.findAllByType('Text').some((t:any)=>t.props.children==='View'))).toHaveLength(2);
 await act(async()=>r.unmount());
});
it('owner recovery after restart uses the canonical ID without starting a new interview',async()=>{
 jest.mocked(fetchUserActivities).mockResolvedValue([]);jest.mocked(pendingInterviewCompletion).mockResolvedValue('a'.repeat(32));mockPush.mockClear();
 let r:any;await act(async()=>{r=create(<StudentDashboardScreen/>)});
 await act(async()=>r.root.findByProps({title:'Resume saving interview'}).props.onPress());
 expect(mockPush).toHaveBeenCalledWith({pathname:'/(student)/interview-session/summary',params:{sessionId:'a'.repeat(32)}});
 await act(async()=>r.unmount());
});
it('changing accounts hides prior scores and pending recovery while the new read is pending',async()=>{
 jest.mocked(fetchUserActivities).mockResolvedValue([{id:'old',type:'Mock Interview',score:91}] as any);jest.mocked(pendingInterviewCompletion).mockResolvedValue('a'.repeat(32));
 let r:any;await act(async()=>{r=create(<StudentDashboardScreen/>)});
 let finish:any;jest.mocked(fetchUserActivities).mockReturnValue(new Promise(resolve=>{finish=resolve}));jest.mocked(pendingInterviewCompletion).mockResolvedValue(null);
 await act(async()=>{mockUid='different';r.update(<StudentDashboardScreen/>)});
 expect(r.root.findAllByProps({title:'Resume saving interview'})).toHaveLength(0);
 expect(r.root.findAllByType('Text').some((n:any)=>n.props.children===91)).toBe(false);
 await act(async()=>finish([]));await act(async()=>r.unmount());
});
