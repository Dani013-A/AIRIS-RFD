const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'../node_modules/@azesmway/react-native-unity/android/src/main/java/com/azesmwayreactnativeunity');
function method(file, signature) {
 const source=fs.readFileSync(path.join(root,file),'utf8'),start=source.indexOf(signature);assert.ok(start>=0);
 let end=source.indexOf('{',start),depth=1;
 while(depth && ++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
 return source.slice(start,end+1);
}
test('production focus and attach handlers ignore obsolete views and resume the current owner',()=>{
 const focus=method('ReactNativeUnityView.java','public void onWindowFocusChanged('),attach=method('ReactNativeUnityViewManager.java','public void onViewAttachedToWindow(');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'airis-unity-focus-'));
 const java=`package com.azesmwayreactnativeunity;
import static com.azesmwayreactnativeunity.ReactNativeUnity.*;
class View {boolean focused=true; boolean hasWindowFocus(){return focused;}}
class FrameLayout extends View {public void onWindowFocusChanged(boolean value){}}
class UPlayer {int focuses,resumes,pauses; void windowFocusChanged(boolean value){focuses++;} void resume(){resumes++;} void pause(){pauses++;}}
class ReactNativeUnity {static boolean _isUnityReady=true,_isUnityPaused=false;static UPlayer player=new UPlayer();static boolean isUnityReady(){return _isUnityReady;}static UPlayer getPlayer(){return player;}static void resume(){player.resume();_isUnityPaused=false;}static void pause(){player.pause();_isUnityPaused=true;}}
class ReactNativeUnityView extends FrameLayout {UPlayer view=player;boolean keepPlayerMounted=true;${focus}}
class ReactNativeUnityViewManager {static ReactNativeUnityView view;void restoreUnityUserState(){}${attach}}
public class FocusHarness {public static void main(String[] args){
 ReactNativeUnityView old=new ReactNativeUnityView(), current=new ReactNativeUnityView();
 ReactNativeUnityViewManager manager=new ReactNativeUnityViewManager();manager.view=current;
 old.onWindowFocusChanged(false);if(player.focuses!=0)throw new AssertionError("obsolete view stole focus");
 current.onWindowFocusChanged(false);if(!_isUnityPaused || player.pauses!=1)throw new AssertionError("pause state stale");
 current.onWindowFocusChanged(true);if(player.focuses!=2 || _isUnityPaused || player.resumes!=1)throw new AssertionError("focused owner did not resume");
 manager.onViewAttachedToWindow(current);if(player.resumes!=2)throw new AssertionError("attached owner did not resume");
 manager.onViewAttachedToWindow(old);if(player.resumes!=2)throw new AssertionError("obsolete attach resumed player");
 _isUnityReady=false;current.onWindowFocusChanged(true);manager.onViewAttachedToWindow(current);
 if(player.resumes!=2 || player.focuses!=3)throw new AssertionError("unready runtime touched");
 System.out.println("UNITY_VIEW_OWNERSHIP_PASS");}}
`;
 fs.writeFileSync(path.join(dir,'FocusHarness.java'),java);
 try {
  const compile=spawnSync('javac',['-d',dir,path.join(dir,'FocusHarness.java')],{encoding:'utf8'});assert.equal(compile.status,0,compile.stderr);
  const run=spawnSync('java',['-cp',dir,'com.azesmwayreactnativeunity.FocusHarness'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/UNITY_VIEW_OWNERSHIP_PASS/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('reparenting ends the old view transition before removing the shared frame',()=>{
 const source=method('ReactNativeUnity.java','public static void addUnityViewToGroup('),end=source.indexOf('.endViewTransition(frame)');
 assert.ok(end>=0 && end<source.indexOf('.removeView(frame)'));
});

test('delayed pause restoration rechecks the current pause state',()=>{
 const source=method('ReactNativeUnityViewManager.java','private void restoreUnityUserState(');
 assert.match(source,/getPlayer\(\) != null && isUnityPaused\(\)/);
});
