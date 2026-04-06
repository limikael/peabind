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
        let callret=hello(1,2);\
        let v=h.getVal();\
        h.setVal(999);\
        let v2=h.getVal();\
        JSON.stringify([h._handle,callret,v,v2]);\
    ");
    //std::string s=runjs(ctx,"hello(1,2); ");
    printf("s: %s\n",s.c_str());
    assert(s=="[1,3,100,999]");

    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}