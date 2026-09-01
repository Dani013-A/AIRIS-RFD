import { useOnboardingStore } from '../../store/onboardingStore';

describe('Onboarding Navigation & State Reset Unit Tests', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  test('Initial onboarding state has no pre-selected values', () => {
    const state = useOnboardingStore.getState();
    expect(state.college).toBe('');
    expect(state.degreeProgram).toBe('');
    expect(state.targetPosition).toBe('');
  });

  test('Selecting a college sets college and clears dependent program and target position', () => {
    useOnboardingStore.getState().setCollege('College of Computer Studies');
    useOnboardingStore.getState().setDegreeProgram('BS Information Technology');
    useOnboardingStore.getState().setTargetPosition('Software Engineer');

    // User changes college
    useOnboardingStore.getState().setCollege('College of Engineering and Architecture');
    const state = useOnboardingStore.getState();

    expect(state.college).toBe('College of Engineering and Architecture');
    expect(state.degreeProgram).toBe('');
    expect(state.targetPosition).toBe('');
  });

  test('Selecting a degree program clears dependent target position', () => {
    useOnboardingStore.getState().setCollege('College of Computer Studies');
    useOnboardingStore.getState().setDegreeProgram('BS Computer Science');
    useOnboardingStore.getState().setTargetPosition('Data Scientist');

    // User changes degree program
    useOnboardingStore.getState().setDegreeProgram('BS Information Technology');
    const state = useOnboardingStore.getState();

    expect(state.college).toBe('College of Computer Studies');
    expect(state.degreeProgram).toBe('BS Information Technology');
    expect(state.targetPosition).toBe('');
  });

  test('Navigating back to College Selection via reset() unselects all onboarding fields', () => {
    useOnboardingStore.getState().setCollege('College of Business Education');
    useOnboardingStore.getState().setDegreeProgram('BS Accountancy');
    useOnboardingStore.getState().setTargetPosition('Auditor');

    // Back to college selection triggers reset()
    useOnboardingStore.getState().reset();
    const state = useOnboardingStore.getState();

    expect(state.college).toBe('');
    expect(state.degreeProgram).toBe('');
    expect(state.targetPosition).toBe('');
  });
});
