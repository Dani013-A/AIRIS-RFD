const fs = require('fs');
const path = require('path');

const unityGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@azesmway',
  'react-native-unity',
  'android',
  'build.gradle'
);

if (fs.existsSync(unityGradlePath)) {
  let content = fs.readFileSync(unityGradlePath, 'utf8');
  if (content.includes('jcenter()')) {
    content = content.replace(/jcenter\(\)/g, 'mavenCentral()');
    fs.writeFileSync(unityGradlePath, content, 'utf8');
    console.log('[patch-unity] Successfully replaced jcenter() with mavenCentral() in @azesmway/react-native-unity');
  } else {
    console.log('[patch-unity] @azesmway/react-native-unity build.gradle already patched.');
  }
} else {
  console.log('[patch-unity] @azesmway/react-native-unity build.gradle not found, skipping patch.');
}
