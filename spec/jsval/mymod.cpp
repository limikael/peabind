#include <cstdio>
#include "jsval-wasm.h"

JSVAL add(JSVAL thisobj, JSVAL args) {
	JSVAL a=jsvalGetInt(jsvalGetItemAt(args,0));
	JSVAL b=jsvalGetInt(jsvalGetItemAt(args,1));

	return jsvalCreateInt(a+b);
}

JSVAL makecall(JSVAL thisobj, JSVAL args) {
	JSVAL fn=jsvalGetItemAt(args,0);
	JSVAL ret=jsvalCall(fn,0,args);

	return ret;
}

extern "C" void init() {
	JSVAL mod=jsvalGetModule();

	jsvalSetProp(mod,"add",jsvalCreateFunc(add));
	jsvalSetProp(mod,"makecall",jsvalCreateFunc(makecall));
}