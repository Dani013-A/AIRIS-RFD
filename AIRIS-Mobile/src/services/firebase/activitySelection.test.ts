jest.mock('../../config/firebase',()=>({db:{}}));
jest.mock('firebase/firestore',()=>({collection:jest.fn(),doc:jest.fn(),getDocs:jest.fn(),setDoc:jest.fn(),query:jest.fn(),orderBy:jest.fn(),serverTimestamp:jest.fn()}));
import {getDocs} from 'firebase/firestore';
import {fetchUserActivities} from './activityService';
it('uses the actual activity document ID for selection, including records without a stored id',async()=>{
 (getDocs as jest.Mock).mockResolvedValue({docs:[{id:'selected-session',data:()=>({id:'stale-wrong-id',type:'Mock Interview'})},{id:'legacy-session',data:()=>({type:'Mock Interview'})}]});
 const activities=await fetchUserActivities('synthetic-owner');
 expect(activities.map(activity=>activity.id)).toEqual(['selected-session','legacy-session']);
});
