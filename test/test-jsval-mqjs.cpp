#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <cassert>
#include <string>
#include "jsval.h"
#include "jsval-util.h"
#include "test-jsval-mqjs.bindings.out.h"

#define MEMSIZE 65536

JSVAL helloadd(JSVAL thisobj, int argc, JSVAL *argv) {
    return jsvalCreateInt(jsvalGetInt(argv[0])+jsvalGetInt(argv[1]));
}

JSVAL jsvalEvalChecked(std::string code) {
    JSVAL res=jsvalEval(code.c_str());
    if (jsvalHasException()) {
        std::string ex=jsvalCatchExceptionStdString();
        printf("Eval Error: %s\n",ex.c_str());
        abort();
    }

    return res;
}

void test_jsval_mqjs_basic() {
    printf("- test mquickjs basic\n");

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEval("1+2");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="3");

    jsvalMqjsExit();
}

void test_jsval_mqjs_borrow() {
    printf("- test mquickjs borrowed context\n");
    void *mem;
    JSContext *ctx;

    mem=malloc(MEMSIZE);
    ctx=JS_NewContext(mem,MEMSIZE,&js_stdlib);
    jsvalMqjsInitBorrowed(ctx);

    JSVAL v=jsvalEval("1+2");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="3");

    jsvalMqjsExit();
    JS_FreeContext(ctx);
    free(mem);
}

void test_jsval_size() {
    printf("- test getting size\n");

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEval("[1,2,3]");
    assert(jsvalGetSize(v)==3);
    jsvalFree(v);

    JSVAL s=jsvalEval("\"hello\"");
    assert(jsvalGetSize(s)==5);
    jsvalFree(s);

    jsvalMqjsExit();
}

void test_jsval_mqjs_bindings() {
    printf("- test jsval mqjs bindings\n");

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEvalChecked("helloadd(100,23)");
    assert(jsvalToStdString(v)=="123");

    jsvalMqjsExit();
}

int main() {
    printf("Running mquickjs jsval tests...\n");

    test_jsval_mqjs_basic();
    test_jsval_size();
    test_jsval_mqjs_borrow();
    test_jsval_mqjs_bindings();

    return 0;
}