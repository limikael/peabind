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

JSVAL jsvalEval(const char *s);
char *jsvalReadString(JSVAL val, char *dest);
void jsvalFree(JSVAL val);
int jsvalGetSize(JSVAL cls);

void jsvalMqjsInit(size_t memsize, const JSSTDLibraryDef *stdlib_def);
void jsvalMqjsExit();
