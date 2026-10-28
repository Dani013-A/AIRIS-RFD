import { loadPersonalizedResources } from './personalizedResourceClient';
import { emptyPlacements, fallbackPlacements, reconcileResources } from './personalizedResources';
import AsyncStorage from '@react-native-async-storage/async-storage';
jest.mock('../api/apiClient',()=>({getApiBaseUrl:()=> 'https://18-143-33-249.sslip.io',getAuthenticatedIdToken:async()=> 'synthetic-token'}));
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:jest.fn(async()=>null),setItem:jest.fn(async()=>{})}));
const fetchMock=jest.fn();
beforeEach(()=>{globalThis.fetch=fetchMock;fetchMock.mockReset();jest.clearAllMocks();});
test('an HTTP 200 with empty arrays cannot replace the valid baseline with empty tabs',async()=>{
 fetchMock.mockResolvedValue({ok:true,json:async()=>({placements:emptyPlacements(),generatedAt:Date.now()/1000,expiresAt:Date.now()/1000+600})});
 const result=await loadPersonalizedResources('sparse-response',{});
 expect(Object.values(result.placements).flat()).toHaveLength(11);
 expect(result.repairedBaseline).toBe(true);expect(result.complete).toBe(false);
});
test('matching requests coalesce, screen revisits reuse the cache, and a new analysis refreshes',async()=>{
 fetchMock.mockResolvedValue({ok:true,json:async()=>({placements:emptyPlacements(),generatedAt:Date.now()/1000,expiresAt:Date.now()/1000+600})});
 await Promise.all([loadPersonalizedResources('same-analysis',{}),loadPersonalizedResources('same-analysis',{})]);
 await loadPersonalizedResources('same-analysis',{});expect(fetchMock).toHaveBeenCalledTimes(1);
 await loadPersonalizedResources('new-analysis',{});expect(fetchMock).toHaveBeenCalledTimes(2);
 expect(AsyncStorage.setItem).toHaveBeenCalled();
});
test('malformed payload is rejected so the hook keeps its offline baseline',async()=>{
 fetchMock.mockResolvedValue({ok:true,json:async()=>({placements:{courses:null}})});
 await expect(loadPersonalizedResources('malformed',{})).rejects.toThrow();
 expect(Object.values(fallbackPlacements([])).flat()).toHaveLength(11);
});
test('an HTTP provider error is not reported as a successful empty result',async()=>{
 fetchMock.mockResolvedValue({ok:false,status:503});
 await expect(loadPersonalizedResources('offline',{})).rejects.toThrow('unavailable');
});
test('reconciliation never repeats the baseline as discovered or duplicates equivalent URLs',()=>{
 const baseline=fallbackPlacements([]);const first=baseline.certifications[0];
 const raw=emptyPlacements();raw.certifications=[{...first,id:'different-id',title:'Different label for the same destination',source:'ai_discovered',origin:'ai_discovered',url:first.url+'/?utm_source=alias'}];
 const result=reconcileResources({placements:raw},baseline);
 expect(Object.values(result.placements).flat()).toHaveLength(11);
 expect(result.counts.certifications.ai_discovered).toBe(0);
});
test('the full backend split renders 22 globally unique placements with accurate origins',()=>{
 const baseline=fallbackPlacements([]);const raw=emptyPlacements();
 for(const [tab,rows] of Object.entries(baseline)){
  const key=tab as keyof typeof raw;raw[key]=[...rows,...rows.map((row,index)=>({...row,id:`remote-${tab}-${index}`,title:`Remote source topic ${tab} ${index}`,provider:'Synthetic University',url:`https://www.open.edu/discovered/${tab}/${index}`,source:'ai_discovered',origin:'ai_discovered' as const}))];
 }
 const result=reconcileResources({placements:raw},baseline);
 expect(result.complete).toBe(true);
 expect(Object.values(result.placements).flat()).toHaveLength(22);
 expect(new Set(Object.values(result.placements).flat().map(row=>row.url)).size).toBe(22);
 expect(result.counts).toEqual({certifications:{hardcoded:2,ai_discovered:2},courses:{hardcoded:2,ai_discovered:2},practice:{hardcoded:2,ai_discovered:2},for_you:{hardcoded:5,ai_discovered:5}});
});

test('program, role and resume/interview labels isolate caches while identical contexts reuse them',async()=>{
 fetchMock.mockResolvedValue({ok:true,json:async()=>({placements:emptyPlacements(),generatedAt:Date.now()/1000,expiresAt:Date.now()/1000+600})});
 const original={analysisId:'profile-transition',targetPosition:'IT Specialist',program:'BS Information Technology',gaps:['network security']};
 const contexts=[original,{...original,program:'BS Civil Engineering'},{...original,targetPosition:'Civil Engineer'},{...original,gaps:['structural analysis']},{...original,gaps:[...original.gaps,'communication']}];
 for(const context of contexts){
  const key=JSON.stringify(['synthetic-program-test',context]);
  await loadPersonalizedResources(key,context);
  await loadPersonalizedResources(key,context);
 }
 expect(fetchMock).toHaveBeenCalledTimes(contexts.length);
 expect(fetchMock.mock.calls.map(call=>JSON.parse(call[1].body))).toEqual(contexts);
 expect(fetchMock.mock.calls.every(call=>call[1].headers.Authorization==='Bearer synthetic-token')).toBe(true);
});
