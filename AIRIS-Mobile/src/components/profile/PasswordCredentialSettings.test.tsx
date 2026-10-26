import React from 'react';
import { PasswordCredentialSettings } from './PasswordCredentialSettings';
const {create,act}=jest.requireActual('react-test-renderer');
jest.mock('../ui/AppText',()=>({Text:'Text'}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it.each([
 {providers:[{providerId:'google.com'}],form:false},
 {providers:[{providerId:'password'}],form:true},
 {providers:[{providerId:'google.com'},{providerId:'password'}],form:true},
 {providers:undefined,form:false},
])('password collection matches linked providers: $providers',async fixture=>{
 let renderer:any;await act(async()=>{renderer=create(<PasswordCredentialSettings providers={fixture.providers}><React.Fragment>{React.createElement('PasswordForm')}</React.Fragment></PasswordCredentialSettings>)});
 expect(renderer.root.findAllByType('PasswordForm')).toHaveLength(fixture.form?1:0);
 await act(async()=>renderer.unmount());
});
