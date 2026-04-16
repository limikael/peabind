#pragma once
#include <emscripten.h>
#include <cinttypes>

typedef int JSVAL;

typedef JSVAL JSVAL_FUNC(JSVAL thisobj, int argc, JSVAL *argv);
typedef void JSVAL_FINALIZER(JSVAL thisobj);
typedef uint64_t JSVAL_ID;

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

JS_IMPORT(jsvalUndefined) JSVAL jsvalUndefined();

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

}

// TODO
/*
bool jsvalNull()
bool jsvalUndefined()
bool jsvalTrue()
bool jsvalFalse()

bool jsvalGetBool(JSVAL b)
JSVAL jsvalCreateArray(int len);
void jsvalSetItemAt(JSVAL a, int index, JSVAL val);

bool jsvalIsInt(JSVAL v);
bool jsvalIsFloat(JSVAL v);
bool jsvalIsBool(JSVAL v);
bool jsvalIsNull(JSVAL v);
bool jsvalIsUndefined(JSVAL v);

char *jsvalReadBuffer(JSVAL s, char *dest);
JSVAL jsvalCreateBuffer(void *data, size_t size);

DONE:

x JSVAL jsvalCreateObject(int classId);
x JSVAL jsvalCreateFloat(float f);
x float jsvalGetFloat(JSVAL v);

*/