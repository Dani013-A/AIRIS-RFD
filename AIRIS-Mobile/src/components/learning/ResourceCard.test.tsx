import React from 'react';
const { act, create } = require('react-test-renderer');
jest.mock('react-native', () => ({Alert:{alert:jest.fn()}, TouchableOpacity:'TouchableOpacity', View:'View'}));
jest.mock('expo-image', () => ({Image:'Image'}));
jest.mock('expo-web-browser', () => ({openBrowserAsync:jest.fn(async()=>({type:'cancel'}))}));
jest.mock('@expo/vector-icons', () => ({Ionicons:'Icon'}));
jest.mock('../ui/AppText', () => ({Text:'Text'}));
import { Alert } from 'react-native';
import * as Browser from 'expo-web-browser';
import { ResourceCard } from './ResourceCard';
import resources from '../../data/reviewedLearningResources.json';
import { MatchedResourceItem } from '../../types/learning.types';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const resource={...resources[0],relevanceScore:90,recommendationReason:'Synthetic test reason'} as MatchedResourceItem;
let renderer: any;
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount());jest.clearAllMocks();});
async function render(item=resource,onPress?:()=>void){await act(async()=>{renderer=create(<ResourceCard resource={item} onPress={onPress}/>)});return renderer.root;}
it('uses intentional local fallback and both thumbnail and CTA open the exact reviewed destination',async()=>{
 const root=await render();expect(root.findAllByType('Image' as any)).toHaveLength(0);
 const links=root.findAllByType('TouchableOpacity' as any);expect(links.length).toBeGreaterThanOrEqual(2);
 await act(async()=>{await links[0].props.onPress();await links[links.length-1].props.onPress()});
 expect(Browser.openBrowserAsync).toHaveBeenNthCalledWith(1,resource.url);expect(Browser.openBrowserAsync).toHaveBeenNthCalledWith(2,resource.url);
});
it('broken thumbnail switches to local fallback and keeps navigation usable',async()=>{
 const root=await render({...resource,thumbnailUrl:'https://provider.example.org/image.png'});
 await act(async()=>root.findByType('Image' as any).props.onError());expect(root.findAllByType('Image' as any)).toHaveLength(0);
 await act(async()=>root.findAllByType('TouchableOpacity' as any)[0].props.onPress());expect(Browser.openBrowserAsync).toHaveBeenCalledWith(resource.url);
});
it('invalid destinations are rejected before a custom callback',async()=>{
 const callback=jest.fn();const root=await render({...resource,url:'javascript:alert(1)'},callback);
 await act(async()=>root.findAllByType('TouchableOpacity' as any)[0].props.onPress());expect(callback).not.toHaveBeenCalled();expect(Alert.alert).toHaveBeenCalledWith('Resource Unavailable',expect.any(String));
});
it('external browser rejection produces a recoverable error',async()=>{
 jest.mocked(Browser.openBrowserAsync).mockRejectedValueOnce(new Error('offline'));
 const root=await render();await act(async()=>root.findAllByType('TouchableOpacity' as any)[0].props.onPress());expect(Alert.alert).toHaveBeenCalledWith('Link Error',expect.any(String));
});
it('a failed image for one resource does not hide a later resource image',async()=>{
 const root=await render({...resource,thumbnailUrl:'https://provider.example.org/first.png'});
 await act(async()=>root.findByType('Image' as any).props.onError());
 await act(async()=>renderer.update(<ResourceCard resource={{...resource,id:'synthetic-next',thumbnailUrl:'https://provider.example.org/second.png'}}/>));
 expect(renderer.root.findAllByType('Image' as any)).toHaveLength(1);
});

it.each(resources.filter(item=>['interviews','resume','communication'].includes(item.category)))('opens the reviewed $id destination from thumbnail and CTA with local fallback',async item=>{
 const root=await render({...item,relevanceScore:80} as MatchedResourceItem);
 expect(root.findAllByType('Image' as any)).toHaveLength(0);
 expect(root.findAllByType('Icon' as any).some((icon: any)=>icon.props.name==='book')).toBe(true);
 expect(root.findAllByType('Text' as any).some((text: any)=>text.props.children===item.title)).toBe(true);
 const links=root.findAllByType('TouchableOpacity' as any);
 await act(async()=>{await links[0].props.onPress();await links[links.length-1].props.onPress()});
 expect(Browser.openBrowserAsync).toHaveBeenNthCalledWith(1,item.url);
 expect(Browser.openBrowserAsync).toHaveBeenNthCalledWith(2,item.url);
});
