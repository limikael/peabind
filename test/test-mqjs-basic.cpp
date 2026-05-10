#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "basic.out.h"
#include "jsval-util.h"

extern "C" {
#include "js_stdlib.out.h"
}

//extern JSSTDLibraryDef js_stdlib;

#include "jsval.h"
#define MEMSIZE 65536

void test_mqjs_basic() {
    printf("- basic mqjs bindings\n");
    void *mem=malloc(MEMSIZE);
    JSContext *ctx=JS_NewContext(mem, MEMSIZE, &js_stdlib);

    basic_init_jsval();
    //jsvalEval("hello(1,2)");
    basic_exit();

    jsvalMqjsExit();
    JS_FreeContext(ctx);
    free(mem);
}
