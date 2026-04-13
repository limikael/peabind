#include <cstdio>
#include "jsval-wasm.h"

JSVAL add(JSVAL thisobj, JSVAL args) {
	JSVAL argv[jsvalGetSize(args)];
	jsvalReadArray(args,argv);

	JSVAL a=jsvalGetInt(argv[0]);
	JSVAL b=jsvalGetInt(argv[1]);

	return jsvalCreateInt(a+b);
}

JSVAL makecall(JSVAL thisobj, JSVAL args) {
	JSVAL fn=jsvalGetItemAt(args,0);
	JSVAL ret=jsvalCall(fn,0,args);

	return ret;
}

JSVAL getstringlen(JSVAL thisobj, JSVAL args) {
	int len=jsvalGetSize(jsvalGetItemAt(args,0));
	//printf("len: %d\n",len);

	return jsvalCreateInt(len);
}

extern "C" void init() {
	JSVAL mod=jsvalGetModule();

	jsvalSetProp(mod,"add",jsvalCreateFunc(add));
	jsvalSetProp(mod,"makecall",jsvalCreateFunc(makecall));
	jsvalSetProp(mod,"getstringlen",jsvalCreateFunc(getstringlen));
}