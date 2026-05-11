#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "basic.out.h"

#define MEMSIZE 65536

JSVAL jsvalEvalChecked(std::string code) {
    JSVAL res=jsvalEval(code.c_str());
    if (jsvalHasException()) {
        std::string ex=jsvalCatchExceptionStdString();
        printf("Eval Error: %s\n",ex.c_str());
        abort();
    }

    return res;
}

void test_mqjs_basic() {
    printf("- basic mqjs bindings\n");
    void *mem=malloc(MEMSIZE);
    JSContext *ctx=JS_NewContext(mem, MEMSIZE, basic_get_stdlib());

    basic_init(ctx);
    JSVAL v=jsvalEvalChecked("hello(5,2)");
    std::string s=jsvalToStdString(v);
    assert(s=="7");
    basic_exit();

    JS_FreeContext(ctx);
    free(mem);
}

void test_mqjs_basic_jsval() {
    printf("- basic mqjs bindings with borrowed jsval\n");
    jsvalMqjsInit(MEMSIZE,basic_get_stdlib());
    basic_init_jsval();
    JSVAL v=jsvalEvalChecked("hello(5,2)");
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

    s=jsvalToStdString(jsvalEvalChecked("hellof(1.5)"));
    assert(s=="15");

    s=jsvalToStdString(jsvalEvalChecked("hellothird(10)"));
    //printf("s: %s\n",s.c_str());
    assert(s=="3.3333332538604736");

    s=jsvalToStdString(jsvalEvalChecked("hellos('abc','123')"));
    //printf("s: %s\n",s.c_str());
    assert(s=="abc123");

    basic_exit();
    jsvalMqjsExit();
}

void test_mqjs_classes() {
    printf("- classes\n");
    jsvalMqjsInit(MEMSIZE,basic_get_stdlib());
    basic_init_jsval();
    std::string s;

    //jsvalEvalChecked("i think this will crash");

    //jsvalEvalChecked("globalThis.hello=new Hello(123);");
    //jsvalEvalChecked("hello(123,456)");
    //jsvalEvalChecked("new Object()");
    s=jsvalToStdString(jsvalEvalChecked("String(Object)"));
    printf("Object: %s\n",s.c_str());
    s=jsvalToStdString(jsvalEvalChecked("String(Hello)"));
    printf("Hello: %s\n",s.c_str());

    jsvalEvalChecked("globalThis.hello=new Hello(123);");
    //printf("Hello: %s\n",s.c_str());

    /*s=jsvalToStdString(jsvalEval("globalThis.hello.getVal()"));
    printf("s: %s\n",s.c_str());*/
    /*jsvalEval("globalThis.hello='123'");
    s=jsvalToStdString(jsvalEval("globalThis.x.y.z"));
    assert(s=="123");*/

    basic_exit();
    jsvalMqjsExit();
}

int main() {
    printf("Running mquickjs tests...\n");

    test_mqjs_basic();
    test_mqjs_basic_jsval();
    test_mqjs_types();
    //test_mqjs_classes();

    return 0;
}