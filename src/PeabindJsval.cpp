#include "PeabindJsval.h"
#include <cassert>
#include <string>
#include <map>
#include <memory>
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <variant>
#include <optional>

JSVAL Promise_constructor(JSVAL thisobj, int argc, JSVAL *argv) {
    printf("promise ctor, don't call directly...\n");
    abort();
    return thisobj;
}

void Promise_finalizer(JSVAL thisobj) {
    //printf("promise finalizer...\n");

    PromiseOpaque *p=(PromiseOpaque *)jsvalGetOpaque(thisobj);
    delete p;
}

JSVAL Promise_then(JSVAL thisobj, int argc, JSVAL *argv) {
    PromiseOpaque *p=(PromiseOpaque *)jsvalGetOpaque(thisobj);
    p->then(argv[0]);
    if (argc>=2)
        p->onCatch(argv[1]);

    return jsvalDup(thisobj);
}

JSVAL Promise_catch(JSVAL thisobj, int argc, JSVAL *argv) {
    PromiseOpaque *p=(PromiseOpaque *)jsvalGetOpaque(thisobj);
    p->onCatch(argv[0]);
    return jsvalDup(thisobj);
}

PeabindJsval::PeabindJsval() {
    promiseClassId=jsvalUndefined();
}

PeabindJsval::~PeabindJsval() {
	
}

Listener *PeabindJsval::findListener(Dispatcher<>* dispatcher, JSVAL_ID cbId) {
    for (auto it=listeners.begin(); it!=listeners.end(); it++) {
        Listener *l=*it;

        if (l->dispatcher==dispatcher &&
                l->cbRef &&
                jsvalGetObjectId(jsvalRefGetValue(l->cbRef))==cbId)
            return l;
    }

    return nullptr;
}

#ifdef JSVAL_RUNTIME_REG
    void PeabindJsval::initPromiseClass(JSVAL mod) {
        promiseClassId=jsvalCreateClass(Promise_constructor);
        jsvalSetClassFinalizer(promiseClassId,Promise_finalizer);
        jsvalSetProp(mod,"PeabindPromise",promiseClassId);
        jsvalSetProtoProp(promiseClassId,"then",jsvalCreateFunc(Promise_then));
        jsvalSetProtoProp(promiseClassId,"catch",jsvalCreateFunc(Promise_catch));
    }
#endif

void PeabindJsval::shutdown() {
    //printf("num opaques at shutdown: %d\n",opaques.size());
    for (auto it=opaques.begin(); it!=opaques.end(); it++) {
        Opaque *o=*it;
        //jsvalSetOpaque(o->val,nullptr);
        delete o;
    }

    opaques.clear();

    while (listeners.size()) {
        //printf("remove listeners size: %d\\n",global_context->listeners.size());
        listeners[0]->dispatcher->off(listeners[0]->handle);
    }
}

void PeabindJsval::removeListener(Listener *listener) {
    //printf("listeer destr... weak exp=%d\\n",instanceWeak.expired());
    auto it = std::remove(listeners.begin(), listeners.end(), listener);
    assert(it!=listeners.end());

    if (it != listeners.end()) {
        listeners.erase(it, listeners.end());
        delete listener;
    }

    else {
        printf("listener not found!\\n");
    }
}

std::shared_ptr<void> PeabindJsval::unpackInstance(JSVAL v, JSVAL classId) {
    if (!jsvalInstanceOf(v,classId))
        return nullptr;

    Opaque *opaque=(Opaque *)jsvalGetOpaque(v);
    if (!opaque)
        return nullptr;

    return opaque->instance;
}

JSVAL PeabindJsval::packInstance(std::shared_ptr<void> instance, JSVAL classId) {
    if (instance==nullptr)
        return jsvalNull();

    // Causes a leak, dunno why...
    /*for (Opaque *o: opaques) {
        if (o->instance.get()==instance.get()) {
            printf("reusing...\\n");
            JSVAL val=jsvalDup(o->val);
            Opaque *opaque=new Opaque(instance,val);
            opaques.push_back(opaque);
            jsvalSetOpaque(val,opaque);
            return val;
        }
    }*/

    JSVAL val=jsvalCreateObject(classId);
    Opaque *opaque=new Opaque(instance,val);
    opaques.push_back(opaque);
    jsvalSetOpaque(val,opaque);
    return val;
}
