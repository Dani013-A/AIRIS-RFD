import copy
import pytest
import learning_discovery as learning
from institutional_email import is_manila_student_email

@pytest.mark.parametrize('email', ['m@tip.edu.ph','mdaespela@tip.edu.ph',' M.Student+alias@TIP.EDU.PH '])
def test_manila_accepts(email):
    assert is_manila_student_email(email)

@pytest.mark.parametrize('email', ['qstudent@tip.edu.ph','student@tip.edu.ph','m..a@tip.edu.ph','m.@tip.edu.ph','m@tip.edu.ph.evil','m a@tip.edu.ph','m@other.edu',None,''])
def test_manila_rejects(email):
    assert not is_manila_student_email(email)


def records(origin):
    return [dict(id=f'{origin}-{kind}-{n}',title=f'Accounting {origin} {kind} {n}',provider='University',
                 url=f'https://www.open.edu/{origin}/{kind}/{n}',type=kind,skills=['accounting'])
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
        calls.append(1);return dict(resources=records('dynamic'),unavailableSources=[])
    result=learning.recommendations(CONTEXT,'outage',discover,lambda:records('hard'),lambda *_:None)
    assert all(c['ai_discovered']==0 for c in result['counts'].values())
    assert result['expiresAt']==1600 and not result['complete']
    assert learning.recommendations(CONTEXT,'outage',discover,lambda:[],lambda *_:None)['cached']
    clock[0]=1601
    learning.recommendations(CONTEXT,'outage',discover,lambda:[],lambda *_:None)
    assert len(calls)==2


def test_retired_credentials_are_not_recommended():
    body='{"certifications":[{"uid":"old","title":"Dynamics Marketing (Legacy)","url":"https://learn.microsoft.com/credentials/certifications/old"}]}'
    assert learning.source_records('Microsoft Learn',learning.SOURCES[-1][1],'json',body)==[]

@pytest.mark.parametrize('body', ['{"modules":null}', '{"modules":[null,42,{"title":{},"url":"https://learn.microsoft.com/training/modules/x"}]}', '{"modules":"invalid"}'])
def test_malformed_source_metadata_cannot_create_resources(body):
    assert learning.source_records('Microsoft Learn',learning.SOURCES[-1][1],'json',body)==[]
