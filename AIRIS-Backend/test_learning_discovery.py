import copy
import pytest
import learning_discovery as learning
from institutional_email import is_manila_student_email

@pytest.fixture(autouse=True)
def mock_destination_transport(monkeypatch):
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
