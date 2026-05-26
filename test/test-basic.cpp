#include <cstdio>
#include <cassert>
#include <string>
#include <format>
#include <iostream>
#include "basic.out.h"
#include "jsval-util.h"
#include "peabind.h"
#include "basic.h"

extern "C" {
#include "quickjs.h"
}

void jsvalCheckException() {
    if (jsvalHasException()) {
        std::string ex=jsvalCatchExceptionStdString();
        printf("Check Error: %s\n",ex.c_str());
        abort();
    }
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
    if (jsvalHasException()) {
        std::string m=jsvalCatchExceptionStdString();
        printf("Error: %s\n",m.c_str());
        abort();
    }
    char *tmp=jsvalGetStrdup(res);
    std::string s=std::string(tmp);
    free(tmp);
    jsvalFree(res);
    return s;
}

void test_throw_exceptions() {
    printf("- throws exceptions\n");
    jsvalQuickjsInit();
    basic_init_jsval();

    JSVAL v=jsvalEval("new WithPrivateCtor();");
    std::string vs=jsvalToStdString(v);
    jsvalFree(v);
    //printf("r: %s\n",vs.c_str());

    assert(jsvalHasException()==true);
    std::string s=jsvalCatchExceptionStdString();
    assert(s=="Error: private constructor");

    s=evaljs("hello(1,'2')");
    assert(s=="3");

    s=evaljs("WithPrivateCtor.getNullish()");
    //printf("s: %s\n",s.c_str());
    assert(s=="null");

    s=evaljs("WithPrivateCtor.extractVal(WithPrivateCtor.create())");
    //printf("s: %s\n",s.c_str());
    assert(s=="777");

    s=evaljs("WithPrivateCtor.extractVal(null)");
    //printf("s: %s\n",s.c_str());
    assert(s=="-1");

    v=jsvalEval("new Hello()"); // wrong arg count
    vs=jsvalToStdString(v);
    jsvalFree(v);
    assert(jsvalHasException());
    assert(jsvalCatchExceptionStdString()=="Error: wrong ctor arg count");

    s=evaljs("WithPrivateCtor.extractVal(new Hello(123))");
    //printf("s: %s\n",s.c_str());
    assert(s=="-1");

    basic_exit();
    jsvalQuickjsExit();
}

void test_wrong_type() {
    printf("- wrong type\n");
    jsvalQuickjsInit();
    basic_init_jsval();
    std::string s;

    // right type
    s=evaljs("WithPrivateCtor.extractVal(WithPrivateCtor.create())");
    //printf("s: %s\n",s.c_str());
    assert(s=="777");

    // wrong type
    s=evaljs("WithPrivateCtor.extractVal(new Hello(123))");
    //printf("s: %s\n",s.c_str());
    assert(s=="-1");

    basic_exit();
    jsvalQuickjsExit();
}

void test_static_methods() {
    printf("- static methods.\n");
    jsvalQuickjsInit();
    basic_init_jsval();

//    auto s=evaljs("Hello.staticAddOne(5)");
    auto s=evaljs("Hello.staticAddOne(5)");
    assert(s=="6");

    //printf("objs: %d\n",basic_get_num_objects());

    basic_exit();
    jsvalQuickjsExit();
}

void test_refactor_obj() {
    printf("- another strategy for object ids.\n");
    jsvalQuickjsInit();
    basic_init_jsval();

    evaljs("globalThis.a=createHello()");
    evaljs("globalThis.b=createHello()");

    //printf("objs: %d\n",basic_get_num_objects());

    basic_exit();
    jsvalQuickjsExit();

    assert(basic_get_num_objects()==0);
}

void test_exceptions() {
    printf("- exceptions\n");
    jsvalQuickjsInit();
    basic_init_jsval();

    jsvalEval("1+1");
    assert(!jsvalHasException());
    jsvalEval("1++1");
    assert(jsvalHasException());
    std::string err=jsvalCatchExceptionStdString();
    assert(err=="SyntaxError: invalid increment/decrement operand");

    basic_exit();
    jsvalQuickjsExit();
}

void test_basic() {
    printf("- basic\n");
    jsvalQuickjsInit();
    basic_init_jsval();

    JSContext *ctx=jsvalQuickjsGetContext();

    char *t=jsvalGetStrdup(jsvalEval("hello(1,2)"));
    assert(!strcmp(t,"3"));
    free(t);

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
    basic_init_jsval();
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
    basic_init_jsval();
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
    basic_init_jsval();
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
    basic_init_jsval();
    std::string s;

    s=evaljs("hellos('a','b')");
    assert(s=="ab");

    basic_exit();
    jsvalQuickjsExit();
}

void test_buffers() {
    printf("- buffers\n");
    jsvalQuickjsInit();
    basic_init_jsval();
    std::string s;

    s=evaljs("globalThis.b=createBuffer(); globalThis.b");
    //printf("created: %s\n",s.c_str());
    assert(s=="11,22,33,44,55,66,77,88,99,0");

    s=evaljs("peekBuffer(globalThis.b,2)");
    //printf("read: %s\n",s.c_str());
    assert(s=="33");

    s=evaljs("peekBuffer(globalThis.b,4)");
    assert(s=="55");

    basic_exit();
    jsvalQuickjsExit();
}

void test_gc() {
    printf("- gc\n");
    jsvalQuickjsInit();
    JSContext *ctx=jsvalQuickjsGetContext();
    basic_init_jsval();
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

void test_borrowed_context() {
    printf("- borrowed context\n");
    JSRuntime *rt=JS_NewRuntime();
    JSContext *ctx=JS_NewContext(rt);
    basic_init(ctx);
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
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}

void test_microtasks() {
    printf("- microtasks...\n");
    jsvalQuickjsInit();
    basic_init_jsval();
    JSVAL v;

    jsvalEval("Promise.reject('bla').catch(()=>{}); undefined");
    for (int i=0; i<10; i++)
        jsvalQuickjsRunJobs();

    assert(!jsvalHasException());

    jsvalEval("globalThis.p=new Promise((res,rej)=>{globalThis.res=res; globalThis.rej=rej; }); undefined");
    jsvalEval("globalThis.rej('bla'); undefined");
    for (int i=0; i<10; i++)
        jsvalQuickjsRunJobs();

    /*assert(jsvalHasException());
    std::string e=jsvalCatchExceptionStdString();
    assert(e=="bla");

    jsvalEval("globalThis.p=new Promise((res,rej)=>{globalThis.res=res; globalThis.rej=rej; }); undefined");
    jsvalEval("globalThis.p.catch(()=>{}); undefined");
    jsvalEval("globalThis.rej('bla'); undefined");
    assert(!jsvalHasException());*/

    basic_exit();
    jsvalQuickjsExit();
    //printf("microtasks done...\n");
}

void test_promises() {
    printf("- promises...\n");
    theIntPromise=Promise<int>();

    jsvalQuickjsInit();
    basic_init_jsval();

    jsvalEvalChecked("getIntPromise().then(v=>globalThis.resto=v); undefined");
    jsvalQuickjsRunGc();

    theIntPromise.resolve(123);
    assert(evaljs("globalThis.resto")=="123");

    jsvalEvalChecked("getIntPromise().then(v=>globalThis.otherresto=v); undefined");
    assert(evaljs("globalThis.otherresto")=="123");

    theIntPromise=Promise<int>();
    jsvalEvalChecked("getIntPromise().catch(v=>globalThis.rejto=v); undefined");

    std::string str="nope";
    theIntPromise.reject(str);
    assert(evaljs("globalThis.rejto")=="nope");

    jsvalEvalChecked("getIntPromise().catch(v=>globalThis.otherrejto=v); undefined");
    assert(evaljs("globalThis.otherrejto")=="nope");

    basic_exit();
    jsvalQuickjsExit();
}

void test_promises_lifetime() {
    printf("- promises lifetime...\n");
    theIntPromise=Promise<int>();

    jsvalQuickjsInit();
    basic_init_jsval();

    jsvalEvalChecked("getIntPromise().then(v=>globalThis.resto=v); undefined");
    jsvalEvalChecked("getIntPromise().catch(v=>globalThis.reason=v); undefined");

    theIntPromise=Promise<int>();

    JSVAL v=jsvalEvalChecked("globalThis.reason");
    std::string s=jsvalToStdString(v);
    jsvalFree(v);
    assert(s=="lost promise");

    //printf("old one overwritten...\n");

    basic_exit();
    jsvalQuickjsExit();
}

void test_promises_types() {
    printf("- promise types...\n");
    theSimplePromise=Promise<std::shared_ptr<Simple>>();

    jsvalQuickjsInit();
    basic_init_jsval();

    jsvalEvalChecked("getSimplePromise().then(s=>globalThis.resto=s.getVal()); undefined");
    theSimplePromise.resolve(std::make_shared<Simple>(456));

    JSVAL v=jsvalEvalChecked("globalThis.resto");
    std::string s=jsvalToStdString(v);
    jsvalFree(v);
    assert(s=="456");


    basic_exit();
    jsvalQuickjsExit();
}

void test_promises_cpp() {
    printf("- promises work in cpp...\n");

    int result=0;
    Promise<int> intPromise=Promise<int>();
    intPromise.then([&result](int i){
        result=i;
    });

    intPromise.resolve(789);
    assert(result==789);

    result=0;
    intPromise.then([&result](int i){
        result=i;
    });

    assert(result==789);

    bool called=false;
    VoidPromise voidPromise;
    voidPromise.then([&called](){ called=true; });
    voidPromise.resolve();
    voidPromise.reject("hello");
    assert(called);
}