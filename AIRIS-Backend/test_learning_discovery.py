import copy
import json
import pytest
import learning_discovery as learning
from institutional_email import is_manila_student_email

@pytest.fixture(autouse=True)
def mock_destination_transport(monkeypatch):
    learning._source_failures.clear()
    monkeypatch.setattr(learning, 'verify_external_resource_url', lambda url, **_: {'verified':True,'finalUrl':url})

@pytest.mark.parametrize('email', ['m@tip.edu.ph','mdaespela@tip.edu.ph',' M.Student+alias@TIP.EDU.PH '])
def test_manila_accepts(email):
    assert is_manila_student_email(email)

@pytest.mark.parametrize('email', ['qstudent@tip.edu.ph','student@tip.edu.ph','m..a@tip.edu.ph','m.@tip.edu.ph','m@tip.edu.ph.evil','m a@tip.edu.ph','m@other.edu',None,''])
def test_manila_rejects(email):
    assert not is_manila_student_email(email)


def records(origin):
    return [dict(id=f'{origin}-{kind}-{n}',title=f'Accounting {origin} {kind} {n}',provider='University',
                 url=f'https://www.open.edu/{origin}/{kind}/{n}',type=kind,skills=['accounting'],origin='ai_discovered' if origin=='dynamic' else 'hardcoded',validationMethod='official_catalog',sourceUrl='https://www.open.edu/openlearn/free-courses/full-catalogue',validatedAt=int(learning.time.time()))
            for kind in ['certification','course','module'] for n in range(12)]

CONTEXT = dict(analysisId='one',targetPosition='Accountant',program='Accountancy',gaps=['accounting'])


def test_exact_split_global_uniqueness_and_provenance():
    result=learning.select(CONTEXT,records('hard'),records('dynamic'))
    assert result['complete']
    assert result['counts']=={tab:dict(hardcoded=count,ai_discovered=count) for tab,count in learning.SPLIT.items()}
    resources=[r for rows in result['placements'].values() for r in rows]
    assert len(resources)==22
    assert len({r['url'] for r in resources})==22
    for tab,rows in result['placements'].items():
        assert all(r['destination']==tab for r in rows)
        if tab=='certifications':assert all(r['type']=='certification' for r in rows)
        if tab=='courses':assert all(r['type']=='course' for r in rows)


def test_hardcoded_reserved_before_equivalent_dynamic():
    hard=records('hard'); reserved=learning.select(CONTEXT,hard,[])['placements']; dynamic=copy.deepcopy([r for rows in reserved.values() for r in rows])
    for r in dynamic:r['url']+='/?utm_source=test';r['id']='alias-'+r['id']
    result=learning.select(CONTEXT,hard,dynamic)
    assert sum(c['ai_discovered'] for c in result['counts'].values())==0
    assert sum(c['hardcoded'] for c in result['counts'].values())==11


def test_identity_normalizes_provider_title_and_locale():
    base=dict(title='Accounting Basics',provider='University',url='https://www.open.edu/en-us/path/')
    equivalent=dict(base,url='https://open.edu/path?utm_campaign=test',title='Accounting: Basics')
    assert learning.identities(base)&learning.identities(equivalent)


def test_failures_and_no_relevant_candidates_honest():
    result=learning.select(CONTEXT,records('hard'),[dict(id='bad',title='Gardening',provider='X',url='https://x.org/a',type='course')])
    assert not result['complete']
    assert all(c['ai_discovered']==0 for c in result['counts'].values())
    assert all(c['ai_discovered']==learning.SPLIT[t] for t,c in result['shortfall'].items())


def test_cache_and_new_analysis_refresh():
    learning._cache.clear();calls=[]
    def discover():calls.append(1);return dict(resources=records('dynamic'),unavailableSources=[])
    first=learning.recommendations(CONTEXT,'student',discover,lambda:records('hard'),lambda *_:{})
    second=learning.recommendations(CONTEXT,'student',discover,lambda:[],lambda *_:{})
    assert first['placements']==second['placements'] and second['cached']
    learning.recommendations(dict(CONTEXT,analysisId='two'),'student',discover,lambda:[],lambda *_:{})
    learning.recommendations(CONTEXT,'other-user',discover,lambda:[],lambda *_:{})
    assert len(calls)==3

@pytest.mark.parametrize('role,gap', [('Mechanical Engineer','mechanics'),('Accountant','accounting'),('Communications Officer','communication'),('Developer','programming'),('Business Analyst','business')])
def test_different_disciplines(role,gap):
    candidates=[dict(id=g,title=g,provider='U',url=f'https://www.open.edu/{g}',type='course') for g in ['mechanics','accounting','communication','programming','business']]
    result=learning.select(dict(targetPosition=role,program='',gaps=[gap]),candidates,[])
    selected=result['placements']['courses']
    assert selected and selected[0]['title']==gap
    assert all(r['title']==gap for r in selected)


def test_source_metadata_is_owned_by_official_catalog():
    body='{"modules":[{"uid":"u","title":"Accounting practice","url":"https://learn.microsoft.com/training/modules/accounting/","summary":"Practice accounting"},{"title":"Injected","url":"https://evil.org/a"}]}'
    records=learning.source_records('Microsoft Learn',learning.SOURCES[-1][1],'json',body)
    assert len(records)==1 and records[0]['providerId']=='u'
    assert records[0]['type']=='module' and records[0]['origin']=='ai_discovered'
    assert records[0]['access']=='Cost/access not verified'


def test_source_fetch_rejects_private_dns(monkeypatch):
    monkeypatch.setattr(learning,'resolve_and_validate_hostname',lambda _: (False,'private'))
    with pytest.raises(ValueError):learning.safe_get(learning.SOURCES[0][1])
    with pytest.raises(ValueError):learning.safe_get('http://www.open.edu/path')


def test_source_parser_mit_courses_and_duplicate_anchors():
    body='<a href="/courses/1-accounting/">Accounting basics</a><a href="https://evil.org/courses/2/">Accounting trap</a>'
    records=learning.source_records('MIT OpenCourseWare','https://ocw.mit.edu/','course',body)
    assert len(records)==1 and records[0]['url']=='https://ocw.mit.edu/courses/1-accounting'
    asq=learning.source_records('ASQ','https://www.asq.org/cert','certification','<a href="/cert/six-sigma-yellow-belt">Six Sigma Yellow Belt (CSSYB)</a><a href="/cert/faq">FAQs</a>')
    assert len(asq)==1 and asq[0]['type']=='certification'


def test_same_context_concurrent_requests_share_discovery():
    import concurrent.futures
    import time
    learning._cache.clear(); calls=[]
    def discover():
        calls.append(1);time.sleep(.05)
        return dict(resources=records('dynamic'),unavailableSources=[])
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _: learning.recommendations(CONTEXT,'concurrent',discover,lambda:records('hard'),lambda *_:{}), range(2)))
    assert len(calls)==1 and results[0]['placements']==results[1]['placements']


def test_partial_generic_gap_words_do_not_establish_relevance():
    resource=dict(title='Azure identity management',description='Manage access',skills=[])
    assert learning.relevance(resource,dict(targetPosition='Business Manager',program='',gaps=['project management']))[0]==0


def test_ai_cannot_invent_candidate_ids_or_urls(monkeypatch):
    import ai_service
    monkeypatch.setattr(ai_service,'generate_text_with_fallback',lambda _: '{"ids":["invented-url","real"]}')
    candidate=dict(id='real',title='Accounting',description='Accounting',type='course')
    assert learning.ai_order([candidate],CONTEXT)=={'real':1}


def test_added_cross_discipline_fallbacks_have_current_source_evidence():
    ids={resource['id'] for resource in learning.reviewed_resources()}
    assert {'cert_pmi_capm','cert_asq_cssyb','course_mit_financial_managerial','course_mit_financial_accounting','course_mit_management_communication'} <= ids


def test_ai_outage_withholds_ambiguous_discovery_and_retries_after_short_expiry(monkeypatch):
    learning._cache.clear(); calls=[]; clock=[1000]
    monkeypatch.setattr(learning.time,'time',lambda:clock[0])
    def discover():
        calls.append(1);return dict(resources=[dict(id='ambiguous',title='Microsoft Dynamics 365',provider='Microsoft',type='course',url='https://learn.microsoft.com/training/dynamics',skills=[])],unavailableSources=[])
    result=learning.recommendations(dict(CONTEXT,gaps=['dynamics'],targetPosition='Mechanical Engineer'),'outage',discover,lambda:records('hard'),lambda *_:None)
    assert all(c['ai_discovered']==0 for c in result['counts'].values())
    assert result['expiresAt']==1600 and not result['complete']
    assert learning.recommendations(dict(CONTEXT,gaps=['dynamics'],targetPosition='Mechanical Engineer'),'outage',discover,lambda:[],lambda *_:None)['cached']
    clock[0]=1601
    learning.recommendations(dict(CONTEXT,gaps=['dynamics'],targetPosition='Mechanical Engineer'),'outage',discover,lambda:[],lambda *_:None)
    assert len(calls)==2


def test_retired_credentials_are_not_recommended():
    body='{"certifications":[{"uid":"old","title":"Dynamics Marketing (Legacy)","url":"https://learn.microsoft.com/credentials/certifications/old"}]}'
    assert learning.source_records('Microsoft Learn',learning.SOURCES[-1][1],'json',body)==[]

@pytest.mark.parametrize('body', ['{"modules":null}', '{"modules":[null,42,{"title":{},"url":"https://learn.microsoft.com/training/modules/x"}]}', '{"modules":"invalid"}'])
def test_malformed_source_metadata_cannot_create_resources(body):
    assert learning.source_records('Microsoft Learn',learning.SOURCES[-1][1],'json',body)==[]


def test_real_catalog_preserves_eleven_baseline_items_when_exact_gap_words_are_missing():
    context=dict(analysisId='new',targetPosition='Quality Assurance Analyst',program='Information Technology',gaps=['Test Case Development','Manual Testing','Bug Tracking and Reporting','Regression Testing','Automated Testing','API Testing'])
    result=learning.select(context,learning.reviewed_resources(),[])
    assert result['counts']=={tab:{'hardcoded':count,'ai_discovered':0} for tab,count in learning.SPLIT.items()}
    assert len({r['url'] for rows in result['placements'].values() for r in rows})==11


def test_ai_timeout_does_not_delete_source_validated_relevant_candidates():
    learning._cache.clear()
    result=learning.recommendations(CONTEXT,'resilience',lambda:dict(resources=records('dynamic'),unavailableSources=[]),lambda:records('hard'),lambda *_:None)
    assert result['complete']
    assert sum(c['ai_discovered'] for c in result['counts'].values())==11

@pytest.mark.parametrize('failure', [TimeoutError('provider timeout'), ValueError('malformed response')])
def test_discovery_exception_still_returns_real_eleven_baseline(failure):
    learning._cache.clear()
    def failed():raise failure
    result=learning.recommendations(dict(CONTEXT,analysisId=str(failure)),'baseline',failed,learning.reviewed_resources,lambda *_:None)
    assert sum(c['hardcoded'] for c in result['counts'].values())==11
    assert all(c['ai_discovered']==0 for c in result['counts'].values())
    assert result['status']=='partial' and result['unavailableSources']==['discovery_unavailable']


def test_static_catalog_fallback_is_not_remote_discovery():
    learning._cache.clear()
    rows=records('dynamic')
    for row in rows:row.update(origin='hardcoded',source='curated')
    result=learning.recommendations(CONTEXT,'origin',lambda:dict(resources=rows,unavailableSources=[]),lambda:records('hard'),lambda *_:None)
    assert all(c['ai_discovered']==0 for c in result['counts'].values())


def test_dead_destinations_are_replaced_with_valid_unique_candidates(monkeypatch):
    learning._cache.clear()
    monkeypatch.setattr(learning,'verify_external_resource_url',lambda url,**_:dict(verified=not url.endswith('/0'),finalUrl=url))
    result=learning.recommendations(CONTEXT,'dead',lambda:dict(resources=records('dynamic'),unavailableSources=[]),lambda:records('hard'),lambda *_:None)
    assert result['complete']
    assert all(not row['url'].endswith('/0') for rows in result['placements'].values() for row in rows if row['origin']=='ai_discovered')
    assert result['selectionDiagnostics']['unusableDestinations']>0


def test_valid_http_alone_does_not_approve_unrelated_resource():
    resource=records('dynamic')[0];resource.update(title='Gardening',description='Garden maintenance',skills=['gardening'])
    assert learning.relevance(resource,CONTEXT)[0]==0


def test_partial_source_failure_keeps_other_sources_last_good(monkeypatch):
    learning._source_cache=None;learning._source_entries.clear();clock=[10000]
    monkeypatch.setattr(learning.time,'time',lambda:clock[0])
    monkeypatch.setattr(learning,'SOURCES',(('Microsoft Learn','https://learn.microsoft.com/api/catalog/','json'),))
    body='{"modules":[{"uid":"u","title":"Accounting module","url":"https://learn.microsoft.com/training/modules/accounting/"}]}'
    monkeypatch.setattr(learning,'safe_get',lambda url:(body,url))
    first=learning.discover();assert len(first['resources'])==1
    clock[0]+=learning.SOURCE_TTL+1
    def timeout(_):raise TimeoutError('timeout')
    def offline(_):raise learning.requests.Timeout('timeout')
    monkeypatch.setattr(learning,'safe_get',offline)
    second=learning.discover();assert second['resources']==first['resources']
    assert second['providerStatus']['Microsoft Learn']=='cached_after_error'
    learning._source_cache=None;learning._source_entries.clear()

@pytest.mark.parametrize('role,program', [('Accountant','Accountancy'),('Mechanical Engineer','Mechanical Engineering'),('Communications Officer','Communication'),('Business Analyst','Business Administration'),('QA / Software Tester','Information Technology')])
def test_actual_baseline_distribution_across_disciplines(role,program):
    result=learning.select(dict(targetPosition=role,program=program,gaps=['specialized topic not in catalog']),learning.reviewed_resources(),[])
    assert {tab:c['hardcoded'] for tab,c in result['counts'].items()}==learning.SPLIT
    assert len({row['url'] for rows in result['placements'].values() for row in rows})==11
    assert all(row['relevanceBasis'] in {'career_foundation','target_context'} for rows in result['placements'].values() for row in rows)


def test_real_style_read_more_cards_use_the_source_heading_not_navigation_text():
    body='<h3>Certified Tester Foundation Level (CTFL) v4.0</h3><p>Foundation</p><h4><a href="https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/">Read more &gt;</a></h4>'
    rows=learning.source_records('ISTQB','https://istqb.org/certifications/','certification',body)
    assert len(rows)==1 and rows[0]['title']=='Certified Tester Foundation Level (CTFL) v4.0'
    assert rows[0]['origin']=='ai_discovered'


def test_redirected_aliases_are_deduplicated_by_the_actual_destination(monkeypatch):
    learning._cache.clear()
    def probe(url,**_):
        return dict(verified=True,finalUrl='https://www.open.edu/shared/accounting' if url.endswith('/0') else url)
    monkeypatch.setattr(learning,'verify_external_resource_url',probe)
    result=learning.recommendations(CONTEXT,'redirect',lambda:dict(resources=records('dynamic'),unavailableSources=[]),lambda:records('hard'),lambda *_:None)
    rows=[row for values in result['placements'].values() for row in values]
    assert len(rows)==len({row['url'] for row in rows})


def test_redirect_to_generic_homepage_is_not_useful_even_with_http_200(monkeypatch):
    learning._cache.clear()
    monkeypatch.setattr(learning,'verify_external_resource_url',lambda url,**_:dict(verified=True,finalUrl='https://www.open.edu/'))
    result=learning.recommendations(CONTEXT,'homepage',lambda:dict(resources=records('dynamic'),unavailableSources=[]),lambda:records('hard'),lambda *_:None)
    assert all(count['ai_discovered']==0 for count in result['counts'].values())
    assert result['selectionDiagnostics']['unusableDestinations']>0


def test_model_timeout_preserves_validated_candidates_and_exact_split():
    learning._cache.clear()
    def timeout(*_):raise TimeoutError('provider timeout')
    result=learning.recommendations(CONTEXT,'model-timeout',lambda:dict(resources=records('dynamic'),unavailableSources=[]),lambda:records('hard'),timeout)
    assert result['complete'] and result['aiStatus']=='timeout'
    assert sum(c['ai_discovered'] for c in result['counts'].values())==11


def test_product_setup_does_not_substitute_for_general_project_management():
    row=dict(title='Deploy Dynamics 365 Project Operations',description='Learn project management capabilities',type='course',skills=['business-user'],products=['dynamics-365'])
    context=dict(targetPosition='Mechanical Engineer',program='Mechanical Engineering',gaps=['project management'])
    assert learning.relevance(row,context)[0]==0
    assert learning.relevance(row,dict(context,targetPosition='Dynamics 365 Consultant'))[0]>0
    assert learning.relevance(row,dict(context,gaps=['Project-Management']))[0]==0
    assert learning.relevance(row,dict(context,targetPosition='Dynamics365 Consultant'))[0]>0


def test_simulation_mentioned_only_in_security_description_is_not_engineering_material():
    row=dict(title='Secure email with Microsoft Defender',description='Includes attack simulation',type='module',skills=['security'],products=['m365'])
    assert learning.relevance(row,dict(targetPosition='Mechanical Engineer',program='',gaps=['simulation']))[0]==0


def test_dynamics_product_namespace_disambiguates_even_without_365_in_title():
    row=dict(title='Prepare finance and operations apps',description='Configure Dynamics for business',type='module',skills=[],products=['dynamics-365'])
    assert learning.relevance(row,dict(targetPosition='Mechanical Engineer',program='',gaps=['dynamics']))[0]==0

@pytest.mark.parametrize('context,row', [
    (dict(program='BS Architecture', targetPosition='Architect', gaps=['architectural design']),
     dict(title='Azure Solutions Architect', description='Design cloud architecture', skills=['architecture'], type='course')),
    (dict(program='BS Electrical Engineering', targetPosition='Electrical Engineer', gaps=['power systems']),
     dict(title='Microsoft Power Platform', description='Connect your business systems using the power of automation', skills=['business-applications'], products=['power-platform'], type='course')),
    (dict(program='BS Information Technology', targetPosition='IT Specialist', gaps=['network security']),
     dict(title='Get started with FinOps', description='Cloud financial operations for network and security teams', skills=['cloud-computing'], roles=['network-engineer','security-engineer'], type='course')),
])
def test_compound_needs_and_academic_context_reject_incidental_words(context, row):
    assert learning.relevance(row, context)[0] == 0


def test_subject_tags_do_not_include_provider_audience_roles():
    payload=json.dumps({'modules':[dict(uid='finops',title='Get started with FinOps',url='https://learn.microsoft.com/training/modules/finops/',subjects=['cloud-computing'],roles=['network-engineer','security-engineer'])]})
    row=learning.source_records('Microsoft Learn',learning.SOURCES[-1][1],'json',payload)[0]
    assert row['roles']==['network-engineer','security-engineer']
    assert row['skills']==['cloud-computing']


def test_compound_topics_accept_grounded_phrases_and_explicit_vendor_roles():
    row=dict(title='Configure network security groups',description='',skills=['networking'],type='module',products=['azure'])
    assert learning.relevance(row,dict(program='BS Information Technology',targetPosition='IT Specialist',gaps=['network security']))[0]>0
    row=dict(title='Azure Solutions Architect',description='',skills=['architecture'],type='course')
    assert learning.relevance(row,dict(program='BS Information Technology',targetPosition='Azure Solutions Architect',gaps=[]))[0]>0


def selectable_programs():
    from pathlib import Path
    colleges=json.loads((Path(__file__).parent/'data/tip_programs.json').read_text())
    return [program for college in colleges if college['name']!='Senior High School' for program in college['programs'] if program['verification']['status']=='verified']


@pytest.mark.parametrize('program',selectable_programs(),ids=lambda p:p['name'])
def test_every_selectable_program_keeps_baseline_and_isolates_context(program):
    context=dict(analysisId='program-matrix',program=program['name'],targetPosition=program['suggestedPositions'][0],gaps=[])
    calls=[]
    def offline():
        calls.append(1)
        return dict(resources=[],unavailableSources=['synthetic_outage'])
    owner='synthetic-program-matrix'
    first=learning.recommendations(context,owner,offline,ranking=lambda *_:None)
    assert first['counts']=={tab:dict(hardcoded=count,ai_discovered=0) for tab,count in learning.SPLIT.items()}
    assert learning.recommendations(context,owner,offline,ranking=lambda *_:None)['cached']
    changed=learning.recommendations(dict(context,targetPosition='Different career goal'),owner,offline,ranking=lambda *_:None)
    gaps=learning.recommendations(dict(context,gaps=['communication']),owner,offline,ranking=lambda *_:None)
    assert len({first['contextId'],changed['contextId'],gaps['contextId']})==3
    assert len(calls)==3


def test_degree_prefix_alias_retains_program_evidence_without_conflating_fields():
    course=dict(title='Civil Engineering Materials',skills=['construction materials'],type='course')
    for label in ['BS Civil Engineering','Civil Engineering','Bachelor of Science in Civil Engineering']:
        assert learning.relevance(course,dict(program=label,targetPosition='Graduate',gaps=[]))[0]>0
    assert learning.relevance(course,dict(program='BS Mechanical Engineering',targetPosition='Graduate',gaps=[]))[0]==0


def test_vendor_taxonomy_alone_does_not_establish_a_taught_subject():
    row=dict(title='Purchase Azure savings plan for compute',description='Minimize cloud operational costs.',skills=['cloud-computing','finance-accounting'],products=['azure'],type='module')
    assert learning.relevance(row,dict(program='BS Accountancy',targetPosition='Accountant',gaps=['accounting']))[0]==0


def test_slash_separated_target_position_preserves_qualified_role_evidence():
    row=dict(title='Certified Tester Foundation Level',skills=['software testing'],type='certification')
    assert learning.relevance(row,dict(program='BS Information Technology',targetPosition='QA / Software Tester',gaps=[]))[0]>0
    assert learning.relevance(dict(title='Azure Architect',skills=['cloud design'],type='course'),dict(program='BS Architecture',targetPosition='Architect / Designer',gaps=[]))[0]==0


def test_contextual_mit_catalog_uses_official_metadata_and_real_material_links(monkeypatch):
    learning._source_entries.clear()
    calls=[]
    url='https://ocw.mit.edu/courses/structural-analysis/'
    sitemap='<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>'+url+'sitemap.xml</loc></sitemap><sitemap><loc>https://evil.example/courses/structural-analysis/sitemap.xml</loc></sitemap></sitemapindex>'
    page='<title>Structural Analysis | MIT OpenCourseWare</title><meta name="description" content="Study structural analysis and engineering design."><a href="/courses/structural-analysis/pages/assignments/">Assignments</a><a href="https://evil.example/">Exams</a>'
    def fetch(destination):
        calls.append(destination)
        return (sitemap if destination.endswith('sitemap.xml') else page),destination
    monkeypatch.setattr(learning,'safe_get',fetch)
    monkeypatch.setattr(learning,'discover',lambda *_:dict(resources=[],unavailableSources=[]))
    context=dict(program='BS Civil Engineering',targetPosition='Civil Engineer',gaps=['structural analysis'])
    found=learning.discover_context(context)
    assert len(found['resources'])==2
    assert found['resources'][0]['title']=='Structural Analysis'
    assert found['resources'][1]['title']=='Structural Analysis: Assignments'
    assert found['resources'][1]['type']=='practice'
    assert all(learning.remote_evidence(row) for row in found['resources'])
    assert not any('evil.example' in destination for destination in calls)
    learning.discover_context(context)
    assert len(calls)==2
    unrelated=learning.discover_context(dict(context,gaps=['psychology'],program='Bachelor of Arts in Psychology',targetPosition='Psychometrician'))
    assert unrelated['resources']==[]


def test_contextual_mit_unavailable_or_malformed_keeps_existing_sources(monkeypatch):
    learning._source_entries.clear()
    monkeypatch.setattr(learning,'discover',lambda *_:dict(resources=records('dynamic'),unavailableSources=[]))
    monkeypatch.setattr(learning,'safe_get',lambda _:('<not-xml','https://ocw.mit.edu/sitemap.xml'))
    found=learning.discover_context(CONTEXT)
    assert len(found['resources'])==len(records('dynamic'))
    assert found['providerStatus']['MIT contextual catalog']=='unavailable'


def test_official_practice_discoveries_survive_candidate_serialization():
    learning._cache.clear()
    row=records('dynamic')[0]
    row.update(id='official-practice',type='practice',title='Accounting practice problems')
    found=dict(resources=[row],unavailableSources=[])
    result=learning.recommendations(dict(CONTEXT,analysisId='practice-type'),'synthetic-practice',lambda:found,ranking=lambda *_:None)
    assert result['counts']['practice']['ai_discovered']==1
    assert result['placements']['practice'][-1]['id']=='official-practice'


def test_contextual_source_timeout_keeps_baseline_with_default_pipeline(monkeypatch):
    learning._cache.clear();learning._source_entries.clear()
    monkeypatch.setattr(learning,'discover',lambda *_:dict(resources=[],unavailableSources=['all_primary_sources']))
    def timeout(_): raise learning.requests.Timeout('synthetic provider timeout')
    monkeypatch.setattr(learning,'safe_get',timeout)
    result=learning.recommendations(dict(CONTEXT,analysisId='default-pipeline-outage'),'synthetic-default-outage',ranking=lambda *_:None)
    assert result['counts']=={tab:dict(hardcoded=count,ai_discovered=0) for tab,count in learning.SPLIT.items()}
    assert result['providerStatus']['MIT contextual catalog']=='unavailable'
    assert result['status']=='partial'


def test_contextual_course_fetches_are_bounded(monkeypatch):
    learning._source_entries.clear();calls=[]
    urls=[f'https://ocw.mit.edu/courses/structural-analysis-{n}/' for n in range(16)]
    index='<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<sitemap><loc>'+url+'sitemap.xml</loc></sitemap>' for url in urls)+'</sitemapindex>'
    monkeypatch.setattr(learning,'discover',lambda *_:dict(resources=[],unavailableSources=[]))
    def fetch(url):
        calls.append(url)
        return (index if url.endswith('sitemap.xml') else '<title>Structural Analysis</title><meta name="description" content="Structural analysis practice.">'),url
    monkeypatch.setattr(learning,'safe_get',fetch)
    result=learning.discover_context(dict(targetPosition='Civil Engineer',program='BS Civil Engineering',gaps=['structural analysis']))
    assert len(calls)==9 and len(result['resources'])==8


@pytest.mark.parametrize('alias,expected',[('IT','BS Information Technology'),('B.S. Civil Engineering','BS Civil Engineering'),('ME','BS Mechanical Engineering'),('Bachelor of Science in Computer Engineering','BS Computer Engineering')])
def test_learning_program_aliases_come_from_existing_catalog(alias,expected):
    from learning_topics import learning_context
    context=learning_context(dict(program=alias,targetPosition='Unknown Custom Role',gaps=['actual gap']))
    assert context['program']==expected
    assert context['gaps']==['actual gap']
    assert context['careerTopics']==[]


@pytest.mark.parametrize('program',selectable_programs(),ids=lambda p:p['name'])
def test_all_selectable_programs_use_role_topics_for_shared_discovery(program):
    from learning_topics import learning_context
    context=dict(analysisId='shared-dynamic-topics',program=program['name'],targetPosition=program['suggestedPositions'][0],gaps=[])
    enriched=learning_context(context)
    assert enriched['careerTopics'],program['name']
    assert context['gaps']==[]
    topic=enriched['careerTopics'][0]
    row=records('dynamic')[0]
    row.update(id='synthetic-topic-course',title='Synthetic fixture: '+topic,type='course',skills=[topic])
    result=learning.recommendations(context,'synthetic-universal-topics',lambda:dict(resources=[row],unavailableSources=[]),ranking=lambda *_:None)
    selected=[row for rows in result['placements'].values() for row in rows if row['origin']=='ai_discovered']
    assert selected and selected[0]['relevanceBasis']=='career_development'
    assert all(count['hardcoded']==learning.SPLIT[tab] for tab,count in result['counts'].items())


def test_source_selection_follows_subjects_not_program_branches():
    from learning_topics import learning_context
    names=lambda c:{s[0] for s in learning.selected_sources(learning_context(c))}
    hr=names(dict(program='BS Business Administration major in Human Resource Management',targetPosition='HR Specialist',gaps=['recruitment']))
    game=names(dict(program='BS Entertainment and Multimedia Computing',targetPosition='Game Developer',gaps=['game development']))
    mechanical=names(dict(program='BS Mechanical Engineering',targetPosition='Mechanical Engineer',gaps=['solid mechanics']))
    assert 'HRCI' in hr and 'Unity' not in hr
    assert {'Unity','Unity Learn'}<=game and 'HRCI' not in game
    assert 'Unity' not in mechanical and 'HRCI' not in mechanical
    assert 'Microsoft Learn' not in mechanical


def test_official_credential_and_learning_catalogs_preserve_category_and_metadata():
    sources={provider:(url,kind) for provider,url,kind in learning.SOURCES}
    examples={
      'Unity':'<a href="/products/unity-certifications/associate-programmer">Certified Associate: Programmer</a><a href="/courses/game-design">Game Design Course</a>',
      'Unity Learn':'<a href="https://learn.unity.com/pathway/junior-programmer">Junior Programmer Pathway</a>',
      'HRCI':'<a href="/certifications/individual-certifications/aphri">Associate Professional in Human Resources - International\nBuild foundational HR knowledge.</a>',
      'CFA Institute':'<a href="/programs/investment-foundations-certificate">Investment Foundations</a><a href="/programs/course">Course</a>',
    }
    for provider,body in examples.items():
        url,kind=sources[provider]
        rows=learning.source_records(provider,url,kind,body)
        assert len(rows)==1 and learning.remote_evidence(rows[0])
        assert rows[0]['type']==('course' if provider=='Unity Learn' else 'certification')
        assert rows[0]['validationMethod']=='official_catalog'
    url,kind=sources['OpenStax']
    rows=learning.source_records('OpenStax',url,kind,json.dumps({'books':[dict(id=1,book_state='live',title='Principles of Finance',webview_rex_link='https://openstax.org/books/principles-finance/pages/1-introduction',promote_snippet='Learn finance.'),dict(id=2,book_state='draft',title='Unavailable Book')]}))
    assert len(rows)==1 and rows[0]['type']=='guide'
    assert rows[0]['title']=='Principles of Finance' and learning.remote_evidence(rows[0])


def test_career_topics_do_not_restore_generic_product_false_matches():
    from learning_topics import learning_context
    context=learning_context(dict(program='BS Mechanical Engineering',targetPosition='Mechanical Engineer',gaps=['project management']))
    row=dict(title='Dynamics 365 Project Operations',description='Learn project management',skills=[],products=['dynamics-365'],type='course')
    assert learning.relevance(row,context)[0]==0
    assert 'analysis' not in {label.lower() for label in context['careerTopics']}


def test_empty_issuer_navigation_does_not_abort_discovery():
    assert learning.source_records('HRCI','https://www.hrci.org/certifications/individual-certifications','certification','<a href="/certifications/individual-certifications/aphr"></a>')==[]


def test_all_profiles_reserve_the_same_eleven_baseline_records():
    from learning_topics import learning_context
    catalog=learning.reviewed_resources()
    expected={row['id'] for row in catalog if row.get('baselinePurpose')}
    assert len(expected)==11
    for program in selectable_programs():
        context=learning_context(dict(program=program['name'],targetPosition=program['suggestedPositions'][0],gaps=['communication']))
        result=learning.select(context,catalog,[])
        assert {row['id'] for rows in result['placements'].values() for row in rows}==expected


def test_retired_and_retiring_credentials_do_not_pass_catalog_validation():
    url=learning.SOURCES[-1][1]
    body=json.dumps({'certifications':[dict(title='MCSA: BI Reporting',url='https://learn.microsoft.com/credentials/certifications/bi/',subtitle='This certification has been retired.'),dict(title='Current Credential',url='https://learn.microsoft.com/credentials/certifications/current/',subtitle='A current credential.')]})
    rows=learning.source_records('Microsoft Learn',url,'json',body)
    assert [r['title'] for r in rows]==['Current Credential']


def test_competency_fragment_expansion_does_not_create_generic_needs():
    from learning_topics import learning_context
    industrial=learning_context(dict(program='BS Industrial Engineering',targetPosition='Industrial Engineer',gaps=[]))
    assert 'Time' not in industrial['careerTopics']
    assert learning.relevance(dict(title='Just in time Azure access',description='Configure real-time workloads',skills=[],products=['azure'],type='course'),industrial)[0]==0
    hr=learning_context(dict(program='BS Business Administration major in Human Resource Management',targetPosition='HR Specialist',gaps=[]))
    assert 'Guidelines' not in hr['careerTopics']


def test_unity_engine_and_databricks_unity_catalog_are_distinct_subjects():
    row=dict(title='Govern Unity Catalog objects',description='Manage data with Unity Catalog',skills=[],products=['azure-databricks'],type='module')
    assert learning.relevance(row,dict(program='BS Entertainment and Multimedia Computing',targetPosition='Game Developer',gaps=['Unity'],careerTopics=['Unity']))[0]==0
    assert learning.relevance(row,dict(program='BS Data Science and Analytics',targetPosition='Data Engineer',gaps=['Unity Catalog']))[0]>0


def test_contextual_sources_do_not_reuse_global_provider_selection(monkeypatch):
    learning._source_cache=None;learning._source_entries.clear()
    sources=tuple(s for s in learning.SOURCES if s[0] in {'Unity','HRCI'})
    monkeypatch.setattr(learning,'SOURCES',sources)
    monkeypatch.setattr(learning,'safe_get',lambda url:('<a href="/products/unity-certifications/user-programmer">Certified User: Programmer</a>' if 'unity.com' in url else '<a href="/certifications/individual-certifications/aphri">Associate Professional in Human Resources - International</a>',url))
    assert len(learning.discover()['providerStatus'])==2
    context=dict(program='BS Mechanical Engineering',targetPosition='Mechanical Engineer',gaps=['solid mechanics'])
    assert learning.discover(context)['providerStatus']=={}
    assert learning.discover(context)['resources']==[]
    learning._source_cache=None;learning._source_entries.clear()


def test_failed_source_is_not_retried_for_each_new_profile(monkeypatch):
    learning._source_cache=None;learning._source_entries.clear();calls=[]
    monkeypatch.setattr(learning,'SOURCES',tuple(s for s in learning.SOURCES if s[0]=='Unity'))
    def fail(url): calls.append(url);raise learning.requests.Timeout('synthetic timeout')
    monkeypatch.setattr(learning,'safe_get',fail)
    for role in ['Game Developer','Game Designer']:
        assert learning.discover(dict(program='',targetPosition=role,gaps=[]))['resources']==[]
    assert len(calls)==1
    learning._source_cache=None;learning._source_entries.clear()


def test_psychological_testing_does_not_select_software_testing_providers():
    from learning_topics import learning_context
    selected={source[0] for source in learning.selected_sources(learning_context(dict(program='Bachelor of Arts in Psychology',targetPosition='Psychometrician',gaps=['psychological testing'])))}
    assert 'Selenium' not in selected and 'ISTQB' not in selected


def test_new_official_issuers_still_require_safe_dns(monkeypatch):
    import ai_recommendation_verifier as verifier
    for host in ['www.hrci.org','www.cfainstitute.org']:
        assert verifier.is_domain_trusted(host)
        assert not verifier.is_domain_trusted(host+'.attacker.example')
    monkeypatch.setattr(verifier,'resolve_and_validate_hostname',lambda _: (False,'Synthetic private address'))
    assert verifier.verify_external_resource_url('https://www.hrci.org/certifications/individual-certifications/aphr')['status']=='ssrf_blocked'


def test_inferred_transferable_topic_does_not_justify_unrequested_vendor_administration():
    from learning_topics import learning_context
    context=learning_context(dict(program='BS Entertainment and Multimedia Computing',targetPosition='Game Developer',gaps=['game development']))
    row=dict(title='Implement Databricks development lifecycle',description='Use Git Version Control with Databricks workflows',skills=[],products=['azure-databricks'],type='module')
    assert learning.relevance(row,context)[0]==0


def test_inferred_named_product_requires_corroborating_subject_or_provider():
    from learning_topics import learning_context
    context=learning_context(dict(program='BS Industrial Engineering',targetPosition='Industrial Engineer',gaps=[]))
    assert 'Arena' in context['namedTopics']
    row=dict(title='Doctoral Research Seminar: Knowledge in the Public Arena',description='A public forum for research',skills=[],type='course',provider='MIT OpenCourseWare')
    assert learning.relevance(row,context)[0]==0
    game=learning_context(dict(program='BS Entertainment and Multimedia Computing',targetPosition='Game Developer',gaps=[]))
    assert learning.relevance(dict(title='Junior Programmer',description='Unity pathway',skills=['Unity'],provider='Unity Learn',type='course'),game)[0]>0


def test_jurisdiction_specific_credentials_require_explicit_context():
    row=dict(title='Professional in Human Resources - California',description='Human resource management',skills=['human resources'],type='certification',regionalScope='California')
    context=dict(targetPosition='HR Specialist',program='BS Business Administration major in Human Resource Management',gaps=['human resource management'])
    assert learning.relevance(row,context)[0]==0
    assert learning.relevance(row,dict(context,targetPosition='California HR Specialist'))[0]>0
