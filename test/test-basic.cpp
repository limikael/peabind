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

void test_basic() {
    printf("- basic\n");

    JSRuntime *rt=JS_NewRuntime();
    JSContext *ctx=JS_NewContext(rt);

    basic_init(ctx);

    std::string s=runjs(ctx,"\
        let h=new Hello();\
        let h2=createHello();\
        let callret=hello(1,2);\
        let v=h.getVal();\
        h.setVal(999);\
        let v2=h.getVal();\
        setHelloVal(h,555);\
        let v3=h.getVal();\
        let v4=h2.getVal();\
        JSON.stringify([h._handle,callret,v,v2,v3,v4]);\
    ");
    //,FinalizationRegistry.toString()
    //,WeakRef.toString()
    //std::string s=runjs(ctx,"hello(1,2); ");
    //printf("s: %s\n",s.c_str());
    assert(s=="[1,3,100,999,555,666]");

    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}

void test_events() {
    printf("- events\n");
    JSRuntime *rt=JS_NewRuntime();
    JSContext *ctx=JS_NewContext(rt);
    basic_init(ctx);
    std::string s;

    s=runjs(ctx,"globalThis.h=new Hello();");
    s=runjs(ctx,"globalThis.h.on('data',(v1,v2)=>{globalThis.captured1=v1; globalThis.captured2=v2;});");
    s=runjs(ctx,"globalThis.h.emitData(1234,9999);");
    s=runjs(ctx,"JSON.stringify([globalThis.captured1,globalThis.captured2])");
    assert(s=="[1234,9999]");

    basic_exit(ctx);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}