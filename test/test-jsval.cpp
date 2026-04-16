#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>

extern "C" {
#include "quickjs.h"
}

/*JSVAL testsize(JSVAL thisobj, int argc, JSVAL *argv) {
    return 123;    
}

void test_jsval_size() {
    printf("- basic\n");

    JSRuntime *rt=JS_NewRuntime();
    JSContext *ctx=JS_NewContext(rt);

    jsvalInit(ctx);

//    jsvalSetProp(jsvalGetGlobal(),"testsize",jsvalCreateFunc(testsize));

    jsvalExit();

    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}*/
