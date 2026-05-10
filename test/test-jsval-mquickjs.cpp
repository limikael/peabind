#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <cassert>
#include <string>

extern "C" {
#include "js_stdlib.out.h"
}

#include "jsval.h"

#define MEMSIZE 65536

void test_jsval_mqjs_basic() {
    printf("- test mquickjs basic\n");

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEval("1+2");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="3");

    jsvalMqjsExit();
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