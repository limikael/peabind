#include "jsval-wasm.h"
#include <cstdio>
#include <cstring>
#include <map>

std::map<JSVAL,void*> internalOpaques;

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

JSVAL jsvalCallNative(JSVAL stub, JSVAL thisobj, JSVAL params) {
	JSVAL_FUNC *func=(JSVAL_FUNC *)jsvalGetInternalOpaque(stub);

	//printf("going to call.. f=%p\n",func);

	return func(thisobj, params);
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