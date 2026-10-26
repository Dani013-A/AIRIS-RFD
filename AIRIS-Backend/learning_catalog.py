"""Reviewed factual resource records shared with the mobile catalog."""
import datetime
import json
import pathlib
import urllib.parse


def canonical_url(value):
    try:
        url=urllib.parse.urlsplit(value)
        if url.scheme!='https' or url.username or url.password:return ''
        query=urllib.parse.urlencode(sorted((k,v) for k,v in urllib.parse.parse_qsl(url.query) if not k.startswith('utm_') and k not in {'fbclid','gclid'}))
        return urllib.parse.urlunsplit((url.scheme,url.netloc.lower(),url.path.rstrip('/'),query,''))
    except (ValueError,TypeError):return ''


def reviewed_resources():
    records=json.loads((pathlib.Path(__file__).parent/'data/learning_resources.json').read_text())
    now=datetime.datetime.now(datetime.timezone.utc)
    valid=[]
    for record in records:
        proof=record.get('verification') or {}
        try:age=(now-datetime.datetime.fromisoformat(proof['checkedAt'].replace('Z','+00:00'))).total_seconds()
        except (KeyError,ValueError,TypeError):continue
        if (record.get('isActive') is True and record.get('isVerified') is True and proof.get('status')=='verified'
            and proof.get('contentReviewed') is True and 0<=age<=90*86400
            and proof.get('reviewedTitle')==record.get('title') and proof.get('reviewedProvider')==record.get('provider')
            and canonical_url(record.get('url')) and canonical_url(proof.get('sourceUrl'))==canonical_url(record['url'])):
            valid.append(record)
    return valid


def resolve_resource_candidates(candidates):
    """AI may reference a reviewed record, but cannot supply its factual metadata."""
    by_url={canonical_url(record['url']):record for record in reviewed_resources()}
    resolved=[];seen=set()
    for candidate in candidates if isinstance(candidates,list) else []:
        if not isinstance(candidate,dict):continue
        key=canonical_url(candidate.get('url',''))
        if key not in by_url or key in seen:continue
        seen.add(key);resolved.append(by_url[key])
    return resolved
