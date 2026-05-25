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
JS_IMPORT(jsvalGetIntBoxed) int jsvalGetIntBoxed(JSVAL o);
JS_IMPORT(jsvalGetFloat) float jsvalGetFloat(JSVAL o);
JS_IMPORT(jsvalCreateFuncStub) JSVAL jsvalCreateFuncStub();
JS_IMPORT(jsvalCreateClassStub) JSVAL jsvalCreateClassStub();
JS_IMPORT(jsvalCreateIntBoxed) JSVAL jsvalCreateIntBoxed(int i);
JS_IMPORT(jsvalCreateFloat) JSVAL jsvalCreateFloat(float f);
JS_IMPORT(jsvalCreateArray) JSVAL jsvalCreateArray(int size);
JS_IMPORT(jsvalCreateBuffer) JSVAL jsvalCreateBuffer(uint8_t *data, size_t size);
JS_IMPORT(jsvalReadString) char *jsvalReadString(JSVAL s, char *dest);
JS_IMPORT(jsvalReadBuffer) void *jsvalReadBuffer(JSVAL v, void *buf);
JS_IMPORT(jsvalDupBoxed) JSVAL jsvalDupBoxed(JSVAL id);
JS_IMPORT(jsvalFreeBoxed) void jsvalFreeBoxed(JSVAL id);
JS_IMPORT(jsvalThrow) JSVAL jsvalThrow(const char *s);
JS_IMPORT(jsvalUndefined) JSVAL jsvalUndefined();
JS_IMPORT(jsvalNull) JSVAL jsvalNull();
JS_IMPORT(jsvalInstanceOf) int jsvalInstanceOf(JSVAL v, JSVAL cls);
JS_IMPORT(jsvalToString) JSVAL jsvalToString(JSVAL s);

// Tagged small-int encoding. Bit 31 set => low 31 bits are a signed int
// (sign-extended from bit 30). Range [-2^30, 2^30-1]. Bit 31 clear =>
// registry handle (existing host-allocated boxed value). Eliminates the
// host call + registry allocation for small ints crossing C++<->JS.
static inline bool jsvalIsTaggedInt(JSVAL v) { return v < 0; }
static inline bool jsvalIntFits(int i) {
    return i >= -(1 << 30) && i < (1 << 30);
}
static inline JSVAL jsvalTagInt(int i) {
    return (JSVAL)(0x80000000u | ((uint32_t)i & 0x7FFFFFFFu));
}
static inline int jsvalUntagInt(JSVAL v) {
    return (int32_t)((uint32_t)v << 1) >> 1;
}

static inline JSVAL jsvalCreateInt(int i) {
    if (jsvalIntFits(i)) return jsvalTagInt(i);
    return jsvalCreateIntBoxed(i);
}
static inline int jsvalGetInt(JSVAL v) {
    if (jsvalIsTaggedInt(v)) return jsvalUntagInt(v);
    return jsvalGetIntBoxed(v);
}
static inline JSVAL jsvalDup(JSVAL v) {
    if (v == 0 || jsvalIsTaggedInt(v)) return v;
    return jsvalDupBoxed(v);
}
static inline void jsvalFree(JSVAL v) {
    if (v == 0 || jsvalIsTaggedInt(v)) return;
    jsvalFreeBoxed(v);
}

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

// FIX FIX ...

static int jsvalHasException() {
    return false;
}

static JSVAL jsvalCatchException() {
    assert(0);
    return 0;
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