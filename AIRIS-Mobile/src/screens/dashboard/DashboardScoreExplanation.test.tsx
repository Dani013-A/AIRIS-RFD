import React from 'react';
import DashboardScreen from './DashboardScreen';
const {act,create}=jest.requireActual('react-test-renderer');
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
jest.mock('expo-router',()=>({useRouter:()=>({push:jest.fn()})}));
jest.mock('react-native',()=>({ActivityIndicator:'ActivityIndicator',Alert:{alert:jest.fn()},Linking:{},Modal:'Modal',ScrollView:'ScrollView',TouchableOpacity:'TouchableOpacity',View:'View'}));
jest.mock('../../components/ui/AppText',()=>({Text:'Text'}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
jest.mock('../../components/ui',()=>({SkeletonScoreCard:'SkeletonScoreCard',SkeletonResourceCard:'SkeletonResourceCard',Tag:'Tag'}));
jest.mock('../../components/resume/CompetencyGuidanceGroup',()=>({CompetencyGuidanceGroup:'CompetencyGuidanceGroup'}));
jest.mock('../../components/ui/ProductTourOverlay',()=>({ProductTourOverlay:'ProductTourOverlay'}));
jest.mock('../../components/resume/SkillSelfAssessmentModal',()=>({__esModule:true,default:'SkillSelfAssessmentModal'}));
jest.mock('../../services/learning/learningCatalogService',()=>({getGrowthPathRecommendations:()=>({certifications:[],courses:[],practicalLearning:[]})}));
jest.mock('../../data/learningRecommendations',()=>({getAiRecommendationsForResume:()=>[]}));
jest.mock('../../services/resume/selfAssessmentService',()=>({getStoredSelfAssessments:async()=>({}),extractTargetCompetenciesForSelfAssessment:()=>[],formatCanonicalCompetencyName:(x:string)=>x,validateVerbatimEvidence:()=>true}));
jest.mock('../../store/authStore',()=>{const state={currentUser:{uid:'synthetic',hasUploadedResume:true,targetPosition:'Accountant'},loading:false};return {useAuthStore:(selector:any)=>selector(state)}});
jest.mock('../../store/resumeStore',()=>{const state={activeResume:{originalFileName:'SYNTHETIC.pdf'},activeAnalysis:{isAnalysisComplete:true,analysisVersion:'3.1.0-manuscript',atsScore:{overallScore:92,breakdown:{}},resumeScore:{overallScore:56},alignmentScore:{overallScore:32,breakdown:{},competencies:[]},suggestions:[],detectedSections:[]},processingStatus:'completed',pendingAnalysisData:null,pendingTargetSkills:[]};return {useResumeStore:(selector:any)=>selector(state)}});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it('explains the finalized manuscript two-tier score and internal role weights',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<DashboardScreen/>)});
 try {
  const text=()=>renderer.root.findAllByType('Text').map((x:any)=>x.props.children).filter((x:any)=>typeof x==='string').join('\n');
  expect(text()).toContain('Skills (40%)');
  expect(text()).toContain('ATS Readability (40%) + Role Alignment (60%)');
  const controls=renderer.root.findAllByType('TouchableOpacity');
  const info=controls.find((node:any)=>node.findAllByType('Icon').some((icon:any)=>icon.props.name==='information-circle-outline'));
  expect(info).toBeDefined();
  await act(async()=>info.props.onPress());
  expect(text()).toContain('ATS Readability × 0.40 + Role Alignment × 0.60');
  expect(text()).not.toContain('Job-fit score × 0.60');
 } finally {await act(async()=>renderer.unmount())}
});
