#include "jsval-mqjs.h"
#include <cassert>
#include <cstdlib>

static JSContext *jsvalCtx=NULL;
void *jsvalMem=NULL;

void jsvalMqjsInit(size_t memsize, const JSSTDLibraryDef *stdlib_def) {
    assert(jsvalCtx==NULL);
    jsvalMem=malloc(memsize);
    jsvalCtx=JS_NewContext(jsvalMem,memsize,stdlib_def);
}

void jsvalMqjsExit() {
    assert(jsvalCtx!=NULL);
    JS_FreeContext(jsvalCtx);
    free(jsvalMem);
}
