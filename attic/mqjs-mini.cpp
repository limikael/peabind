#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "mini.out.h"

#include "jsval.h"
#define MEMSIZE 65536

int main() {
    printf("- mini mqjs bindings\n");
    void *mem=malloc(MEMSIZE);
    JSContext *ctx=JS_NewContext(mem, MEMSIZE, mini_get_stdlib());

    mini_init(ctx);
    JSVAL v=jsvalEval("miniadd(2,5)");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="7");
    mini_exit();

    JS_FreeContext(ctx);
    free(mem);

    return 0;
}
