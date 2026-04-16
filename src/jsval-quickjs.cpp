#include "jsval-quickjs.h"
#include <map>
#include <cstdio>
#include <cstdlib>
#include <cassert>

static JSContext *jsvalCtx=NULL;
static JSRuntime *jsvalRt=NULL;

static std::map<int,JSVAL_FUNC *> functions;
static std::map<JSVAL_FUNC *,JSClassID> classIdByCtor;
static std::map<JSClassID,JSVAL_FINALIZER *> finalizerByClassId;
static int nextFunctionId=1;
static JSVAL jsvalGlobal;

void jsvalQuickjsInit() {
	assert(jsvalCtx==NULL);
	assert(jsvalRt==NULL);

    jsvalRt=JS_NewRuntime();
    jsvalCtx=JS_NewContext(jsvalRt);
    jsvalGlobal=JS_GetGlobalObject(jsvalCtx);
}

void jsvalQuickjsExit() {
	assert(jsvalCtx!=NULL);
	assert(jsvalRt!=NULL);

	JS_FreeValue(jsvalCtx,jsvalGlobal);
    JS_FreeContext(jsvalCtx);
    JS_FreeRuntime(jsvalRt);

    jsvalCtx=NULL;
    jsvalRt=NULL;
}

JSContext *jsvalQuickjsGetContext() {
	assert(jsvalCtx!=NULL);
	return jsvalCtx;
}

JSVAL jsvalGetGlobal() {
	assert(jsvalCtx!=NULL);
	return jsvalGlobal;
}

JSVAL jsvalEval(const char *code) {
    JSValue result=JS_Eval(jsvalCtx,
        code,
        strlen(code),
        "<code>",
        JS_EVAL_TYPE_GLOBAL
    );

    assert(!JS_IsException(result));
    return result;
}

JSVAL jsvalUndefined() {
	return JS_UNDEFINED;
}

JSVAL jsvalFromQuickjs(JSValue val) {
	return val;
}

JSValue jsvalToQuickjs(JSVAL val) {
	return val;
}

void *jsvalGetOpaque(JSVAL jsval) {
	JSValue v=jsvalToQuickjs(jsval);
	JSClassID classId;
	void *opaque=JS_GetAnyOpaque(jsval,&classId);
	return opaque;
}

void jsvalSetOpaque(JSVAL jsval, void *opaque) {
	JS_SetOpaque(jsval,opaque);
}

int jsvalGetInt(JSVAL v) {
	int i;
	JS_ToInt32(jsvalCtx,&i,v);
	return i;
}

JSVAL jsvalCreateInt(int i) {
	return JS_NewInt32(jsvalCtx,i);
}

static JSValue funcTrampoline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, int magic) {
	return functions[magic](this_val,argc,argv);
}

JSVAL jsvalCreateFunc(JSVAL_FUNC *f) {
	int magic=nextFunctionId++;
	functions[magic]=f;
	return JS_NewCFunctionMagic(jsvalCtx,funcTrampoline,"fn",0,JS_CFUNC_generic_magic,magic);
}

void jsvalSetProp(JSVAL obj, const char *prop, JSVAL val) {
	JS_SetPropertyStr(jsvalCtx,obj,prop,val);
}

static JSValue ctorTrampoline(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, int magic) {
	JSVAL_FUNC *f=functions[magic];
	JSClassID classId=classIdByCtor[f];
    JSValue obj=JS_NewObjectClass(jsvalCtx,classId);
    f(obj,argc,argv);
    return obj;
}

static void finalizerTrampoline(JSRuntime *rt, JSValue val) {
	JSClassID classId=JS_GetClassID(val);
	if (finalizerByClassId.contains(classId)) {
		JSVAL_FINALIZER *f=finalizerByClassId[classId];
		f(val);
	}
}

JSVAL jsvalCreateClass(JSVAL_FUNC *ctorfunc) {
	int magic=nextFunctionId++;
	functions[magic]=ctorfunc;

	if (!classIdByCtor.contains(ctorfunc)) {
		JSClassID createClassId;
		JS_NewClassID(&createClassId);
		classIdByCtor[ctorfunc]=createClassId;
		//printf("create classid: %d\n",createClassId);
	}

	JSClassID classId=classIdByCtor[ctorfunc];
	if (!JS_IsRegisteredClass(JS_GetRuntime(jsvalCtx),classId)) {
	    JSClassDef def={.class_name="My", .finalizer=finalizerTrampoline};
		JS_NewClass(JS_GetRuntime(jsvalCtx),classId,&def);
		//printf("reg class in rt...\n");
	}

	JSValue proto=JS_NewObject(jsvalCtx);
	JS_SetClassProto(jsvalCtx,classId,proto);
	JSValue ctor=JS_NewCFunctionMagic(jsvalCtx,ctorTrampoline,"ctor",0,JS_CFUNC_constructor_magic,magic);
    JS_SetConstructor(jsvalCtx,ctor,proto);
	JS_SetPropertyStr(jsvalCtx,ctor,"__classId",JS_NewInt32(jsvalCtx, classId));

    return ctor;
}

void jsvalSetProtoProp(JSVAL obj, const char *prop, JSVAL val) {
	JSValue proto=JS_GetPropertyStr(jsvalCtx, obj, "prototype");
	JS_SetPropertyStr(jsvalCtx,proto,prop,val);
	JS_FreeValue(jsvalCtx,proto);
}

void jsvalSetClassFinalizer(JSVAL cls, JSVAL_FINALIZER *f) {
	JSValue classIdProp=JS_GetPropertyStr(jsvalCtx,cls,"__classId");
	JSClassID classId;
	JS_ToUint32(jsvalCtx,&classId,classIdProp);

	finalizerByClassId[classId]=f;

	//printf("settng finalizer for: %d\n",classId);
}

float jsvalGetFloat(JSVAL v) {
	double f;
	JS_ToFloat64(jsvalCtx,&f,v);
	return f;
}

JSVAL jsvalCreateFloat(float f) {
	return JS_NewFloat64(jsvalCtx,f);
}

JSVAL jsvalCreateObject(JSVAL cls) {
	JSValue classIdProp=JS_GetPropertyStr(jsvalCtx,cls,"__classId");
	JSClassID classId;
	JS_ToUint32(jsvalCtx,&classId,classIdProp);

	//printf("create obj of class: %d\n",classId);

    JSValue obj=JS_NewObjectClass(jsvalCtx,classId);
    return obj;
}

int jsvalGetSize(JSVAL obj) {
	JSValue value=jsvalToQuickjs(obj);

	if (JS_IsArray(jsvalCtx,value)) {
	    JSValue lenVal = JS_GetPropertyStr(jsvalCtx, value, "length");
	    uint32_t len = 0;

	    if (!JS_IsException(lenVal)) {
	        JS_ToUint32(jsvalCtx, &len, lenVal);
	    }

	    JS_FreeValue(jsvalCtx, lenVal);
	    return len;
	}

	if (JS_IsString(value)) {
		size_t len;
		const char* str = JS_ToCStringLen(jsvalCtx, &len, value);
		JS_FreeCString(jsvalCtx, str);
		return len;
	}

	return -1;
}

char *jsvalGetStrdup(JSVAL val) {
    const char *tmp=JS_ToCString(jsvalCtx,val);
    char *s=strdup(tmp);
    JS_FreeCString(jsvalCtx,tmp);

    return s;
}

void jsvalFree(JSVAL val) {
	JS_FreeValue(jsvalCtx,val);
}

void jsvalQuickjsRunGc() {
	assert(jsvalRt!=NULL);
    JS_RunGC(jsvalRt);
}
