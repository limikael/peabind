#include "jsval-wasm.h"
#include <cstdio>
#include <cstring>
#include <map>

std::map<JSVAL,void*> opaques;

void jsvalSetOpaque(JSVAL v, void *opaque) {
	//printf("setting opaque for v=%d f=%p\n",v,opaque);

	opaques[v]=opaque;
}

void *jsvalGetOpaque(JSVAL v) {
	return opaques[v];
}

JSVAL jsvalCallNative(JSVAL stub, JSVAL params) {
	JSVAL_FUNC *func=(JSVAL_FUNC *)jsvalGetOpaque(stub);

	//printf("going to call.. f=%p\n",func);

	return func(params);
}

JSVAL jsvalCreateFunc(JSVAL_FUNC *func) {
	JSVAL stub=jsvalCreateFuncStub();
	jsvalSetOpaque(stub,(void *)func);

	return stub;
}

void jsvalSetProp(JSVAL o, const char *prop, JSVAL val) {
	JSVAL propVal=jsvalCreateString(prop,strlen(prop));
	jsvalSetPropJsval(o,propVal,val);
}