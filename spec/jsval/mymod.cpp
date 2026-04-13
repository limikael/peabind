#include <cstdio>
#include "jsval-wasm.h"

JSVAL add(JSVAL args) {
	JSVAL a=jsvalGetInt(jsvalGetItemAt(args,0));
	JSVAL b=jsvalGetInt(jsvalGetItemAt(args,1));

	return jsvalCreateInt(a+b);
}

extern "C" void init() {
	JSVAL mod=jsvalGetModule();

	jsvalSetProp(mod,"add",jsvalCreateFunc(add));
}