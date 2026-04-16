#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "jsval-quickjs.h"

/*JSVAL testsize(JSVAL thisobj, int argc, JSVAL *argv) {
    return 123;    
}*/

void test_jsval_size() {
    printf("- test getting size\n");

    jsvalQuickjsInit();
    JSVAL v=jsvalEval("[1,2,3]");
    assert(jsvalGetSize(v)==3);
    jsvalFree(v);

    JSVAL s=jsvalEval("\"hello\"");
    assert(jsvalGetSize(s)==5);
    jsvalFree(s);

//    jsvalSetProp(jsvalGetGlobal(),"testsize",jsvalCreateFunc(testsize));

    jsvalQuickjsExit();
}
