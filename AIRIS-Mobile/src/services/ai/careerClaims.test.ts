import { evaluateCareerTargetCompatibility } from './careerCompatibilityGuardrail';
it('program-domain mapping does not invent candidate skills or missing qualifications',()=>{
 const result=evaluateCareerTargetCompatibility('BA Psychology','Software Engineer',[],'');
 expect(result.relevantCompetencies).toEqual([]);
 expect(result.transferableSkills).toEqual([]);
 expect(result.missingPrerequisites).toEqual([]);
 expect(result.reason).not.toContain('requires substantial');
});
it('negative mentions and substrings do not invent cross-domain competency evidence',()=>{
 const result=evaluateCareerTargetCompatibility('BS Accountancy','Software Engineer',[],'No programming or algorithms experience. Digital artwork only.');
 expect(result.relevantCompetencies).toEqual([]);
 expect(result.classification).toBe(evaluateCareerTargetCompatibility('BS Accountancy','Software Engineer',[],'').classification);
});
