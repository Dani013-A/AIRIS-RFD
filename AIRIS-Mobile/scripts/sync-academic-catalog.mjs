import fs from 'node:fs';
const source = new URL('../../AIRIS-Backend/data/tip_programs.json', import.meta.url);
const destination = new URL('../src/data/tipManilaPrograms.json', import.meta.url);
const data = fs.readFileSync(source, 'utf8');
const programs = JSON.parse(data).flatMap(college => college.programs);
if (new Set(programs.map(program => program.name)).size !== programs.length) throw new Error('Duplicate program');
for (const program of programs) {
  const proof = program.verification;
  if (!proof || !proof.sourceUrl.startsWith('https://dru.tip.edu.ph/') || proof.campus !== 'Manila' || !proof.checkedAt) throw new Error('Program provenance missing');
}
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== data) throw new Error('Academic catalog mirror is stale');
  console.log('ACADEMIC_CATALOG_SYNC_PASS');
} else fs.writeFileSync(destination, data);

const resourceSource = new URL('../../AIRIS-Backend/data/learning_resources.json', import.meta.url);
const resourceDestination = new URL('../src/data/reviewedLearningResources.json', import.meta.url);
const resources = fs.readFileSync(resourceSource, 'utf8');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(resourceDestination, 'utf8') !== resources) throw new Error('Learning catalog mirror is stale');
  console.log('LEARNING_CATALOG_SYNC_PASS');
} else fs.writeFileSync(resourceDestination, resources);
