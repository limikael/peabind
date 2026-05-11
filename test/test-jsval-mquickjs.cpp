#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <cassert>
#include <string>
#include "basic.out.h"
#include "jsval.h"

#define MEMSIZE 65536

void test_jsval_mqjs_basic() {
    printf("- test mquickjs basic\n");

    jsvalMqjsInit(65536,basic_get_stdlib());

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
    ctx=JS_NewContext(mem, MEMSIZE, basic_get_stdlib());
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

    jsvalMqjsInit(65536,basic_get_stdlib());

    JSVAL v=jsvalEval("[1,2,3]");
    assert(jsvalGetSize(v)==3);
    jsvalFree(v);

    JSVAL s=jsvalEval("\"hello\"");
    assert(jsvalGetSize(s)==5);
    jsvalFree(s);

    jsvalMqjsExit();
}

int main() {
    printf("Running mquickjs jsval tests...\n");

    test_jsval_mqjs_basic();
    test_jsval_size();
    test_jsval_mqjs_borrow();

    return 0;
}