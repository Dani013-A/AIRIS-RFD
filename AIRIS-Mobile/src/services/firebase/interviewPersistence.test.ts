jest.mock('../../config/firebase',()=>({db:{},auth:{currentUser:{uid:'synthetic'}}}));
jest.mock('firebase/firestore',()=>({
 doc:jest.fn((...args)=>args),getDoc:jest.fn(),collection:jest.fn(()=>({})),getDocs:jest.fn(),query:jest.fn((...args)=>args),orderBy:jest.fn(()=>({})),limit:jest.fn(()=>({})),
}));
import {getDoc,doc,getDocs,orderBy} from 'firebase/firestore';
import * as interviews from './interviewService';
beforeEach(()=>jest.clearAllMocks());
it('exposes no client method for writing authoritative interview scores',()=>{
 expect((interviews as any).saveInterviewSession).toBeUndefined();
});
it('fetches legacy and backend-owned completed results through the existing history path',async()=>{
 const record={sessionId:'server-session',completedAt:456,finalReport:{overallPerformance:0},persistedBy:'backend'};
 (getDocs as jest.Mock).mockResolvedValueOnce({empty:false,docs:[{data:()=>record}]});
 expect(await interviews.fetchLatestInterviewSession('synthetic')).toEqual(record);
 expect(orderBy).toHaveBeenCalledWith('completedAt','desc');
});
it('returns empty history honestly',async()=>{
 (getDocs as jest.Mock).mockResolvedValueOnce({empty:true});
 expect(await interviews.fetchLatestInterviewSession('synthetic')).toBeNull();
});
it('surfaces unavailable history instead of fabricating a result',async()=>{
 (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Synthetic offline'));
 await expect(interviews.fetchLatestInterviewSession('synthetic')).rejects.toThrow('Synthetic offline');
});

it('reads the selected session under the authenticated owner only',async()=>{
 (getDoc as jest.Mock).mockResolvedValue({exists:()=>true,data:()=>({userId:'synthetic',finalReport:{overallPerformance:0}})});
 const record=await interviews.fetchSavedInterviewSession('synthetic','selected-old-id');
 expect(doc).toHaveBeenCalledWith({},'users','synthetic','interviews','selected-old-id');
 expect(record?.sessionId).toBe('selected-old-id');
 await expect(interviews.fetchSavedInterviewSession('other','selected-old-id')).rejects.toThrow('sign in');
 await expect(interviews.fetchSavedInterviewSession('synthetic','bad/id')).rejects.toThrow('invalid');
});
it('rejects a mismatched stored owner and returns missing data honestly',async()=>{
 (getDoc as jest.Mock).mockResolvedValueOnce({exists:()=>true,data:()=>({userId:'other'})});
 await expect(interviews.fetchSavedInterviewSession('synthetic','selected')).rejects.toThrow('unavailable');
 (getDoc as jest.Mock).mockResolvedValueOnce({exists:()=>false});
 expect(await interviews.fetchSavedInterviewSession('synthetic','missing')).toBeNull();
});
