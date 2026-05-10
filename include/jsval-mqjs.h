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
typedef JSVAL JSVAL_FUNC(JSVAL thisobj, int argc, JSVAL *argv);

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

void jsvalMqjsInit(size_t memsize, const JSSTDLibraryDef *stdlib_def);
void jsvalMqjsInitBorrowed(JSContext *ctx);
void jsvalMqjsExit();
JSContext *jsvalMqjsGetContext();
