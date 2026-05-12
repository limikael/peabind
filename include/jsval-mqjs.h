#pragma once
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif
#include <mquickjs.h>
#ifdef __cplusplus
}
#endif

typedef JSValue JSVAL;
typedef JSGCRef *JSVAL_REF;
typedef int JSVAL_ID;
typedef JSVAL JSVAL_FUNC(JSVAL thisobj, int argc, JSVAL *argv);
typedef void JSVAL_FINALIZER(JSVAL thisobj);

JSVAL jsvalEval(const char *s);
char *jsvalReadString(JSVAL val, char *dest);
void jsvalFree(JSVAL val);
int jsvalGetSize(JSVAL cls);
JSVAL jsvalNull();
JSVAL jsvalGetGlobal();
JSVAL jsvalCreateInt(int i);
JSVAL jsvalCreateFunc(JSVAL_FUNC *f);
int jsvalInstanceOf(JSVAL v, JSVAL cls);
void *jsvalGetOpaque(JSVAL jsval);
JSVAL jsvalCreateObject(JSVAL classId);
int jsvalGetInt(JSVAL v);
void jsvalSetProp(JSVAL obj, const char *prop, JSVAL val);
void jsvalSetOpaque(JSVAL jsval, void *opaque);
JSVAL jsvalThrow(const char *s);
JSVAL jsvalToString(JSVAL s);
void *jsvalReadBuffer(JSVAL v, void *buf);
JSVAL jsvalCatchException();
float jsvalGetFloat(JSVAL o);
JSVAL jsvalCreateFloat(float f);
JSVAL jsvalCreateString(const char *s);
JSVAL jsvalUndefined();
bool jsvalHasException();
JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, int argc, JSVAL *argv);
JSVAL_REF jsvalRefCreate(JSVAL v);
void jsvalRefFree(JSVAL_REF ref);
JSVAL jsvalRefGetValue(JSVAL_REF ref);
JSVAL_ID jsvalGetObjectId(JSVAL v);

void jsvalMqjsInit(size_t memsize, const JSSTDLibraryDef *stdlib_def);
void jsvalMqjsInitBorrowed(JSContext *ctx);
void jsvalMqjsExit();
void jsvalMqjsSetFinalizingOpaque(void *);
JSContext *jsvalMqjsGetContext();
void jsvalQuickjsRunGc();
