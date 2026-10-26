import { Asset } from 'expo-asset';
import { copyAsync, deleteAsync, documentDirectory, getInfoAsync, makeDirectoryAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { OFFICIAL_RESUME_TEMPLATES, ResumeTemplateId } from '../data/officialResumeTemplates';

export async function downloadOfficialResumeTemplate(id: ResumeTemplateId): Promise<{uri: string; shared: boolean}> {
  const template = OFFICIAL_RESUME_TEMPLATES.find(item => item.id === id);
  if (!template?.fileName || !template.md5) throw new Error(template?.unavailableReason || 'This official template is unavailable.');
  if (!documentDirectory) throw new Error('Document storage is unavailable on this device.');
  const module = id === 'harvard'
    ? require('../../assets/resume-templates/Harvard_Resume_Template.pdf')
    : require('../../assets/resume-templates/Oxford_CV_Example.pdf');
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error('The original template file could not be opened.');
  const directory = `${documentDirectory}resume-templates/`;
  await makeDirectoryAsync(directory, {intermediates: true});
  const uri = directory + template.fileName;
  try {
    await copyAsync({from: asset.localUri, to: uri});
    const file = await getInfoAsync(uri, {md5: true});
    if (!file.exists || file.isDirectory || file.md5 !== template.md5) throw new Error('The template file could not be verified. Please update AIRIS and try again.');
  } catch (error) {
    await deleteAsync(uri, {idempotent: true}).catch(() => {});
    throw error;
  }
  const shared = await Sharing.isAvailableAsync();
  if (shared) await Sharing.shareAsync(uri, {mimeType: 'application/pdf', dialogTitle: template.name});
  return {uri, shared};
}
