import React from 'react';
import LearningScreen from './LearningScreen';
const {act,create}=jest.requireActual('react-test-renderer');
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
jest.mock('expo-file-system/legacy',()=>({documentDirectory:'file://synthetic/',EncodingType:{UTF8:'utf8'},writeAsStringAsync:jest.fn()}));
jest.mock('expo-sharing',()=>({isAvailableAsync:async()=>false}));
jest.mock('expo-router',()=>({useRouter:()=>({back:jest.fn()})}));
jest.mock('react-native',()=>({ActivityIndicator:'ActivityIndicator',Alert:{alert:jest.fn()},ScrollView:'ScrollView',TouchableOpacity:'TouchableOpacity',View:'View'}));
jest.mock('../../components/ui/AppText',()=>({Text:'Text',TextInput:'TextInput'}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView'}));
jest.mock('../../components/ui',()=>({Tag:'Tag',SkeletonResourceCard:'SkeletonResourceCard'}));
jest.mock('../../components/learning/ResourceCard',()=>({ResourceCard:'ResourceCard'}));
jest.mock('../../store/authStore',()=>{const state={currentUser:{uid:'synthetic-owner',targetPosition:'Accountant',degreeProgram:'BS Accountancy'}};return {useAuthStore:(selector: any)=>selector(state)};});
jest.mock('../../store/resumeStore',()=>{const state={activeAnalysis:{learningSnapshot:{careerSummary:'An unsupported historical proficiency claim',strengths:['An inferred historical strength'],skillGaps:[{skill:'SQL'}]}},activeResume:{rawText:'Synthetic accounting student'},fetchActiveResume:jest.fn()};return {useResumeStore:(selector: any)=>selector(state)};});
jest.mock('../../services/resume/selfAssessmentService',()=>({...jest.requireActual('../../services/resume/selfAssessmentService'),getStoredSelfAssessments:async()=>({})}));
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}}));
jest.mock('firebase/firestore',()=>({collection:()=>({}),getDocs:async()=>({forEach:()=>{}})}));
jest.mock('../../config/firebase',()=>({db:{}}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;

it.each(['interviews','resume','communication'] as const)('renders at least three eligible distinct cards in %s using the actual catalog and matcher',async category=>{
 let renderer: any;
 await act(async()=>{renderer=create(<LearningScreen initialCategory={category}/>)});
 try {
  const cards=renderer.root.findAllByType('ResourceCard');
  expect(cards.length).toBeGreaterThanOrEqual(3);
  const resources=cards.map((card: any)=>card.props.resource);
  expect(new Set(resources.map((resource: any)=>resource.url)).size).toBe(resources.length);
  expect(resources.every((resource: any)=>resource.category===category&&resource.verification.contentReviewed)).toBe(true);
  expect(resources.every((resource: any)=>!resource.isPersonalizedGap)).toBe(true);
 } finally { await act(async()=>renderer.unmount()); }
});
