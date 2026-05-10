#include "jsval-mqjs.h"
#include <cassert>
#include <cstdlib>
#include <cstring>
#include <cstdio>

static JSContext *jsvalCtx=NULL;
static bool jsvalCtxBorrowed;
void *jsvalMem=NULL;

void jsvalMqjsInitBorrowed(JSContext *ctx) {
    assert(jsvalCtx==NULL);
    jsvalCtxBorrowed=true;
    jsvalCtx=ctx;
}

void jsvalMqjsInit(size_t memsize, const JSSTDLibraryDef *stdlib_def) {
    assert(jsvalCtx==NULL);
    jsvalCtxBorrowed=false;
    jsvalMem=malloc(memsize);
    jsvalCtx=JS_NewContext(jsvalMem,memsize,stdlib_def);
}

void jsvalMqjsExit() {
    assert(jsvalCtx!=NULL);
    if (!jsvalCtxBorrowed) {
        JS_FreeContext(jsvalCtx);
        free(jsvalMem);
    }
    jsvalCtx=NULL;
}

JSContext *jsvalMqjsGetContext() {
    assert(jsvalCtx!=NULL);
    return jsvalCtx;
}

JSVAL jsvalEval(const char *s) {
    JSValue val=JS_Eval(jsvalCtx,s,strlen(s),"<inline>",JS_EVAL_RETVAL);
    return val;
}

char *jsvalReadString(JSVAL val, char *dest) {
    JSCStringBuf stringBuf;

    const char *tmp=JS_ToCString(jsvalCtx,val,&stringBuf);
    strcpy(dest,tmp);

    return dest;
}

// fix!!! when fixing dup
void jsvalFree(JSVAL val) {
}

int jsvalGetSize(JSVAL value) {
    if (JS_GetClassID(jsvalCtx,value)==JS_CLASS_ARRAY) {
        JSValue lenVal = JS_GetPropertyStr(jsvalCtx, value, "length");
        uint32_t len = 0;
        JS_ToUint32(jsvalCtx, &len, lenVal);
        return len;
    }

    if (JS_IsString(jsvalCtx,value)) {
        JSCStringBuf stringBuf;
        const char *tmp=JS_ToCString(jsvalCtx,value,&stringBuf);
        return strlen(tmp);
    }

    /*if (JS_IsInstanceOf(jsvalCtx,value,Uint8Array_ctor)) {
        size_t offs,len,perElem;
        JSValue buf=JS_GetTypedArrayBuffer(jsvalCtx,value,&offs,&len,&perElem);
        JS_FreeValue(jsvalCtx,buf);
        //printf("yep it is, size=%d\n",byte_length);
        return len;
    }*/

    return -1;
}

JSVAL jsvalNull() {
    return JS_NULL;
}

JSVAL jsvalGetGlobal() {
    return JS_GetGlobalObject(jsvalCtx);
}

JSVAL jsvalThrow(const char *s) {
    printf("implement!!!!");
    assert(0);
}

int jsvalGetInt(JSVAL v) {
    int32_t i;
    JS_ToInt32(jsvalCtx,&i,v);
    return i;
}

JSVAL jsvalCreateInt(int i) {
    return JS_NewInt32(jsvalCtx,i);
}
