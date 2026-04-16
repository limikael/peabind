#pragma once
#include "quickjs.h"

typedef JSValue JSVAL;

typedef JSVAL JSVAL_FUNC(JSVAL thisobj, int argc, JSVAL *argv);
typedef void JSVAL_FINALIZER(JSVAL thisobj);
typedef uint64_t JSVAL_ID;

JSVAL jsvalFromQuickjs(JSValue val);
JSValue jsvalToQuickjs(JSVAL val);
/*void jsvalInit(JSContext *ctx);
void jsvalExit();*/

JSVAL jsvalGetGlobal();

JSVAL jsvalUndefined();
void *jsvalGetOpaque(JSVAL jsval);
void jsvalSetOpaque(JSVAL jsval, void *opaque);
JSVAL jsvalCreateObject(JSVAL classId);
int jsvalGetInt(JSVAL v);
float jsvalGetFloat(JSVAL o);
JSVAL jsvalCreateFloat(float f);
JSVAL jsvalCreateInt(int i);
JSVAL jsvalCreateFunc(JSVAL_FUNC *f);
void jsvalSetProp(JSVAL obj, const char *prop, JSVAL val);
JSVAL jsvalCreateClass(JSVAL_FUNC *ctor);
void jsvalSetProtoProp(JSVAL obj, const char *prop, JSVAL val);
void jsvalSetClassFinalizer(JSVAL cls, JSVAL_FINALIZER *f);
int jsvalGetSize(JSVAL cls);
JSVAL jsvalEval(const char *s);
char *jsvalGetStrdup(JSVAL val);
void jsvalFree(JSVAL val);
char *jsvalReadString(JSVAL s, char *dest);
JSVAL jsvalCreateString(const char *s);
JSVAL jsvalDup(JSVAL v);
JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, int argc, JSVAL *argv);
JSVAL_ID jsvalGetObjectId(JSVAL v);

void jsvalQuickjsInit();
void jsvalQuickjsExit();
void jsvalQuickjsRunGc();
JSContext *jsvalQuickjsGetContext();
