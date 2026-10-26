jest.mock('../api/apiClient', () => ({ getApiBaseUrl: () => 'https://api.example.org', getAuthenticatedIdToken: async () => 'synthetic-token', getAuthInstance: () => ({currentUser:{uid:'synthetic-owner'}}) }));
jest.mock('./resumeAnalysisEngine', () => ({parseResumeSections: () => [{name:'Skills',content:'SQL'}], detectResumeSections: () => []}));
jest.mock('./resumeNormalizer', () => ({isResumeValidDocument: () => true}));
import { calculateAtsCompatibility } from './resumeAnalysisService';

describe('analysis failure contract (synthetic network fixtures)', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['network', 'http', 'malformed', 'out-of-range'])('%s failure rejects instead of returning a fabricated zero', async kind => {
    globalThis.fetch = jest.fn(async () => {
      if (kind === 'network') throw new Error('offline');
      return {ok:kind!=='http',json:async()=>kind==='out-of-range'?{valid:true,atsScore:{overallScore:101},resumeScore:{overallScore:50}}:{valid:true}} as Response;
    });
    await expect(calculateAtsCompatibility('Synthetic resume with SQL','Accountant')).rejects.toThrow('No score was generated');
  });
  it('preserves an authoritative genuine zero without substituting a local score', async () => {
    globalThis.fetch = jest.fn(async () => ({ok:true,json:async()=>({valid:true,atsScore:{overallScore:0},resumeScore:{overallScore:0}})} as Response));
    const result=await calculateAtsCompatibility('Synthetic resume with SQL','Accountant');
    expect(result.resumeScore?.overallScore).toBe(0);
  });
});
