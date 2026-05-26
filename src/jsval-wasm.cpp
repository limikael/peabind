#include "jsval-wasm.h"
#include <cstdio>
#include <cstring>
#include <map>

static std::map<JSVAL,void*> jsvalOpaques;
static std::map<JSVAL,void*> internalOpaques;
static std::map<JSVAL,JSVAL_FINALIZER*> classFinalizers;

JSVAL *jsvalReadArray(JSVAL a, JSVAL *dest) {
	int size=jsvalGetSize(a);
	for (int i=0; i<size; i++)
		dest[i]=jsvalGetItemAt(a,i);

	return dest;
}

void jsvalSetInternalOpaque(JSVAL v, void *opaque) {
	//printf("setting opaque for v=%d f=%p\n",v,opaque);

	internalOpaques[v]=opaque;
}

void *jsvalGetInternalOpaque(JSVAL v) {
	return internalOpaques[v];
}

void jsvalSetOpaque(JSVAL v, void *opaque) {
	//printf("setting opaque for v=%d f=%p\n",v,opaque);

	jsvalOpaques[v]=opaque;
}

void *jsvalGetOpaque(JSVAL v) {
	return jsvalOpaques[v];
}

JSVAL jsvalCallNative(JSVAL stub, JSVAL thisobj, JSVAL args) {
	int argc=jsvalGetSize(args);
	JSVAL argv[argc];
	jsvalReadArray(args,argv);

	JSVAL_FUNC *func=(JSVAL_FUNC *)jsvalGetInternalOpaque(stub);

	//printf("going to call.. f=%p\n",func);

	return func(thisobj, argc, argv);
}

JSVAL jsvalCreateFunc(JSVAL_FUNC *func) {
	JSVAL stub=jsvalCreateFuncStub();
	jsvalSetInternalOpaque(stub,(void *)func);

	return stub;
}

JSVAL jsvalCreateClass(JSVAL_FUNC *func) {
	JSVAL stub=jsvalCreateClassStub();
	jsvalSetInternalOpaque(stub,(void *)func);

	return stub;
}

void jsvalSetProp(JSVAL o, const char *prop, JSVAL val) {
	JSVAL propVal=jsvalCreateString(prop);
	jsvalSetPropJsval(o,propVal,val);
}

void jsvalSetProtoProp(JSVAL o, const char *prop, JSVAL val) {
	JSVAL proto=jsvalGetPropJsval(o,jsvalCreateString("prototype"));
	jsvalSetPropJsval(proto,jsvalCreateString(prop),val);
}

void jsvalSetClassFinalizer(JSVAL clsid, JSVAL_FINALIZER *f) {
	classFinalizers[clsid]=f;
}

JSVAL jsvalCall(JSVAL fn, JSVAL thisobj, int argc, JSVAL *argv) {
	int a=jsvalCreateArray(argc);
	for (int i=0; i<argc; i++)
		jsvalSetItemAt(a,i,argv[i]);

	return jsvalCallArray(fn,thisobj,a);
}

// TODO! remove opaques!! (also for non-class objects?)
void jsvalNotifyFinalize(JSVAL clsid, JSVAL oid) {
	if (clsid) {
		JSVAL_FINALIZER *f=classFinalizers[clsid];
		if (f)
			f(oid);
	}
}

JSVAL_ID jsvalGetObjectId(JSVAL v) {
	return v;
}

JSVAL_REF jsvalRefCreate(JSVAL v) {
	jsvalDup(v);
	return new JsvalRef(v);
}

void jsvalRefFree(JSVAL_REF ref) {
	jsvalFree(ref->value);
	delete ref;
}

JSVAL jsvalRefGetValue(JSVAL_REF ref) {
	return ref->value;
}
