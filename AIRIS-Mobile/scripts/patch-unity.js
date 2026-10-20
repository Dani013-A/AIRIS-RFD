/* global __dirname */
const fs = require('fs');
const path = require('path');

const unityModuleRoot = path.join(
  __dirname,
  '..',
  'node_modules',
  '@azesmway',
  'react-native-unity'
);

// 1. Patch android/build.gradle (mavenCentral replacement)
const unityGradlePath = path.join(unityModuleRoot, 'android', 'build.gradle');
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

// 2. Patch UnityView.tsx, lib/module/UnityView.js, and lib/commonjs/UnityView.js
// Prevent Commands.unloadUnity() when androidKeepPlayerMounted is enabled
const unityViewFiles = [
  path.join(unityModuleRoot, 'src', 'UnityView.tsx'),
  path.join(unityModuleRoot, 'lib', 'module', 'UnityView.js'),
  path.join(unityModuleRoot, 'lib', 'commonjs', 'UnityView.js'),
];

for (const filePath of unityViewFiles) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const isAlreadyPatched = /componentWillUnmount\(\)\s*\{[\s\S]*?!this\.props\.androidKeepPlayerMounted/.test(content);
    const unmountPattern = /(componentWillUnmount\(\)\s*\{[\s\S]*?)if\s*\(\s*this\.ref\.current\s*\)\s*\{\s*(_?UnityViewNativeComponent\.)?Commands\.unloadUnity\(this\.ref\.current\);\s*\}/;
    if (isAlreadyPatched) {
      console.log(`[patch-unity] ${path.relative(unityModuleRoot, filePath)} already patched for androidKeepPlayerMounted.`);
    } else if (unmountPattern.test(content)) {
      content = content.replace(
        unmountPattern,
        (match, before, prefix) => `${before}if (!this.props.androidKeepPlayerMounted && this.ref.current) {\n      ${prefix || ''}Commands.unloadUnity(this.ref.current);\n    }`
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-unity] Successfully patched ${path.relative(unityModuleRoot, filePath)} to respect androidKeepPlayerMounted.`);
    } else {
      console.warn(`[patch-unity] Target unmount pattern not found in ${path.relative(unityModuleRoot, filePath)}`);
    }
  }
}

// Shared players can receive focus callbacks from a view being removed during navigation.
const unityJavaRoot = path.join(unityModuleRoot, 'android', 'src', 'main', 'java', 'com', 'azesmwayreactnativeunity');
function patchJava(fileName, before, after) {
  const file = path.join(unityJavaRoot, fileName);
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Unity lifecycle patch target missing: ${fileName}`);
  fs.writeFileSync(file, source.replace(before, after));
}
patchJava('ReactNativeUnityView.java',
  'if (view == null || !isUnityReady()) {',
  'if (view == null || !isUnityReady() || ReactNativeUnityViewManager.view != this) {');
patchJava('ReactNativeUnityViewManager.java',
  'public void onViewAttachedToWindow(View v) {\n    restoreUnityUserState();',
  'public void onViewAttachedToWindow(View v) {\n    if (v == view && isUnityReady() && getPlayer() != null && v.hasWindowFocus()) {\n      getPlayer().windowFocusChanged(true);\n      getPlayer().resume();\n    }\n    restoreUnityUserState();');
patchJava('ReactNativeUnity.java',
  'if (unityPlayer.getParentPlayer() != null) {\n            ((ViewGroup) unityPlayer.getParentPlayer()).removeView(frame);\n        }',
  'if (unityPlayer.getParentPlayer() != null) {\n            ((ViewGroup) unityPlayer.getParentPlayer()).endViewTransition(frame);\n            ((ViewGroup) unityPlayer.getParentPlayer()).removeView(frame);\n        }');
