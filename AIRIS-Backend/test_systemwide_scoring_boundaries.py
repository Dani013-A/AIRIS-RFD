"""Independent arithmetic and evidence-boundary regressions for the scoring audit."""
import json
import math
import numpy as np
import pytest
import deterministic_scorer as scorer
import interview_engine as interview
from evidence_chunker import EvidenceChunk


def chunk(text, section='Projects'):
    return EvidenceChunk(chunkId='synthetic-1', section=section, text=text, sourceOrder=1, wordCount=len(text.split()))


def alignment(parsed=None, chunks=None, required=None, detected=None, education=None, edu_sim=0):
    return scorer.evaluate_role_alignment(audited_findings=[], evidence_chunks=chunks or [], detected_skills=detected or [], parsed_sections=parsed or {}, target_position='Synthetic role', required_competencies=required or [], recommended_competencies=[], education_benchmarks=education or [], certification_benchmarks=[], sbert_edu_sim_score=edu_sim)


def test_detected_skill_substring_is_not_another_competency():
    result = alignment(required=['Java'], detected=['JavaScript'])
    assert result['breakdown']['skillsMatch']['rawScore'] == 0


@pytest.mark.parametrize('text', ['Developed reports without SQL experience for 50 clients.', 'Developed JavaScript dashboards for 50 clients.'])
def test_experience_requires_positive_whole_competency_evidence(text):
    required = ['SQL'] if 'SQL' in text else ['Java']
    result = alignment(chunks=[chunk(text)], required=required)
    assert result['breakdown']['experienceProjects']['rawScore'] == 0


def test_degree_substring_does_not_turn_a_workshop_into_a_degree():
    result = alignment(parsed={'Education': 'Database systems workshop'}, education=['database systems'])
    assert result['breakdown']['educationRelevance']['rawScore'] == 0


def test_word_to_date_range_matches_the_equivalent_dash_range():
    def score(text):
        return scorer.evaluate_ats_machine_readability([chunk(text, 'Education')], {'Education': text})['breakdown']['dateRecognition']['rawScore']
    assert score('2020 to 2024') == score('2020-2024') == 75
    assert score('2020t2024') != 75


@pytest.mark.parametrize('provider', [lambda _: '{}', lambda _: json.dumps({'evaluation': {'overall': float('nan')}}), lambda _: (_ for _ in ()).throw(RuntimeError('synthetic outage'))])
def test_provider_failure_does_not_invent_a_75_point_evaluation(monkeypatch, provider):
    monkeypatch.setattr(interview, 'classify_answer_relevance', lambda *_: 'Relevant')
    monkeypatch.setattr(interview, 'generate_text_with_fallback', provider)
    with pytest.raises(ValueError, match='evaluation'):
        interview.evaluate_answer_and_generate_next('Accountant', 'BS Accountancy', {}, [], 'Tell me about yourself', 'I prepared reports in a coursework project and checked the results.', 'intro', 10)


def test_ats_weighted_sum_is_independently_recomputed():
    result = scorer.evaluate_ats_machine_readability([chunk('Built SQL reports for 20 users during Jan 2024', 'Projects')], {'Education': 'BS Accountancy, University, 2020-2024', 'Skills': 'SQL, Python'})
    weights = {'sectionStructure': .20, 'contactRecognition': .15, 'skillsFormatting': .20, 'experienceStructure': .20, 'educationStructure': .15, 'dateRecognition': .10}
    expected = round(sum(result['breakdown'][name]['rawScore'] * weight for name, weight in weights.items()))
    assert result['overallScore'] == expected


@pytest.mark.parametrize('values', [(0, 0, 0), (100, 100, 100), (50, 70, 80)])
def test_final_interview_formula_uses_actual_validated_metrics(monkeypatch, values):
    semantic, holistic, clarity = values
    monkeypatch.setattr(interview, 'calculate_semantic_correctness', lambda _: semantic)
    monkeypatch.setattr(interview, 'generate_text_with_fallback', lambda _: json.dumps({'metrics': {'aiHolisticEvaluation': holistic, 'communicationClarity': clarity}}))
    history = [{'answer': 'Synthetic full answer with a concrete action and result.', 'questionType': 'intro'} for _ in range(9)]
    report = interview.generate_final_report('Accountant', 'BS Accountancy', {}, history, [{'overall': 50}] * 9)
    assert report['overallPerformance'] == round(.4 * semantic + .4 * holistic + .2 * clarity)


@pytest.mark.parametrize('left,right,expected', [([1.,0.],[1.,0.],1.), ([1.,0.],[0.,1.],0.), ([1.,0.],[-1.,0.],-1.), ([0.,0.],[1.,0.],0.)])
def test_cosine_independent_vectors(left, right, expected):
    from sbert_matcher import calculate_cosine_similarity
    assert calculate_cosine_similarity(np.array(left), np.array(right)) == pytest.approx(expected)

@pytest.mark.parametrize('ats,align,expected', [(0,0,0),(100,100,100),(73,51,60),(100,0,40),(0,100,60)])
def test_manuscript_two_tier_resume_formula(monkeypatch, ats, align, expected):
    # Fixed independent tier scores isolate the aggregation; p155 gives 73/51 -> 60.
    monkeypatch.setattr(scorer, 'evaluate_ats_machine_readability', lambda **_: {'overallScore': ats, 'level': '', 'levelLabel': '', 'breakdown': {}})
    component = {'rawScore': 0, 'weight': 0, 'weightedScore': 0}
    monkeypatch.setattr(scorer, 'evaluate_role_alignment', lambda **_: {'overallScore': align, 'breakdown': {key: component for key in ['skillsMatch','experienceProjects','educationRelevance','certifications']}, 'competencies': [], 'priorityGaps': [], 'alignmentSummary': ''})
    result = scorer.calculate_canonical_resume_score([], {}, [], 'Synthetic role', [])
    assert result['resumeScore']['overallScore'] == result['overallScore'] == expected
    assert result['resumeScore']['atsContribution'] == pytest.approx(ats * .4)
    assert result['resumeScore']['alignmentContribution'] == pytest.approx(align * .6)
    assert result['scoringModelVersion'] == '3.1.0-manuscript'
    assert result['traceability']['formula'] == result['resumeScore']['formula']


def test_rejected_provider_evidence_never_logs_resume_or_provider_payload(capsys):
    from output_validator import validate_ai_response
    evidence = chunk('SYNTHETIC_PRIVATE_RESUME Python project', 'Projects')
    base = {'chunkId': evidence.chunkId, 'competency': 'Python', 'classification': 'STRONG_MATCH', 'evidenceLevel': 'DEMONSTRATED', 'acmo': dict(action=True, context=True, method=True, outcome=True), 'observedEvidence': 'SYNTHETIC_UNTRUSTED_QUOTE'}
    validate_ai_response([base, {**base, 'score': 100, 'reason': 'SYNTHETIC_SECRET_PAYLOAD'}], [evidence], ['Python'])
    logged = capsys.readouterr().out
    assert 'SYNTHETIC_PRIVATE_RESUME' not in logged
    assert 'SYNTHETIC_UNTRUSTED_QUOTE' not in logged
    assert 'SYNTHETIC_SECRET_PAYLOAD' not in logged

@pytest.mark.parametrize('section,raw,expected,status', [('Skills',.10,.35,'STRONG_MATCH'),('Projects',.10,.47,'STRONG_MATCH'),('Projects',.9,1.,'STRONG_MATCH'),('Skills',0.,.25,'PARTIAL_MATCH')])
def test_grounded_semantic_boosts_and_thresholds(monkeypatch, section, raw, expected, status):
    from types import SimpleNamespace
    import sbert_matcher as matcher
    evidence = chunk('Python', section)
    profile = SimpleNamespace(required_skills=['Python'], recommended_skills=[], education_benchmarks=[], certification_benchmarks=[], profile_id='synthetic', version='test', canonical_role='Synthetic', domain='Test', profile_source='TEST', is_degraded=False, last_updated='2026-10-25')
    monkeypatch.setattr(matcher, 'resolve_role_profile', lambda _: profile)
    monkeypatch.setattr(matcher, 'get_sbert_model', lambda: object())
    monkeypatch.setattr(matcher, '_cached_encode', lambda _: np.array([1.,0.]))
    monkeypatch.setattr(matcher, 'calculate_cosine_similarity', lambda *_: raw)
    monkeypatch.setattr(matcher, 'chunk_resume_evidence', lambda _: [evidence])
    found = matcher.evaluate_semantic_alignment({}, 'Synthetic')['evidence'][0]
    assert found['best_sim'] == expected
    assert found['status'] == status


def test_ungrounded_high_similarity_cannot_displace_grounded_chunk(monkeypatch):
    from types import SimpleNamespace
    import sbert_matcher as matcher
    profile = SimpleNamespace(required_skills=['Python'], recommended_skills=[], education_benchmarks=[], certification_benchmarks=[], profile_id='synthetic', version='test', canonical_role='Synthetic', domain='Test', profile_source='TEST', is_degraded=False, last_updated='2026-10-25')
    grounded = chunk('Python', 'Skills')
    unrelated = EvidenceChunk(chunkId='synthetic-unrelated',section='Projects',text='Unrelated document content',sourceOrder=2,wordCount=3)
    monkeypatch.setattr(matcher,'resolve_role_profile',lambda _:profile)
    monkeypatch.setattr(matcher,'get_sbert_model',lambda:object())
    monkeypatch.setattr(matcher,'_cached_encode',lambda text: np.array([.99 if text==unrelated.text else .1,0.]))
    monkeypatch.setattr(matcher,'calculate_cosine_similarity',lambda _,right:float(right[0]))
    monkeypatch.setattr(matcher,'chunk_resume_evidence',lambda _:[grounded,unrelated])
    result=matcher.evaluate_semantic_alignment({},'Synthetic')['evidence'][0]
    assert result['status']=='STRONG_MATCH'
    assert result['chunkId']==grounded.chunkId
    assert result['best_sim']==.35


def test_market_frequency_normalizes_deduplicated_jobs_and_tags():
    from market_intelligence import normalize_and_deduplicate
    jobs=[{'id':str(i),'tags':['Python','python','SQL'] if i<3 else ['Python']} for i in range(4)]
    result=normalize_and_deduplicate({'jobs':jobs+[jobs[0]]})
    assert result['metrics']['total_jobs_analyzed']==4
    assert result['skills']['python']=={'demandScore':100,'evidenceCount':4,'relevance':'high'}
    assert result['skills']['sql']=={'demandScore':75,'evidenceCount':3,'relevance':'moderate'}


@pytest.mark.parametrize('word,expected',[('PYTHON','python'),('pythn','python'),('pytxxn','python'),('pxxxxn',None),('sql',None)])
def test_exact_fuzzy_normalization_boundaries(word,expected):
    from normalizer import check_fuzzy_spelling
    assert check_fuzzy_spelling(word,['python'])==expected


def test_semantic_component_is_cosine_percentage_not_a_delivery_penalty(monkeypatch):
    monkeypatch.setattr(interview, '_cached_encode', lambda _: np.array([1.,0.]))
    monkeypatch.setattr(interview, 'calculate_cosine_similarity', lambda *_: .8)
    assert interview.calculate_semantic_correctness([{'questionId':'survey-1','answer':'Synthetic short answer','benchmarkAnswer':'Synthetic reference'}]) == 80

@pytest.mark.parametrize('similarity,expected',[(4.9,0),(5,31),(19.9,34),(20,54),(39.9,58),(40,76),(69.9,80),(70,96),(100,100)])
def test_education_piecewise_boundaries(similarity,expected):
    result=alignment(parsed={'Education':'Bachelor of Science, Synthetic University'},education=['Differentdiscipline'],edu_sim=similarity)
    assert result['breakdown']['educationRelevance']['rawScore']==expected

@pytest.mark.parametrize('count,natural,moderate,excessive',[(0,True,False,False),(3,True,False,False),(4,False,True,False),(6,False,True,False),(7,False,False,True)])
def test_filler_boundary_classification(count,natural,moderate,excessive):
    result=interview.calculate_filler_metrics('um '*count+'Synthetic answer')
    assert (result['fillerCount'],result['natural'],result['moderate'],result['excessive'])==(count,natural,moderate,excessive)

@pytest.mark.parametrize('gap,count',[(.249,0),(.25,1),(1.5,1),(1.51,1)])
def test_acoustic_pause_cutoff_ignores_leading_and_trailing_silence(gap,count):
    from transcriber import calculate_audio_pause_metrics
    result=calculate_audio_pause_metrics([{'start':10,'end':11},{'start':11+gap,'end':13}])
    assert result['pauseCount']==count
    assert result['totalPauseDuration']==(round(gap,2) if count else 0)


def test_analyze_endpoint_preserves_manuscript_score_version_and_formula(monkeypatch):
    from fastapi.testclient import TestClient
    import main
    import ai_service
    synthetic='Synthetic Candidate\nsynthetic@example.org\nEducation\nBachelor of Science in Accountancy, Synthetic University, 2024\nSkills\nSQL, Python\nProjects\nDeveloped SQL reports for 20 students and checked results.'
    monkeypatch.setattr(main, 'validate_resume_validity_with_llm', lambda *_: {'is_resume':True})
    monkeypatch.setattr(main, 'evaluate_semantic_alignment', lambda **_: {'requiredSkills':['SQL'],'recommendedSkills':[],'educationBenchmarks':['Accountancy'],'certificationBenchmarks':[],'evidence':[],'roleProfileMetadata':{}})
    monkeypatch.setattr(ai_service, 'generate_learning_snapshot', lambda **_: {})
    main.app.dependency_overrides[main.get_authenticated_user]=lambda:'synthetic-formula-api'
    try:
        with TestClient(main.app) as client:
            a=client.post('/analyze',json={'rawText':synthetic,'targetPosition':'Accountant'}).json()
            b=client.post('/analyze',json={'rawText':synthetic,'targetPosition':'Accountant'}).json()
        assert a['valid'] is True
        assert a['resumeScore']==b['resumeScore']
        assert a['scoringModelVersion']==a['analysisVersion']=='3.1.0-manuscript'
        assert a['traceability']['formula']==a['resumeScore']['formula']
        assert a['overallScore']==round(.4*a['atsScore']['overallScore']+.6*a['alignmentScore']['overallScore'])
    finally:
        main.app.dependency_overrides.pop(main.get_authenticated_user,None)
