import {Asset} from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {downloadOfficialResumeTemplate} from './officialResumeTemplates';
import {OFFICIAL_RESUME_TEMPLATES} from '../data/officialResumeTemplates';
jest.mock('expo-asset',()=>({Asset:{fromModule:jest.fn()}}));
jest.mock('expo-file-system/legacy',()=>({documentDirectory:'file://test/',copyAsync:jest.fn(),deleteAsync:jest.fn(),getInfoAsync:jest.fn(),makeDirectoryAsync:jest.fn()}));
jest.mock('expo-sharing',()=>({isAvailableAsync:jest.fn(),shareAsync:jest.fn()}));
jest.mock('../../assets/resume-templates/Harvard_Resume_Template.pdf',()=>101);
jest.mock('../../assets/resume-templates/Oxford_CV_Example.pdf',()=>102);
const fs=require('expo-file-system/legacy');
beforeEach(()=>{jest.clearAllMocks();fs.documentDirectory='file://test/';(Asset.fromModule as jest.Mock).mockReturnValue({downloadAsync:async()=>({localUri:'file://original.pdf'})});(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);fs.copyAsync.mockResolvedValue(undefined);fs.deleteAsync.mockResolvedValue(undefined);fs.makeDirectoryAsync.mockResolvedValue(undefined);});
test.each(['harvard','oxford'] as const)('shares the unchanged verified %s PDF',async id=>{
 const template=OFFICIAL_RESUME_TEMPLATES.find(t=>t.id===id)!;fs.getInfoAsync.mockResolvedValue({exists:true,isDirectory:false,md5:template.md5});
 const result=await downloadOfficialResumeTemplate(id);
 expect(Asset.fromModule).toHaveBeenCalledWith(id==='harvard'?101:102);
 expect(fs.copyAsync).toHaveBeenCalledWith({from:'file://original.pdf',to:'file://test/resume-templates/'+template.fileName});
 expect(Sharing.shareAsync).toHaveBeenCalledWith(result.uri,{mimeType:'application/pdf',dialogTitle:template.name});expect(result.shared).toBe(true);
});
test('TIP cannot silently export a generated or unrelated file',async()=>{
 await expect(downloadOfficialResumeTemplate('tip')).rejects.toThrow('verified T.I.P.');expect(Asset.fromModule).not.toHaveBeenCalled();expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
test('mismatched bytes are removed and never shared',async()=>{
 fs.getInfoAsync.mockResolvedValue({exists:true,isDirectory:false,md5:'wrong'});await expect(downloadOfficialResumeTemplate('harvard')).rejects.toThrow('could not be verified');expect(fs.deleteAsync).toHaveBeenCalledWith('file://test/resume-templates/Harvard_Resume_Template.pdf',{idempotent:true});expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
test('unavailable sharing still returns a verified local file',async()=>{
 fs.getInfoAsync.mockResolvedValue({exists:true,isDirectory:false,md5:OFFICIAL_RESUME_TEMPLATES[1].md5});(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);expect((await downloadOfficialResumeTemplate('harvard')).shared).toBe(false);expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
test('missing storage fails without pretending a download succeeded',async()=>{
 fs.documentDirectory=null;await expect(downloadOfficialResumeTemplate('harvard')).rejects.toThrow('storage');expect(fs.copyAsync).not.toHaveBeenCalled();
});
