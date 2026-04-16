#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "basic.out.h"

extern "C" {
#include "quickjs.h"
}

std::string runjs(JSContext *ctx, const char *code) {
    JSValue result=JS_Eval(ctx,
        code,
        strlen(code),
        "<input>",
        JS_EVAL_TYPE_GLOBAL
    );

    if (JS_IsException(result)) {
        JSValue ex=JS_GetException(ctx);
        const char *msg=JS_ToCString(ctx,ex);
        printf("exception: %s\n",msg);
        JS_FreeCString(ctx,msg);
        JS_FreeValue(ctx,ex);
    }

    assert(!JS_IsException(result));

    const char *res=JS_ToCString(ctx,result);
    std::string resString=std::string(res);
    JS_FreeCString(ctx,res);
    JS_FreeValue(ctx,result);

    return resString;
}

std::string evaljs(std::string code) {
    JSVAL res=jsvalEval(code.c_str());
    char *tmp=jsvalGetStrdup(res);
    std::string s=std::string(tmp);
    free(tmp);
    jsvalFree(res);
    return s;
}

void test_basic() {
    printf("- basic\n");

    jsvalQuickjsInit();
    basic_init();

    JSContext *ctx=jsvalQuickjsGetContext();

    char *t=jsvalGetStrdup(jsvalEval("hello(1,2)"));
    assert(!strcmp(t,"3"));
    jsvalEval("hello(1,2)");

    evaljs("new Hello(100)");

    //trigger GC check at the end...
    //jsvalCreateObject(jsvalCreateInt(123));

    JSVAL i=jsvalCreateInt(123);
    std::string s;

    s=evaljs("hello(1,2)");
    assert(s=="3");

    s=evaljs("globalThis.h=new Hello(100)");
    s=evaljs("globalThis.h.getVal()");
    assert(s=="100");
    s=evaljs("globalThis.h.setVal(999)");
    s=evaljs("globalThis.h.getVal()");
    assert(s=="999");

    s=evaljs("setHelloVal(globalThis.h,555)");
    s=evaljs("globalThis.h.getVal()");
    assert(s=="555");

    s=evaljs("globalThis.h2=createHello()");
    s=evaljs("globalThis.h2.getVal()");
    assert(s=="666");

    basic_exit();
    jsvalQuickjsExit();
}

void test_events() {
    printf("- events\n");
    jsvalQuickjsInit();
    basic_init();
    JSContext *ctx=jsvalQuickjsGetContext();
    std::string s;

    s=runjs(ctx,"globalThis.h=new Hello(100);");
    s=runjs(ctx,"globalThis.cb=(v1,v2)=>{globalThis.captured1=v1; globalThis.captured2=v2;}");
    s=runjs(ctx,"globalThis.h.on('data',globalThis.cb);");
    s=runjs(ctx,"globalThis.h.emitData(1234,9999);");
//    s=runjs(ctx,"globalThis.h.off('data',globalThis.cb);");
    s=runjs(ctx,"JSON.stringify([globalThis.captured1,globalThis.captured2])");
    assert(s=="[1234,9999]");

    basic_exit();
    jsvalQuickjsExit();
}

void test_types() {
    printf("- types\n");
    jsvalQuickjsInit();
    basic_init();
    std::string s;

    s=evaljs("hellof(1.5)");
    assert(s=="15");

    s=evaljs("hellothird(10)");
    //printf("s: %s\n",s.c_str());
    assert(s=="3.3333332538604736");

    basic_exit();
    jsvalQuickjsExit();
}

void test_event_types() {
    printf("- event types\n");
    jsvalQuickjsInit();
    JSContext *ctx=jsvalQuickjsGetContext();
    basic_init();
    std::string s;

    s=runjs(ctx,"globalThis.h=new Hello(100);");
    s=runjs(ctx,"globalThis.h.on('dataVoid',()=>{globalThis.captured='yes';});");
    s=runjs(ctx,"globalThis.h.emitDataVoid();");
    s=runjs(ctx,"globalThis.captured");
    assert(s=="yes");

    s=runjs(ctx,"globalThis.h=new Hello(100);");
    s=runjs(ctx,"globalThis.h.on('dataFloat',(f)=>{globalThis.captured=f;});");
    s=runjs(ctx,"globalThis.h.emitDataFloat(321.123);");
    s=runjs(ctx,"globalThis.captured");
    //printf("s: %s\n",s.c_str());
    assert(s=="321.12298583984375");

    s=runjs(ctx,"globalThis.h=new Hello(100);");
    s=runjs(ctx,"globalThis.h.setVal(999);");
    s=runjs(ctx,"globalThis.h.on('dataHello',(h)=>{globalThis.captured=h.getVal();});");
    s=runjs(ctx,"globalThis.h.emitDataHello(globalThis.h);");
    s=runjs(ctx,"globalThis.captured");
    //printf("s: %s\n",s.c_str());
    assert(s=="999");

    s=runjs(ctx,"globalThis.h=new Hello(100);");
    s=runjs(ctx,"globalThis.h.on('dataString',(s)=>{globalThis.captured=s;});");
    s=runjs(ctx,"globalThis.h.emitDataString('testing');");
    s=runjs(ctx,"globalThis.captured");
    //printf("s: %s\n",s.c_str());
    assert(s=="testing");

    basic_exit();
    jsvalQuickjsExit();
}

void test_strings() {
    printf("- strings\n");
    jsvalQuickjsInit();
    basic_init();
    std::string s;

    s=evaljs("hellos('a','b')");
    assert(s=="ab");

    basic_exit();
    jsvalQuickjsExit();
}

void test_gc() {
    printf("- gc\n");
    jsvalQuickjsInit();
    JSContext *ctx=jsvalQuickjsGetContext();
    basic_init();
    std::string s;

    s=runjs(ctx,"removeHello()");

    s=runjs(ctx,"getLiveHelloCount()");
    //printf("live: %s\n",s.c_str());
    assert(s=="0");

    s=runjs(ctx,"globalThis.h=new Hello(100)");
    s=runjs(ctx,"getLiveHelloCount()");
    //printf("live: %s\n",s.c_str());
    assert(s=="1");

    s=runjs(ctx,"globalThis.h=null");

    jsvalQuickjsRunGc();
    s=runjs(ctx,"getLiveHelloCount()");
    assert(s=="0");

    jsvalEval("globalThis.s=new String(); 123");

    basic_exit();
    jsvalQuickjsExit();
}