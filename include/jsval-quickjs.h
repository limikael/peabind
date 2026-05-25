#pragma once

#ifdef __cplusplus
extern "C" {
#endif
#include "quickjs.h"
#ifdef __cplusplus
}
#endif

typedef JSValue JSVAL;

class JsvalRef {
public:
    JsvalRef(JSVAL value_) { value=value_; };
    JSVAL value;
};

typedef JsvalRef *JSVAL_REF;
typedef JSVAL JSVAL_FUNC(JSVAL thisobj, int argc, JSVAL *argv);
typedef void JSVAL_FINALIZER(JSVAL thisobj);
typedef uint64_t JSVAL_ID;

JSVAL jsvalGetGlobal();
JSVAL jsvalUndefined();
JSVAL jsvalNull();
void *jsvalGetOpaque(JSVAL jsval);
void jsvalSetOpaque(JSVAL jsval, void *opaque);
JSVAL jsvalCreateObject(JSVAL classId);
int jsvalGetInt(JSVAL v);
float jsvalGetFloat(JSVAL o);
JSVAL jsvalCreateFloat(float f);
JSVAL jsvalCreateInt(int i);
JSVAL jsvalCreateFunc(JSVAL_FUNC *f);
JSVAL jsvalCreateBuffer(uint8_t *data, size_t size);
void jsvalSetProp(JSVAL obj, const char *prop, JSVAL val);
JSVAL jsvalGetProp(JSVAL obj, const char *prop);
JSVAL jsvalCreateClass(JSVAL_FUNC *ctor);
void jsvalSetProtoProp(JSVAL obj, const char *prop, JSVAL val);
void jsvalSetClassFinalizer(JSVAL cls, JSVAL_FINALIZER *f);
int jsvalGetSize(JSVAL cls);
JSVAL jsvalEval(const char *s);
char *jsvalGetStrdup(JSVAL val);
void jsvalFree(JSVAL val);
char *jsvalReadString(JSVAL s, char *dest);
void *jsvalReadBuffer(JSVAL v, void *buf);
JSVAL jsvalCreateString(const char *s);
JSVAL jsvalDup(JSVAL v);
JSVAL jsvalGetItemAt(JSVAL v, int index);
JSVAL jsvalCreatePromiseCapability();
JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, int argc, JSVAL *argv);
JSVAL_ID jsvalGetObjectId(JSVAL v);
bool jsvalHasException();
JSVAL jsvalCatchException();
JSVAL jsvalToString(JSVAL s);
JSVAL jsvalThrow(const char *s);
int jsvalInstanceOf(JSVAL v, JSVAL cls);
JSVAL_REF jsvalRefCreate(JSVAL v);
void jsvalRefFree(JSVAL_REF ref);
JSVAL jsvalRefGetValue(JSVAL_REF ref);

JSVAL jsvalFromQuickjs(JSValue val);
JSValue jsvalToQuickjs(JSVAL val);
void jsvalQuickjsInit();
void jsvalQuickjsInitBorrowed(JSContext *ctx);
void jsvalQuickjsExit();
void jsvalQuickjsRunGc();
JSContext *jsvalQuickjsGetContext();
void jsvalQuickjsRunJobs();
