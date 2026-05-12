#include "jsval-mqjs.h"
#include <cassert>
#include <cstdlib>
#include <cstring>
#include <cstdio>

static JSContext *jsvalCtx=NULL;
static bool jsvalCtxBorrowed;
static bool jsvalSeenException;
void *jsvalMem=NULL;
void *jsvalFinalizingOpaque=NULL;
int jsvalRefCount=0;
int jsvalNextId=1;

void jsvalMqjsInitBorrowed(JSContext *ctx) {
    assert(jsvalCtx==NULL);
    jsvalCtxBorrowed=true;
    jsvalSeenException=false;
    jsvalCtx=ctx;
    jsvalFinalizingOpaque=NULL;
    jsvalRefCount=0;
    jsvalNextId=1;
}

void jsvalMqjsInit(size_t memsize, const JSSTDLibraryDef *stdlib_def) {
    assert(jsvalCtx==NULL);
    jsvalCtxBorrowed=false;
    jsvalSeenException=false;
    jsvalMem=malloc(memsize);
    jsvalCtx=JS_NewContext(jsvalMem,memsize,stdlib_def);
    jsvalFinalizingOpaque=NULL;
    jsvalRefCount=0;
    jsvalNextId=1;
}

void jsvalMqjsExit() {
    assert(jsvalCtx!=NULL);
    assert(jsvalRefCount==0);

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
    //printf("evaled...\n");
    if (JS_IsException(val)) {
        //printf("it is an exception!!!\n");
        jsvalSeenException=true;
    }

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

JSVAL jsvalToString(JSVAL s) {
    return JS_ToString(jsvalCtx,s);
}

void *jsvalReadBuffer(JSVAL v, void *buf) {
    assert(0 && "fix buffer!!!");
}

JSVAL jsvalCatchException() {
    JSVAL ex=JS_GetException(jsvalCtx);
    jsvalSeenException=false;

    return ex;
}

float jsvalGetFloat(JSVAL v) {
    double f;
    JS_ToNumber(jsvalCtx,&f,v);
    return f;
}

JSVAL jsvalCreateFloat(float f) {
    return JS_NewFloat64(jsvalCtx,f);
}

JSVAL jsvalCreateString(const char *s) {
    return JS_NewString(jsvalCtx,s);
}

void jsvalSetOpaque(JSVAL jsval, void *opaque) {
    JS_SetOpaque(jsvalCtx,jsval,opaque);
}

void *jsvalGetOpaque(JSVAL jsval) {
    if (jsvalFinalizingOpaque) {
        assert(JS_IsUndefined(jsval));
        return jsvalFinalizingOpaque;
    }

    return JS_GetOpaque(jsvalCtx,jsval);
}

JSVAL jsvalUndefined() {
    return JS_UNDEFINED;
}

bool jsvalHasException() {
    if (jsvalSeenException)
        return true;

    JSValue currentException=JS_GetException(jsvalCtx);
    if (!JS_IsUndefined(currentException)) {
        jsvalSeenException=true;
        JS_Throw(jsvalCtx,currentException);
        return true;
    }

    return false;
}

void jsvalMqjsSetFinalizingOpaque(void *p) {
    jsvalFinalizingOpaque=p;
}

JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, int argc, JSVAL *argv) {
    if (JS_StackCheck(jsvalCtx, argc+2))
        return jsvalThrow("out of memory");

    for(int i=argc-1; i>=0; i--)
        JS_PushArg(jsvalCtx,argv[i]);

    JS_PushArg(jsvalCtx,fn);
    JS_PushArg(jsvalCtx,thisobj);
    return JS_Call(jsvalCtx,argc);
}

void jsvalQuickjsRunGc() {
    JS_GC(jsvalCtx);
}

JSVAL_REF jsvalRefCreate(JSVAL v) {
    JSGCRef *gcRef=(JSGCRef *)malloc(sizeof(JSGCRef));
    JS_AddGCRef(jsvalCtx,gcRef);
    gcRef->val=v;
    jsvalRefCount++;

    return gcRef;
}

void jsvalRefFree(JSVAL_REF ref) {
    JSGCRef *gcRef=ref;
    JS_DeleteGCRef(jsvalCtx,gcRef);
    free(gcRef);
    jsvalRefCount--;
}

JSVAL jsvalRefGetValue(JSVAL_REF ref) {
    JSGCRef *gcRef=ref;
    return gcRef->val;
}

JSVAL_ID jsvalGetObjectId(JSVAL obj) {
    JSVAL idval=JS_GetPropertyStr(jsvalCtx,obj,"__jsval_id");
    if (JS_IsUndefined(idval)) {
        idval=jsvalCreateInt(jsvalNextId++);
        JS_SetPropertyStr(jsvalCtx,obj,"__jsval_id",idval);
    }

    return jsvalGetInt(idval);
}

int jsvalInstanceOf(JSVAL v, JSVAL cls) {
    return (JS_GetClassID(jsvalCtx,v)==jsvalGetInt(cls));

    //printf("instanceof v...%d\n",JS_GetClassID(jsvalCtx,v));
    //printf("instanceof cls...%d\n",jsvalGetInt(cls));
    //abort();
    //return 0;
}
