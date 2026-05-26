#pragma once
#include "jsval.h"
#include "peabind.h"
#include <string>
#include <map>
#include <memory>
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <variant>

class Opaque;
class Listener;

extern std::vector<Opaque*> opaques;
extern JSVAL promiseClassId;
extern std::vector<Listener*> listeners;

class Listener {
public:
    Listener(Dispatcher<> *dispatcher_, int handle_) {
        dispatcher=dispatcher_;
        handle=handle_;
    }

    Dispatcher<> *dispatcher;
    int handle;
};

class Opaque {
public:
    Opaque(std::shared_ptr<void> instance_, JSVAL val_) { 
        instance=instance_; 
        val=val_;
    };

    std::shared_ptr<void> instance;
    JSVAL val;
};

class PromiseOpaque {
public:
    std::function<void(JSVAL)> then;
};

template<typename T>
PromiseOpaque* makePromiseOpaque(Promise<T> promise, std::function<JSVAL(T)> packer) {
    PromiseOpaque* op=new PromiseOpaque();

    op->then=[promise, packer](JSVAL cb) mutable {
        JSVAL_REF ref=jsvalRefCreate(cb);
        Dispatcher<T> *thenDispatcher=promise.getThenDispatcher();
        int handle=thenDispatcher->on([promise, ref, packer](T val) mutable {
            JSVAL args[1];
            args[0]=packer(val);
            JSVAL cbv=jsvalRefGetValue(ref);
            jsvalCall(cbv,jsvalUndefined(),1,args);
            jsvalRefFree(ref);
        });

        Dispatcher<> *d=(Dispatcher<>*) thenDispatcher;
        Listener *listener=new Listener(d,handle);
        listeners.push_back(listener);

        thenDispatcher->setDestructor(handle,[listener](){
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

            //jsvalRefFree(cbRef);
        });
    };

    return op;
}

template<typename T>
static std::shared_ptr<T> unpack(JSVAL v, JSVAL classId) {
    if (!jsvalInstanceOf(v,classId))
        return nullptr;

    Opaque *opaque=(Opaque *)jsvalGetOpaque(v);
    if (!opaque)
        return nullptr;

    std::shared_ptr<T> p=std::static_pointer_cast<T>(opaque->instance);
    return p;
}

template<typename T>
static JSVAL pack(std::shared_ptr<T> instance, JSVAL classId) {
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

template<typename T>
static JSVAL packPromise(Promise<T> promise, std::function<JSVAL(T)> packer) {
    JSVAL promiseVal=jsvalCreateObject(promiseClassId);
    PromiseOpaque *promiseOpaque=makePromiseOpaque<T>(promise, packer);
    jsvalSetOpaque(promiseVal,promiseOpaque);
    return promiseVal;
}

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
    //printf("promise then...\n");
    PromiseOpaque *p=(PromiseOpaque *)jsvalGetOpaque(thisobj);
    p->then(argv[0]);

    return jsvalUndefined();
}

JSVAL Promise_catch(JSVAL thisobj, int argc, JSVAL *argv) {
    return jsvalUndefined();
}
