#include <cstdio>
#include "jsval-wasm.h"
#include <string>
#include <cstring>

static JSVAL add(JSVAL thisobj, int argc, JSVAL *argv) {
	JSVAL a=jsvalGetInt(argv[0]);
	JSVAL b=jsvalGetInt(argv[1]);

	return jsvalCreateInt(a+b);
}

static JSVAL makecall(JSVAL thisobj, int argc, JSVAL *argv) {
	JSVAL fn=argv[0];
	//JSVAL ret=jsvalCall(fn,0,0,NULL);
	JSVAL ret=jsvalCallArray(fn,0,0);

	return ret;
}

static JSVAL getstringlen(JSVAL thisobj, int argc, JSVAL *argv) {
	int len=jsvalGetSize(argv[0]);
	//printf("len: %d\n",len);

	return jsvalCreateInt(len);
}

static JSVAL concat(JSVAL thisobj, int argc, JSVAL *argv) {
	char a[jsvalGetSize(argv[0])+1];
	jsvalReadString(argv[0],a);

	char b[jsvalGetSize(argv[1])+1];
	jsvalReadString(argv[1],b);

	std::string res=std::string(a)+std::string(b);
	int len=strlen(res.c_str());
	//printf("concat: %s len=%d\n",res.c_str(),len);

	return jsvalCreateString(res.c_str());
}

static int numLiveMyClass=0;

static JSVAL getNumLiveMyClass(JSVAL thisobj, int argc, JSVAL *argv) {
	return jsvalCreateInt(numLiveMyClass);
}

class MyClass {
public:
	MyClass() {
		val=100;
		callback=0;
		numLiveMyClass++;
	}
	~MyClass() {
		numLiveMyClass--;
	}

	int val;
	JSVAL callback;
};

static JSVAL MyClass_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
	jsvalSetOpaque(thisobj,new MyClass());
	return 0;
}

static JSVAL MyClass_getVal(JSVAL thisobj, int argc, JSVAL *argv) {
	MyClass *my=(MyClass*)jsvalGetOpaque(thisobj);
	return jsvalCreateInt(my->val);
}

static JSVAL MyClass_setVal(JSVAL thisobj, int argc, JSVAL *argv) {
	MyClass *my=(MyClass*)jsvalGetOpaque(thisobj);
	my->val=jsvalGetInt(argv[0]);
	return 0;
}

static void MyClass_finalizer(JSVAL thisobj) {
	MyClass *my=(MyClass*)jsvalGetOpaque(thisobj);
	//printf("finalizing %d, val=%d, cb=%d\n",thisobj,my->val,my->callback);

	if (my->callback)
		jsvalFree(my->callback);
	delete my;
}

static JSVAL MyClass_setCallback(JSVAL thisobj, int argc, JSVAL *argv) {
	MyClass *my=(MyClass*)jsvalGetOpaque(thisobj);

	jsvalDup(argv[0]);
	my->callback=argv[0];
	return 0;
}

static JSVAL MyClass_triggerCallback(JSVAL thisobj, int argc, JSVAL *argv) {
	MyClass *my=(MyClass*)jsvalGetOpaque(thisobj);

	//jsvalCallArray(my->callback,0,0);//=argv[0];
	jsvalCall(my->callback,0,argc,argv);
	return 0;
}

static JSVAL ctor1(JSVAL thisobj, int argc, JSVAL *argv) {
	return thisobj;
}

static JSVAL ctor2(JSVAL thisobj, int argc, JSVAL *argv) {
	return thisobj;
}

static JSVAL checkInstanceOf(JSVAL thisobj, int argc, JSVAL *argv) {
	return jsvalInstanceOf(argv[0],argv[1]);
}

// Round-trips an int through C++. Used by jsval.spec.js to verify that
// small ints stay tagged (no host roundtrip, no registry entry).
static JSVAL echoInt(JSVAL thisobj, int argc, JSVAL *argv) {
	return jsvalCreateInt(jsvalGetInt(argv[0]));
}

// Sums argc ints. Lets the test create many tagged JSVALs in one call
// to verify the registry doesn't grow.
static JSVAL sumInts(JSVAL thisobj, int argc, JSVAL *argv) {
	int total=0;
	for (int i=0; i<argc; i++)
		total+=jsvalGetInt(argv[i]);
	return jsvalCreateInt(total);
}

// Reports whether the C++ side sees a JSVAL as a tagged int (low cost path).
static JSVAL isArgTaggedInt(JSVAL thisobj, int argc, JSVAL *argv) {
	return jsvalCreateInt(jsvalIsTaggedInt(argv[0]) ? 1 : 0);
}

extern "C" void init(JSVAL mod) {
	JSVAL cls=jsvalCreateClass(MyClass_constructor);
	jsvalSetProp(mod,"MyClass",cls);
	jsvalSetClassFinalizer(cls,MyClass_finalizer);
	jsvalSetProtoProp(cls,"getVal",jsvalCreateFunc(MyClass_getVal));
	jsvalSetProtoProp(cls,"setVal",jsvalCreateFunc(MyClass_setVal));
	jsvalSetProtoProp(cls,"setCallback",jsvalCreateFunc(MyClass_setCallback));
	jsvalSetProtoProp(cls,"triggerCallback",jsvalCreateFunc(MyClass_triggerCallback));

	cls=jsvalCreateClass(ctor1);
	jsvalSetProp(mod,"Class1",cls);

	cls=jsvalCreateClass(ctor2);
	jsvalSetProp(mod,"Class2",cls);

	jsvalSetProp(mod,"add",jsvalCreateFunc(add));
	jsvalSetProp(mod,"makecall",jsvalCreateFunc(makecall));
	jsvalSetProp(mod,"getstringlen",jsvalCreateFunc(getstringlen));
	jsvalSetProp(mod,"concat",jsvalCreateFunc(concat));
	jsvalSetProp(mod,"getNumLiveMyClass",jsvalCreateFunc(getNumLiveMyClass));
	jsvalSetProp(mod,"checkInstanceOf",jsvalCreateFunc(checkInstanceOf));
	jsvalSetProp(mod,"echoInt",jsvalCreateFunc(echoInt));
	jsvalSetProp(mod,"sumInts",jsvalCreateFunc(sumInts));
	jsvalSetProp(mod,"isArgTaggedInt",jsvalCreateFunc(isArgTaggedInt));
}