let mockActiveSession:any=null;
jest.mock('../../store/interviewStore',()=>({useInterviewStore:{getState:()=>({session:mockActiveSession})}}));
jest.mock('./apiClient',()=>({getApiBaseUrl:()=> 'https://18-143-33-249.sslip.io',getAuthenticatedIdToken:async()=> 'test-mock-firebase-token'}));
jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { MULTIPART: 1 },
}), { virtual: true });

import { startInterviewSimulation, submitInterviewAnswer, generateInterviewReport, transcribeAudio } from "./interviewApi";
import * as FileSystem from 'expo-file-system/legacy';

describe("Interview API Client (interviewApi)", () => {
  const originalFetch = (globalThis as any).fetch;

  beforeEach(() => {
    (globalThis as any).fetch = jest.fn();
    jest.clearAllMocks(); mockActiveSession=null;
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    jest.clearAllMocks(); mockActiveSession=null;
  });

  test("startInterviewSimulation includes Authorization Bearer token", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: "a".repeat(32), turn: 0, question: "Tell me about yourself", questionType: "introductory" }),
    });

    const result = await startInterviewSimulation({
      targetRole: "Software Engineer",
      program: "BS Computer Science",
      parsedResume: { name: "Test Candidate" },
    });

    expect(result.question).toBe("Tell me about yourself");
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/start$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-mock-firebase-token",
        }),
      })
    );
  });

  test("submitInterviewAnswer includes Authorization Bearer token", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: "a".repeat(32), turn: 1, score: 85, feedback: "Good answer" }),
    });

    const result = await submitInterviewAnswer({
      sessionId: "a".repeat(32), questionId: "survey-1", turn: 0,
      currentAnswer: "I am a software engineer.",
    });

    expect(result.score).toBe(85);
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/answer$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-mock-firebase-token",
        }),
      })
    );
  });

  test("generateInterviewReport includes Authorization Bearer token", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ overallPerformance: 88, persisted:true, status:"completed", sessionId:"a".repeat(32), reportId:"a".repeat(32), completedAt:123 }),
    });

    const result = await generateInterviewReport({
      sessionId: "a".repeat(32),
    });

    expect(result.overallPerformance).toBe(88);
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/report$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-mock-firebase-token",
        }),
      })
    );
  });

  test("transcribeAudio includes Authorization Bearer token", async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ transcription: "My audio response", pauseMetrics: { totalPauseDuration: 2.5 } }),
    });

    const result = await transcribeAudio("file:///mock/audio.m4a", "audio/mp4", {sessionId:"a".repeat(32),turn:0});
    expect(result.transcription).toBe("My audio response");
    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/transcribe$/),
      "file:///mock/audio.m4a",
      expect.objectContaining({
        parameters: {sessionId:"a".repeat(32),turn:"0"},
        headers: {
          Authorization: "Bearer test-mock-firebase-token",
        },
      })
    );
  });
});

describe('server-owned interview contracts',()=>{
 const priorFetch=globalThis.fetch;
 beforeEach(()=>{globalThis.fetch=jest.fn();});
 afterEach(()=>{globalThis.fetch=priorFetch;});
 test('answer transmits only identity, revision and answer, never local scores or history',async()=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({sessionId:'a'.repeat(32),turn:1})});
  await submitInterviewAnswer({sessionId:'a'.repeat(32),questionId:'survey-1',turn:0,currentAnswer:'Synthetic answer'});
  expect(JSON.parse((globalThis.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({sessionId:'a'.repeat(32),questionId:'survey-1',turn:0,currentAnswer:'Synthetic answer'});
 });
 test.each([{sessionId:'b'.repeat(32),turn:1},{sessionId:'a'.repeat(32),turn:2}])('rejects a response bound to a different session or revision',async response=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>response});
  await expect(submitInterviewAnswer({sessionId:'a'.repeat(32),questionId:'survey-1',turn:0,currentAnswer:'Synthetic answer'})).rejects.toThrow('different interview turn');
 });
 test('old stateless start response fails explicitly',async()=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({question:'Legacy question'})});
  await expect(startInterviewSimulation({targetRole:'Synthetic',program:'Synthetic',parsedResume:{}})).rejects.toThrow('updated server session');
 });
});

describe('active-session completion boundary',()=>{
 const originalFetch=globalThis.fetch;
 beforeEach(()=>{mockActiveSession={sessionId:'a'.repeat(32),history:[{answer:'Synthetic answer'}],evaluations:[{overall:99}],currentBenchmarkAnswer:'Client benchmark'};globalThis.fetch=jest.fn();});
 afterEach(()=>{globalThis.fetch=originalFetch;mockActiveSession=null;});
 test('active store cannot inject benchmarks, history or evaluations',async()=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({sessionId:'a'.repeat(32),turn:1})});
  await submitInterviewAnswer({sessionId:'a'.repeat(32),questionId:'survey-1',turn:0,currentAnswer:'Synthetic answer'});
  expect(JSON.parse((globalThis.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({sessionId:'a'.repeat(32),questionId:'survey-1',turn:0,currentAnswer:'Synthetic answer'});
 });
 test.each([{}, {persisted:false}, {persisted:true,status:'finalizing'}, {persisted:true,status:'completed',sessionId:'b'.repeat(32)}, {persisted:true,status:'completed',sessionId:'a'.repeat(32),reportId:'a'.repeat(32),completedAt:NaN}])('rejects unconfirmed or contradictory report %p',async partial=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({overallPerformance:68,...partial})});
  await expect(generateInterviewReport({sessionId:'a'.repeat(32)})).rejects.toThrow();
 });
 test('missing answer binding is not manufactured from client state',async()=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({evaluation:{overall:80}})});
  await expect(submitInterviewAnswer({sessionId:'a'.repeat(32),questionId:'survey-1',turn:0,currentAnswer:'Synthetic answer'})).rejects.toThrow();
 });
 test('speech decision identifier is not a substitute for a server session',async()=>{
  (globalThis.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({speechDecisionId:'a'.repeat(32),question:'Synthetic question'})});
  await expect(startInterviewSimulation({targetRole:'Synthetic',program:'Synthetic',parsedResume:{}})).rejects.toThrow();
 });
});

describe('lost completion response reconciliation',()=>{
 const originalFetch=globalThis.fetch;
 afterEach(()=>{globalThis.fetch=originalFetch});
 test('reads the committed same-ID report after a lost POST response without another POST',async()=>{
  const sessionId='a'.repeat(32);const report={overallPerformance:68,persisted:true,status:'completed',reportId:sessionId,sessionId,completedAt:123};
  globalThis.fetch=jest.fn().mockRejectedValueOnce(new TypeError('Synthetic connection lost')).mockResolvedValueOnce({ok:true,json:async()=>({sessionId,status:'completed',report})});
  await expect(generateInterviewReport({sessionId})).resolves.toEqual(report);
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  expect((globalThis.fetch as jest.Mock).mock.calls[1][0]).toContain('/interview/status/'+sessionId);
  expect((globalThis.fetch as jest.Mock).mock.calls[1][1].method).toBeUndefined();
 });
 test('a finalizing status remains unconfirmed and is never converted into a score receipt',async()=>{
  const sessionId='a'.repeat(32);
  globalThis.fetch=jest.fn().mockRejectedValueOnce(new TypeError('Synthetic connection lost')).mockResolvedValueOnce({ok:true,json:async()=>({sessionId,status:'finalizing'})});
  await expect(generateInterviewReport({sessionId})).rejects.toThrow('connection lost');
 });
});

test('a rejected finalization is not blindly retried or reconciled as a successful write',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=jest.fn().mockResolvedValue({ok:false,status:410});
  await expect(generateInterviewReport({sessionId:'a'.repeat(32)})).rejects.toThrow('expired');
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
 } finally {globalThis.fetch=original}
});
