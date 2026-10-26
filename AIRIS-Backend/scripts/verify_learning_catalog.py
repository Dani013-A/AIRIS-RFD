"""Read-only external checks. Never promotes HTTP success to content verification."""
import argparse,concurrent.futures,datetime,json,pathlib,sys,time,urllib.parse
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from ai_recommendation_verifier import verify_external_resource_url


def verify_group(records):
    results=[]
    for item in records:
        result=verify_external_resource_url(item['url'],timeout=4)
        results.append({'id':item['id'],'url':item['url'],'httpCheck':result,'contentReviewed':item.get('verification',{}).get('contentReviewed') is True,'thumbnail':'intentional_local_fallback' if not item.get('thumbnailUrl') else 'manual_rights_and_content_review_required','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
        time.sleep(.25)
    return results

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--ids');args=parser.parse_args()
    rows=json.loads((pathlib.Path(__file__).resolve().parents[1]/'data/learning_resources.json').read_text())
    if args.ids:rows=[row for row in rows if row['id'] in args.ids.split(',')]
    groups={}
    for row in rows:groups.setdefault(urllib.parse.urlparse(row['url']).hostname,[]).append(row)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=[r for batch in pool.map(verify_group,groups.values()) for r in batch]
    urls=[row['url'].rstrip('/') for row in rows]
    output={'resourceCount':len(rows),'duplicateUrls':len(urls)-len(set(urls)),'results':sorted(results,key=lambda row:row['id']),'note':'HTTP checks do not establish title, provider, suitability, accreditation, or image rights. Blocked/failed checks require source/browser review; do not relabel them as success.'}
    pathlib.Path(args.output).write_text(json.dumps(output,indent=2)+'\n')
    print(json.dumps({'count':len(results),'statuses':{s:sum(r['httpCheck'].get('status')==s for r in results) for s in set(r['httpCheck'].get('status') for r in results)}}))
