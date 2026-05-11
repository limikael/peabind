#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <cassert>
#include <string>
#include "jsval.h"
#include "jsval-util.h"
#include "test-jsval-mqjs.bindings.out.h"

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

void test_jsval_mqjs_basic() {
    printf("- test mquickjs basic\n");

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEval("1+2");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="3");

    jsvalMqjsExit();
}

void test_jsval_mqjs_borrow() {
    printf("- test mquickjs borrowed context\n");
    void *mem;
    JSContext *ctx;

    mem=malloc(MEMSIZE);
    ctx=JS_NewContext(mem,MEMSIZE,&js_stdlib);
    jsvalMqjsInitBorrowed(ctx);

    JSVAL v=jsvalEval("1+2");
    char s[256];
    jsvalReadString(v,s);
    assert(std::string(s)=="3");

    jsvalMqjsExit();
    JS_FreeContext(ctx);
    free(mem);
}

void test_jsval_size() {
    printf("- test getting size\n");

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEval("[1,2,3]");
    assert(jsvalGetSize(v)==3);
    jsvalFree(v);

    JSVAL s=jsvalEval("\"hello\"");
    assert(jsvalGetSize(s)==5);
    jsvalFree(s);

    jsvalMqjsExit();
}

class Hello {
public:
    int val;
};

JSVAL Hello_getVal(JSVAL thisobj, int argc, JSVAL *argv) {
    Hello *h=(Hello *)jsvalGetOpaque(thisobj);
    return jsvalCreateInt(h->val);
}

JSVAL Hello_setVal(JSVAL thisobj, int argc, JSVAL *argv) {
    Hello *h=(Hello *)jsvalGetOpaque(thisobj);
    h->val=jsvalGetInt(argv[0]);
    return jsvalUndefined();
}

JSVAL helloaddimpl(JSVAL thisobj, int argc, JSVAL *argv) {
    return jsvalCreateInt(jsvalGetInt(argv[0])+jsvalGetInt(argv[1]));
}

JSVAL Hello_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
    Hello *h=new Hello();
    //printf("in the ctor... %p\n",h);
    h->val=777;
    jsvalSetOpaque(thisobj,h);
    return thisobj;
}

void Hello_finalizer(JSVAL thisobj) {
    Hello *h=(Hello *)jsvalGetOpaque(thisobj);
    //printf("in the dtor... %p\n",h);
    delete h;
}

JSVAL Hello_helloStatic(JSVAL thisobj, int argc, JSVAL *argv) {
    return jsvalCreateInt(1234);
}

void test_jsval_mqjs_bindings() {
    printf("- test jsval mqjs bindings\n");
    std::string s;

    jsvalMqjsInit(65536,&js_stdlib);

    JSVAL v=jsvalEvalChecked("helloadd(100,23)");
    assert(jsvalToStdString(v)=="123");

    jsvalEvalChecked("globalThis.h1=new Hello()");
    jsvalEvalChecked("globalThis.h1.setVal(999)");
    jsvalEvalChecked("globalThis.h2=new Hello()");
    jsvalEvalChecked("globalThis.h2.setVal(888)");

    assert(jsvalToStdString(jsvalEvalChecked("globalThis.h1.getVal()"))=="999");
    assert(jsvalToStdString(jsvalEvalChecked("globalThis.h2.getVal()"))=="888");

    v=jsvalEvalChecked("Hello.helloStatic()");
    assert(jsvalToStdString(v)=="1234");

    jsvalMqjsExit();
}

int main() {
    printf("Running mquickjs jsval tests...\n");

    test_jsval_mqjs_basic();
    test_jsval_size();
    test_jsval_mqjs_borrow();
    test_jsval_mqjs_bindings();

    return 0;
}