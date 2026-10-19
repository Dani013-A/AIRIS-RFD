import re
import subprocess
import tempfile
import unittest
from pathlib import Path
from patch_panel_bubbles import ANCHOR, CPP, PATCH, patch

class PanelBubbleTests(unittest.TestCase):
    def test_activation_order(self):
        source = CPP.read_text()
        self.assertTrue(ANCHOR + PATCH in source, "Panel reparent patch must precede ancestor activation")
        start = source.index(ANCHOR + PATCH)
        self.assertLess(source.index('Transform_SetParent_', start), source.index('V_0 = L_3;', start))

    def test_repeatability(self):
        fixture = 'IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DialogueManager_ShowListening_m24F42C86ABB159E331CEE3A759EBCED61BAD95BD (x)\n{\n' + ANCHOR + '\n}\n// Method Definition Index:'
        self.assertEqual(patch(patch(fixture)), patch(fixture))
        for unknown in ['', fixture.replace(ANCHOR, ANCHOR + ANCHOR)]:
            with self.assertRaises(ValueError): patch(unknown)

    def test_native_empty_stale_long_and_state_transitions(self):
        block = re.sub(r'_m[0-9A-F]+', '', PATCH)
        block = re.sub(r'_t[0-9A-F]+', '', block)
        harness = r'''
#include <cassert>
#include <cstdint>
#include <string>
#include <vector>
#undef assert
#define assert(condition) do { if (!(condition)) return 1; } while (0)
using String=std::string; using String_t=String;
struct GameObject;
struct Transform { Transform* parent=nullptr; GameObject* owner=nullptr; };
struct GameObject { bool active=false; Transform tr; GameObject(){tr.owner=this;} };
struct TMP_Text { String* ___m_text; };
struct RuntimeArray { size_t max_length; };
template<class T> struct Array: RuntimeArray { std::vector<T*> xs; Array(std::initializer_list<T*> v):xs(v){max_length=xs.size();} T* GetAt(int i){return xs.at(i);} };
struct DialogueManager { Array<GameObject>* ___interviewerSpeechBubbles; Array<TMP_Text>* ___interviewerSpeechTexts; GameObject* ___listeningPanel; };
struct Scene{}; String scene="SampleScene";
Scene SceneManager_GetActiveScene(void*){return {};}
String* Scene_get_name(Scene*,void*){return &scene;}
String* il2cpp_string_new(const char* s){static String v;v=s;return &v;}
bool String_op_Equality(String*a,String*b,void*){return a&&b&&*a==*b;}
bool String_IsNullOrWhiteSpace(String*s,void*){return !s||s->find_first_not_of(" \t\r\n")==String::npos;}
bool GameObject_get_activeInHierarchy(GameObject*g,void*){for(auto*t=&g->tr;t;t=t->parent)if(!t->owner->active)return false;return true;}
GameObject* DialogueManager_FindActualBubblePanel(DialogueManager*,GameObject*g,TMP_Text*,void*){return g;}
Transform* GameObject_get_transform(GameObject*g,void*){return &g->tr;}
Transform* Transform_get_parent(Transform*t,void*){return t->parent;}
void Transform_SetParent(Transform*t,Transform*p,bool,void*){t->parent=p;}
void GameObject_SetActive(GameObject*g,bool active,void*){g->active=active;}
void show(DialogueManager* __this){
BLOCK
for(auto*t=&__this->___listeningPanel->tr;t;t=t->parent)t->owner->active=true;
}
int main(){
GameObject canvas,left,center,right,status;canvas.active=true;
left.tr.parent=center.tr.parent=right.tr.parent=&canvas.tr;
String empty="",space=" \t",question="Tell me about yourself.",longQ(600,'q');
TMP_Text lt{&empty},ct{&empty},rt{&longQ};
Array<GameObject> roots{&left,&center,&right};Array<TMP_Text> texts{&lt,&ct,&rt};
DialogueManager dm{&roots,&texts,&status};
right.active=true;status.tr.parent=&center.tr;show(&dm);
assert(!center.active&&right.active&&status.active&&status.tr.parent==&canvas.tr&&longQ.size()==600);
right.active=false;left.active=true;lt.___m_text=&space;status.tr.parent=&center.tr;
show(&dm);assert(!status.active&&!center.active);
lt.___m_text=nullptr;show(&dm);assert(!status.active);
for(int i=0;i<3;++i){
left.active=center.active=right.active=false;
lt.___m_text=ct.___m_text=rt.___m_text=&empty;
roots.GetAt(i)->active=true;texts.GetAt(i)->___m_text=&question;
status.tr.parent=&roots.GetAt((i+1)%3)->tr;
show(&dm);show(&dm);
for(int j=0;j<3;++j)assert(roots.GetAt(j)->active==(i==j));
assert(status.active&&status.tr.parent==&canvas.tr&&question=="Tell me about yourself.");
}
scene="OneOnOne";center.active=false;status.tr.parent=&center.tr;show(&dm);
assert(center.active&&status.tr.parent==&center.tr);
}
'''.replace('BLOCK',block)
        with tempfile.TemporaryDirectory() as directory:
            src=Path(directory)/'panel.cpp';binary=Path(directory)/'panel';src.write_text(harness)
            subprocess.run(['c++','-std=c++17',str(src),'-o',str(binary)],check=True)
            subprocess.run([str(binary)],check=True)
            src.write_text(harness.replace(block, ''))
            subprocess.run(['c++', '-std=c++17', str(src), '-o', str(binary)], check=True)
            self.assertNotEqual(subprocess.run([str(binary)]).returncode, 0,
                                'Old ancestor activation must fail the stale-bubble fixture')

if __name__=='__main__': unittest.main()
