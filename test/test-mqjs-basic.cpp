#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "basic.out.h"

#define MEMSIZE 65536

void test_mqjs_basic() {
    printf("- basic mqjs bindings\n");
    void *mem=malloc(MEMSIZE);
    JSContext *ctx=JS_NewContext(mem, MEMSIZE, basic_get_stdlib());

    basic_init(ctx);
    JSVAL v=jsvalEval("hello(5,2)");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="7");
    basic_exit();

    JS_FreeContext(ctx);
    free(mem);
}

void test_mqjs_basic_jsval() {
    printf("- basic mqjs bindings with borrowed jsval\n");
    jsvalMqjsInit(MEMSIZE,basic_get_stdlib());
    basic_init_jsval();
    JSVAL v=jsvalEval("hello(5,2)");
    std::string s=jsvalToStdString(v);
    assert(s=="7");
    basic_exit();
    jsvalMqjsExit();
}

void test_mqjs_types() {
    printf("- types\n");
    jsvalMqjsInit(MEMSIZE,basic_get_stdlib());
    basic_init_jsval();
    std::string s;

    s=jsvalToStdString(jsvalEval("hellof(1.5)"));
    assert(s=="15");

    s=jsvalToStdString(jsvalEval("hellothird(10)"));
    //printf("s: %s\n",s.c_str());
    assert(s=="3.3333332538604736");

    s=jsvalToStdString(jsvalEval("hellos('abc','123')"));
    //printf("s: %s\n",s.c_str());
    assert(s=="abc123");

    basic_exit();
    jsvalMqjsExit();
}
