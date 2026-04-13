#pragma once
#include <emscripten.h>

typedef int JSVAL;

typedef JSVAL JSVAL_FUNC(JSVAL thisobj, JSVAL args);

#define JS_IMPORT(name) \
    __attribute__((import_module("env"), import_name(#name))) \
    extern

JS_IMPORT(jsvalGetSize) JSVAL jsvalGetSize(JSVAL v);
JS_IMPORT(jsvalGetItemAt) JSVAL jsvalGetItemAt(JSVAL v, int index);
JS_IMPORT(jsvalCall) JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, JSVAL args);
JS_IMPORT(jsvalCreateString) JSVAL jsvalCreateString(const char *p);
JS_IMPORT(jsvalSetPropJsval) JSVAL jsvalSetPropJsval(JSVAL o, JSVAL prop, JSVAL val);
JS_IMPORT(jsvalGetInt) JSVAL jsvalGetInt(JSVAL o);
JS_IMPORT(jsvalGetModule) JSVAL jsvalGetModule();
JS_IMPORT(jsvalCreateFuncStub) JSVAL jsvalCreateFuncStub();
JS_IMPORT(jsvalCreateInt) JSVAL jsvalCreateInt(int i);
JS_IMPORT(jsvalReadString) char *jsvalReadString(JSVAL s, char *dest);

extern "C" {

JSVAL jsvalCreateFunc(JSVAL_FUNC *f);
JSVAL jsvalCallNative(JSVAL func, JSVAL thisobj, JSVAL params);
void jsvalSetProp(JSVAL o, const char *s, JSVAL val);
JSVAL *jsvalReadArray(JSVAL a, JSVAL *dest);

}