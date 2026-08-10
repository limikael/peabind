#pragma once
#include <emscripten.h>
#include <cinttypes>
#include <cassert>

typedef int JSVAL;

class JsvalRef {
public:
    JsvalRef(JSVAL value_) { value=value_; };
    JSVAL value;
};

typedef JSVAL JSVAL_FUNC(JSVAL thisobj, int argc, JSVAL *argv);
typedef void JSVAL_FINALIZER(JSVAL thisobj);
typedef uint64_t JSVAL_ID;
typedef JsvalRef *JSVAL_REF;

#define JS_IMPORT(name) \
    __attribute__((import_module("env"), import_name(#name))) \
    extern

JS_IMPORT(jsvalGetSize) JSVAL jsvalGetSize(JSVAL v);
JS_IMPORT(jsvalGetItemAt) JSVAL jsvalGetItemAt(JSVAL v, int index);
JS_IMPORT(jsvalSetItemAt) JSVAL jsvalSetItemAt(JSVAL v, int index, JSVAL item);
JS_IMPORT(jsvalCallArray) JSVAL jsvalCallArray(JSVAL fn, JSVAL thisobj, JSVAL args);
JS_IMPORT(jsvalCreateString) JSVAL jsvalCreateString(const char *p);
JS_IMPORT(jsvalCreateObject) JSVAL jsvalCreateObject(JSVAL classId);
JS_IMPORT(jsvalSetPropJsval) JSVAL jsvalSetPropJsval(JSVAL o, JSVAL prop, JSVAL val);
JS_IMPORT(jsvalGetPropJsval) JSVAL jsvalGetPropJsval(JSVAL o, JSVAL prop);
JS_IMPORT(jsvalGetInt) int jsvalGetInt(JSVAL o);
JS_IMPORT(jsvalGetFloat) float jsvalGetFloat(JSVAL o);
JS_IMPORT(jsvalCreateFuncStub) JSVAL jsvalCreateFuncStub();
JS_IMPORT(jsvalCreateClassStub) JSVAL jsvalCreateClassStub();
JS_IMPORT(jsvalCreateInt) JSVAL jsvalCreateInt(int i);
JS_IMPORT(jsvalCreateFloat) JSVAL jsvalCreateFloat(float f);
JS_IMPORT(jsvalCreateArray) JSVAL jsvalCreateArray(int size);
JS_IMPORT(jsvalCreateBuffer) JSVAL jsvalCreateBuffer(uint8_t *data, size_t size);
JS_IMPORT(jsvalReadString) char *jsvalReadString(JSVAL s, char *dest);
JS_IMPORT(jsvalReadBuffer) void *jsvalReadBuffer(JSVAL v, void *buf);
JS_IMPORT(jsvalDup) JSVAL jsvalDup(JSVAL id);
JS_IMPORT(jsvalFree) void jsvalFree(JSVAL id);
JS_IMPORT(jsvalThrow) JSVAL jsvalThrow(const char *s);
JS_IMPORT(jsvalUndefined) JSVAL jsvalUndefined();
JS_IMPORT(jsvalNull) JSVAL jsvalNull();
JS_IMPORT(jsvalInstanceOf) int jsvalInstanceOf(JSVAL v, JSVAL cls);
JS_IMPORT(jsvalToString) JSVAL jsvalToString(JSVAL s);

extern "C" {

JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, int argc, JSVAL *argv);
JSVAL jsvalCreateFunc(JSVAL_FUNC *f);
JSVAL jsvalCreateClass(JSVAL_FUNC *f);
JSVAL jsvalCallNative(JSVAL func, JSVAL thisobj, JSVAL params);
void jsvalSetProp(JSVAL o, const char *s, JSVAL val);
void jsvalSetProtoProp(JSVAL o, const char *s, JSVAL val);
JSVAL *jsvalReadArray(JSVAL a, JSVAL *dest);
void jsvalSetInternalOpaque(JSVAL v, void *opaque);
void *jsvalGetInternalOpaque(JSVAL v);
void jsvalSetOpaque(JSVAL v, void *opaque);
void *jsvalGetOpaque(JSVAL v);
void jsvalNotifyFinalize(JSVAL clsid, JSVAL oid);
void jsvalSetClassFinalizer(JSVAL clsid, JSVAL_FINALIZER *f);
JSVAL_ID jsvalGetObjectId(JSVAL v);
JSVAL_REF jsvalRefCreate(JSVAL v);
void jsvalRefFree(JSVAL_REF ref);
JSVAL jsvalRefGetValue(JSVAL_REF ref);

}

static int jsvalHasException() {
    return false;
}

static JSVAL jsvalCatchException() {
    assert(0);
    return 0;
}