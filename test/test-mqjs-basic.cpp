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
    JSVAL v;

    jsvalEvalChecked("globalThis.simple=new Simple(123);");
    v=jsvalEvalChecked("globalThis.simple.getVal()");
    s=jsvalToStdString(v);
    assert(s=="123");

    jsvalEvalChecked("globalThis.simple.on('data',function() { globalThis.dataDispatched='yep' });");
    jsvalEvalChecked("globalThis.simple.emitData();");

    v=jsvalEvalChecked("globalThis.dataDispatched");
    s=jsvalToStdString(v);
    assert(s=="yep");

    basic_exit();
    jsvalMqjsExit();
}

void test_mqjs_objects() {
    printf("- objects\n");
    jsvalMqjsInit(MEMSIZE,basic_get_stdlib());
    basic_init_jsval();
    std::string s;
    JSVAL v;

    jsvalEvalChecked("globalThis.h=createHello();");
    v=jsvalEvalChecked("globalThis.h.getVal()");
    s=jsvalToStdString(v);
    assert(s=="666");

    jsvalEvalChecked("setHelloVal(globalThis.h,555)");
    v=jsvalEvalChecked("globalThis.h.getVal()");
    assert(jsvalToStdString(v)=="555");

    v=jsvalEvalChecked("getHelloVal(globalThis.h)");
    assert(jsvalToStdString(v)=="555");

    basic_exit();
    jsvalMqjsExit();
}

void test_mqjs_buffers() {
    printf("- buffers\n");
    jsvalMqjsInit(MEMSIZE,basic_get_stdlib());
    basic_init_jsval();
    std::string s;
    JSVAL v;
    uint8_t u[16];

    v=jsvalEvalChecked("globalThis.b=createBuffer(); globalThis.b");
    s=jsvalToStdString(v);
    //printf("created: %s\n",s.c_str());
    assert(s=="11,22,33,44,55,66,77,88,99,0");

    /*v=jsvalEvalChecked("globalThis.v=new Uint8Array([1,2,3,4,5])");
    s=jsvalToStdString(jsvalEvalChecked("globalThis.v[0]"));
    //printf("v1: %s\n",s.c_str());
    s=jsvalToStdString(jsvalEvalChecked("globalThis.v[1]"));
    //printf("v2: %s\n",s.c_str());

    for (int c=0; c<jsvalGetSize(v); c++) {
        printf("i: %d\n",jsvalGetInt(JS_GetPropertyUint32(jsvalMqjsGetContext(),v,c)));
    }

    jsvalReadBuffer(v,u);*/

    v=jsvalEvalChecked("peekBuffer(globalThis.b,2)");
    s=jsvalToStdString(v);
    //printf("read: %s\n",s.c_str());
    assert(s=="33");

    v=jsvalEvalChecked("peekBuffer(globalThis.b,4)");
    s=jsvalToStdString(v);
    assert(s=="55");

    basic_exit();
    jsvalMqjsExit();
}

int main() {
    printf("Running mquickjs tests...\n");

    test_mqjs_basic();
    test_mqjs_basic_jsval();
    test_mqjs_types();
    test_mqjs_classes();
    test_mqjs_objects();
    test_mqjs_buffers();

    return 0;
}