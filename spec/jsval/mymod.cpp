#include <cstdio>
#include "jsval-wasm.h"
#include <string>
#include <cstring>

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

JSVAL concat(JSVAL thisobj, JSVAL args) {
	JSVAL argv[jsvalGetSize(args)];
	jsvalReadArray(args,argv);

	char a[jsvalGetSize(argv[0])+1];
	jsvalReadString(argv[0],a);

	char b[jsvalGetSize(argv[1])+1];
	jsvalReadString(argv[1],b);

	std::string res=std::string(a)+std::string(b);
	int len=strlen(res.c_str());
	//printf("concat: %s len=%d\n",res.c_str(),len);

	return jsvalCreateString(res.c_str());
}

JSVAL MyClass(JSVAL thisobj, JSVAL args) {
	return 0;
}

JSVAL MyClass_getVal(JSVAL thisobj, JSVAL args) {
	return jsvalCreateInt(123);
}

extern "C" void init() {
	JSVAL mod=jsvalGetModule();

	JSVAL cls=jsvalCreateClass(MyClass);
	jsvalSetProp(mod,"MyClass",cls);
	jsvalSetProtoProp(cls,"getVal",jsvalCreateFunc(MyClass_getVal));

	jsvalSetProp(mod,"add",jsvalCreateFunc(add));
	jsvalSetProp(mod,"makecall",jsvalCreateFunc(makecall));
	jsvalSetProp(mod,"getstringlen",jsvalCreateFunc(getstringlen));
	jsvalSetProp(mod,"concat",jsvalCreateFunc(concat));
}