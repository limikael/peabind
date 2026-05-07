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

static JSVAL ctor(JSVAL thisobj, int argc, JSVAL *argv) {
    return thisobj;
}

static JSVAL ctor2(JSVAL thisobj, int argc, JSVAL *argv) {
    return thisobj;
}

void test_jsval_classid() {
    printf("- test check class id\n");

    jsvalQuickjsInit();
    JSVAL v=jsvalCreateClass(ctor);
    JSVAL v2=jsvalCreateClass(ctor2);
    JSVAL o=jsvalCreateObject(v);

    assert(jsvalInstanceOf(o,v));
    assert(!jsvalInstanceOf(o,v2));

    jsvalFree(o);
    jsvalFree(v);
    jsvalFree(v2);

    jsvalQuickjsExit();
}
