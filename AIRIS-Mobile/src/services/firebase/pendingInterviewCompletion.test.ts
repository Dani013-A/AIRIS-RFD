const mockMemory = new Map<string,string>();
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{setItem:jest.fn(async(k:string,v:string)=>{mockMemory.set(k,v)}),getAllKeys:jest.fn(async()=>[...mockMemory.keys()]),removeItem:jest.fn(async(k:string)=>{mockMemory.delete(k)})}}));
import {rememberInterviewCompletion,pendingInterviewCompletion,forgetInterviewCompletion} from './pendingInterviewCompletion';
beforeEach(()=>mockMemory.clear());
it('persists only a canonical ID and isolates accounts across module consumers',async()=>{
 await rememberInterviewCompletion('owner','a'.repeat(32));
 expect(await pendingInterviewCompletion('owner')).toBe('a'.repeat(32));
 expect(await pendingInterviewCompletion('other')).toBeNull();
 expect([...mockMemory.values()]).toEqual(['pending']);
 expect([...mockMemory.keys()][0]).toContain('a'.repeat(32));
});
it('a stale completion cannot remove a newer recovery pointer',async()=>{
 await rememberInterviewCompletion('owner','b'.repeat(32));await forgetInterviewCompletion('owner','a'.repeat(32));
 expect(await pendingInterviewCompletion('owner')).toBe('b'.repeat(32));
 await forgetInterviewCompletion('owner','b'.repeat(32));expect(await pendingInterviewCompletion('owner')).toBeNull();
});
it('invalid or missing identities cannot create recovery data',async()=>{
 await expect(rememberInterviewCompletion('','a'.repeat(32))).rejects.toThrow();
 await expect(rememberInterviewCompletion('owner','client-created-id')).rejects.toThrow();
 expect(mockMemory.size).toBe(0);
});

it('separate pending sessions remain recoverable when another report completes',async()=>{
 await Promise.all([rememberInterviewCompletion('owner','a'.repeat(32)),rememberInterviewCompletion('owner','b'.repeat(32))]);
 await forgetInterviewCompletion('owner','a'.repeat(32));
 expect(await pendingInterviewCompletion('owner')).toBe('b'.repeat(32));
});
