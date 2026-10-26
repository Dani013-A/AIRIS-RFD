from resume_parser import parse_resume
from resume_findings import structural_findings
from deterministic_scorer import evaluate_role_alignment
from evidence_chunker import chunk_resume_evidence
from credential_evidence import listed_credentials
import pytest

@pytest.mark.parametrize('heading', ['OJT', 'Internship Experience', 'Practicum'])
def test_internship_and_short_skill_sections_are_not_missing_employment(heading):
    raw=f'Synthetic Candidate\nqa@example.org\nEducation\nBS Accountancy\nSkills\nSQL\n{heading}\nAssisted reconciliation in a student internship\nProjects\nAcademic spreadsheet exercise\nPublications\nStudent research paper'
    parsed=parse_resume(raw)
    detected,missing,tips=structural_findings(parsed,raw)
    assert next(x for x in detected if x['name']=='Skills')['isPresent']
    assert parsed['Skills'] == 'SQL'
    assert 'Internships' in parsed and 'WorkExperience' not in parsed
    assert not any(x['name'] in ['WorkExperience','Skills'] for x in missing)
    assert any(x['name']=='Publications' and x['isPresent'] for x in detected)
    for tip in tips:
        if tip['evidenceQuote']:assert tip['evidenceQuote'] in parsed[tip['sourceSection']]

@pytest.mark.parametrize('text',['AWS Certified Cloud Practitioner — in progress','Preparing for AWS Certified Cloud Practitioner','AWS Certified Cloud Practitioner — expired','Not yet certified AWS Cloud Practitioner'])
def test_unearned_or_expired_credentials_do_not_count(text):
    assert listed_credentials(text)==''
    parsed={'Certifications':text}
    score=evaluate_role_alignment([],chunk_resume_evidence(parsed),[],parsed,'Cloud Engineer',[],[],[],['AWS Cloud Practitioner'])
    assert score['breakdown']['certifications']['rawScore']==0

def test_training_does_not_become_an_earned_credential():
    parsed={'Trainings':'AWS Cloud Practitioner exam preparation course'}
    score=evaluate_role_alignment([],chunk_resume_evidence(parsed),[],parsed,'Cloud Engineer',[],[],[],['AWS Cloud Practitioner'])
    assert score['breakdown']['certifications']['rawScore']==0

def test_earned_entry_preserved_next_to_planned_credential():
    assert listed_credentials('Earned SQL certificate\nPlanned AWS certificate')=='Earned SQL certificate'

def test_duplicate_lines_are_not_duplicate_evidence():
    parsed=parse_resume('Skills\nSQL\nSQL\nProjects\nAcademic work\nSkills\nSQL')
    assert parsed['Skills']=='SQL'

def test_distinct_cloud_credentials_are_not_equated_by_one_shared_word():
    parsed={'Certifications':'Microsoft Azure Fundamentals — earned 2025'}
    result=evaluate_role_alignment([],chunk_resume_evidence(parsed),[],parsed,'Cloud Engineer',[],[],[],['AWS Certified Cloud Practitioner'])
    assert result['breakdown']['certifications']['rawScore']==65

def test_raw_document_is_grounding_metadata_not_duplicate_scoring_evidence():
    parsed=parse_resume('Skills\nSQL\nProjects\n- Queried a synthetic student database\n- Queried a synthetic student database')
    chunks=chunk_resume_evidence(parsed)
    assert not any(chunk.section=='raw_text' for chunk in chunks)
    assert sum(chunk.text=='Queried a synthetic student database' for chunk in chunks)==1

def test_ai_invented_resources_and_strengths_are_rejected():
    from ai_service import sanitize_and_validate_learning_snapshot
    from learning_catalog import reviewed_resources
    actual=reviewed_resources()[0]
    value=sanitize_and_validate_learning_snapshot({'strengths':['Led a successful million dollar engineering team'], 'recommendedCourses':[{'title':'Invented Guaranteed Employment Certificate','url':actual['url']},{'title':'Fake','url':'https://example.com/invented'}]},'Accountant',raw_text='Synthetic accounting student with spreadsheet coursework')
    assert value['strengths']==[]
    assert len(value['recommendedCourses'])==1
    assert value['recommendedCourses'][0]['title']==actual['title']
    assert 'Guaranteed' not in str(value)

def test_analysis_plan_uses_existing_evidence_without_model_invented_gaps(monkeypatch):
    import ai_service
    monkeypatch.setattr(ai_service,'generate_text_with_fallback',lambda *_: (_ for _ in ()).throw(AssertionError('Unnecessary model call')))
    monkeypatch.setattr(ai_service,'extract_authoritative_resume_skills',lambda **_:['SQL'])
    value=ai_service.generate_learning_snapshot('Accountant',{'Skills':'SQL'}, {'evidence':[]}, raw_text='Skills: SQL')
    assert value['skillGaps']==[] and value['improvementAreas']==[]
    assert value['strengths']==['SQL']

def test_reachability_checks_use_domain_boundaries(monkeypatch):
    import ai_recommendation_verifier as verifier
    monkeypatch.setattr(verifier,'resolve_and_validate_hostname',lambda *_:(False,'test stops before network'))
    assert verifier.verify_external_resource_url('https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/')['status']=='ssrf_blocked'
    assert verifier.verify_external_resource_url('https://academy.hubspot.com/courses/inbound-marketing')['status']=='ssrf_blocked'
    assert verifier.verify_external_resource_url('https://t.co/synthetic')['status']=='disallowed_domain'
    assert verifier.verify_external_resource_url('https://google.com/search?q=synthetic')['status']=='disallowed_domain'

def test_analyze_uses_raw_evidence_and_ignores_spoofed_client_sections(monkeypatch):
    import main
    from fastapi.testclient import TestClient
    captured={}
    monkeypatch.setattr(main,'check_rate_limit',lambda *_:None)
    monkeypatch.setattr(main,'validate_resume_validity_with_llm',lambda *_:{'is_resume':True})
    def semantic(**kwargs):
        captured.update(kwargs)
        return {}
    monkeypatch.setattr(main,'evaluate_semantic_alignment',semantic)
    monkeypatch.setattr(main,'validate_and_enhance_analysis',lambda **_: {'resumeScore':{'overallScore':0},'atsScore':{'overallScore':0},'alignmentScore':{'overallScore':0},'overallScore':0,'suggestions':[]})
    main.app.dependency_overrides[main.get_authenticated_user]=lambda:'synthetic-test-owner'
    try:
        result=TestClient(main.app).post('/analyze',json={'userId':'synthetic-test-owner','rawText':'Synthetic student\nEducation\nBS Accountancy\nSkills\nSQL','parsedSections':{'Certifications':'Invented earned CPA','WorkExperience':'Invented employer'},'targetPosition':'Accountant'})
        assert result.status_code==200
        assert result.json()['valid'] is True and result.json()['overallScore']==0
        assert 'Certifications' not in captured['parsed_sections']
        assert 'WorkExperience' not in captured['parsed_sections']
        assert captured['parsed_sections']['Skills']=='SQL'
    finally:main.app.dependency_overrides.clear()


def test_analyze_missing_extraction_and_provider_failure_are_not_success(monkeypatch):
    import main
    from fastapi.testclient import TestClient
    monkeypatch.setattr(main,'check_rate_limit',lambda *_:None)
    main.app.dependency_overrides[main.get_authenticated_user]=lambda:'synthetic-test-owner'
    try:
        client=TestClient(main.app)
        assert client.post('/analyze',json={'rawText':'','parsedSections':{'Skills':'SQL'},'targetPosition':'Accountant'}).status_code==400
        monkeypatch.setattr(main,'validate_resume_validity_with_llm',lambda *_:{'is_resume':True})
        def unavailable(**_):raise RuntimeError('synthetic private diagnostic')
        monkeypatch.setattr(main,'evaluate_semantic_alignment',unavailable)
        result=client.post('/analyze',json={'rawText':'Education\nBS Accountancy\nSkills\nSQL','targetPosition':'Accountant'})
        assert result.status_code==500
        assert 'synthetic private diagnostic' not in result.text
        assert 'overallScore' not in result.json() and 'valid' not in result.json()
    finally:main.app.dependency_overrides.clear()


def test_market_snapshot_counts_unique_listings_and_unique_tags_only():
    from market_intelligence import normalize_and_deduplicate
    snapshot=normalize_and_deduplicate({'jobs':[{'id':1,'tags':['SQL',' sql ','Accounting']},{'id':1,'tags':['SQL']},{'id':2,'tags':['Accounting',None]}]})
    assert snapshot['metrics']['total_jobs_analyzed']==2
    assert snapshot['skills']['sql']['evidenceCount']==1
    assert snapshot['skills']['accounting']['evidenceCount']==2
    assert snapshot['skills']['sql']['demandScore']==50

def test_academic_mapping_does_not_invent_candidate_skills_or_employer_prerequisites():
    from ai_service import evaluate_career_compatibility
    value=evaluate_career_compatibility('BA Psychology','Software Engineer',[])
    assert value['relevantCompetencies']==[] and value['missingPrerequisites']==[]
    assert 'requires substantial' not in value['reason']

@pytest.mark.parametrize('payload',[[],['invented'],{'rawText':{'Skills':'SQL'},'targetPosition':'Accountant'},{'rawText':['SQL'],'targetPosition':'Accountant'}])
def test_analyze_rejects_malformed_evidence_before_provider_calls(monkeypatch,payload):
    import main
    from fastapi.testclient import TestClient
    monkeypatch.setattr(main,'check_rate_limit',lambda *_:None)
    main.app.dependency_overrides[main.get_authenticated_user]=lambda:'synthetic-test-owner'
    try:
        assert TestClient(main.app).post('/analyze',json=payload).status_code==400
    finally:main.app.dependency_overrides.clear()

@pytest.mark.parametrize('text',['No experience with Python','I have not used Python in projects','Unfamiliar with Python'])
def test_negated_skill_mentions_are_not_positive_evidence(text):
    from ai_service import is_skill_grounded_in_text
    assert is_skill_grounded_in_text('Python',text) is False
    parsed={'Projects':text}
    result=evaluate_role_alignment([],chunk_resume_evidence(parsed),[],parsed,'Developer',['Python'],[],[],[])
    assert result['breakdown']['skillsMatch']['rawScore']==0


def test_negation_does_not_erase_a_later_affirmative_skill_statement():
    from ai_service import is_skill_grounded_in_text
    assert is_skill_grounded_in_text('Python','No experience with Java. Built a Python student project.')
    assert is_skill_grounded_in_text('Python','Not only Python but also SQL')

def test_recommendation_cache_is_bound_to_resume_and_degree_context():
    from ai_recommendation_verifier import _get_cache_key
    first=_get_cache_key('Analyst',['SQL'],'BS Accountancy','Synthetic resume A',[])
    assert first!=_get_cache_key('Analyst',['SQL'],'BS Accountancy','Synthetic resume B',[])
    assert first!=_get_cache_key('Analyst',['SQL'],'BA Psychology','Synthetic resume A',[])
    assert 'Synthetic' not in first and len(first)==64


def test_disabled_network_verification_cannot_reuse_a_successful_cache(monkeypatch):
    import ai_recommendation_verifier as verifier
    key=verifier._get_cache_key('Analyst',['SQL'],'','',None)
    monkeypatch.setitem(verifier._BOUNDED_RECOMMENDATION_CACHE,key,[{'id':'synthetic-cached'}])
    assert verifier.generate_and_verify_ai_recommendations('Analyst',['SQL'],verify_live_network=False)==[]


def test_unknown_headings_and_volunteering_are_preserved_without_invented_employment():
    raw='Synthetic Candidate\nEducation\nBS Accountancy\nVolunteer Experience\nOrganized a student event\nUnfamiliar Portfolio Notes\nA synthetic independent activity'
    parsed=parse_resume(raw)
    assert parsed['raw_text']==raw
    assert 'WorkExperience' not in parsed
    assert any('Organized a student event' in value for key,value in parsed.items() if key!='raw_text')
    assert any('A synthetic independent activity' in value for key,value in parsed.items() if key!='raw_text')
