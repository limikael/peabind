#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "mini.out.h"
#include "jsval-util.h"

extern "C" {
#include "js_stdlib.out.h"
}

//extern JSSTDLibraryDef js_stdlib;

#include "jsval.h"
#define MEMSIZE 65536

int main() {
    printf("- mini mqjs bindings\n");
    void *mem=malloc(MEMSIZE);
    JSContext *ctx=JS_NewContext(mem, MEMSIZE, &js_stdlib);

    mini_init_jsval();
    //jsvalEval("hello(1,2)");
    mini_exit();

    jsvalMqjsExit();
    JS_FreeContext(ctx);
    free(mem);

    return 0;
}
