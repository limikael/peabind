#include "jsval-mqjs.h"
#include <cassert>
#include <cstdlib>
#include <cstring>

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
    jsvalCtx=NULL;
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

