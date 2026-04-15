#include "jsval-quickjs.h"
#include <map>
#include <cstdio>
#include <cstdlib>

static JSContext *jsvalCtx=NULL;
static std::map<int,JSVAL_FUNC *> functions;
static std::map<JSVAL_FUNC *,JSClassID> classIdByCtor;
static std::map<JSClassID,JSVAL_FINALIZER *> finalizerByClassId;
static int nextFunctionId=1;

void jsvalInit(JSContext *ctx) {
	jsvalCtx=ctx;
	nextFunctionId=1;
	functions.clear();
}

void jsvalExit() {
	jsvalCtx=NULL;
	functions.clear();
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
