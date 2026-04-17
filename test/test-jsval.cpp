#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "jsval-quickjs.h"

/*JSVAL testsize(JSVAL thisobj, int argc, JSVAL *argv) {
    return 123;    
}*/

void test_jsval_borrow() {
    printf("- test borrowed context\n");

    JSRuntime *rt=JS_NewRuntime();
    JSContext *ctx=JS_NewContext(rt);

    jsvalQuickjsInitBorrowed(ctx);
    JSVAL v=jsvalEval("[1,2,3]");
    assert(jsvalGetSize(v)==3);
    jsvalFree(v);

    JSVAL s=jsvalEval("\"hello\"");
    assert(jsvalGetSize(s)==5);
    jsvalFree(s);

    jsvalQuickjsExit();
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}

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
