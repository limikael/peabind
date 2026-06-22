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
#include <optional>
#include "PeabindJsval.h"

//extern std::vector<Opaque*> opaques;
extern JSVAL promiseClassId;

class PromiseOpaque {
public:
    std::function<void(JSVAL)> then;
    std::function<void(JSVAL)> onCatch;
};

/*void removeListener(Listener *listener) {
    //printf("listeer destr... weak exp=%d\\n",instanceWeak.expired());
    auto it = std::remove(global_context->listeners.begin(), global_context->listeners.end(), listener);
    assert(it!=global_context->listeners.end());

    if (it != global_context->listeners.end()) {
        global_context->listeners.erase(it, global_context->listeners.end());
        delete listener;
    }

    else {
        printf("listener not found!\\n");
    }
}*/

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
    global_context->opaques.push_back(opaque);
    jsvalSetOpaque(val,opaque);
    return val;
}

template<typename T>
static JSVAL packPromise(Promise<T> promise, std::function<JSVAL(T)> packer) {
    JSVAL promiseVal=jsvalCreateObject(promiseClassId);
    PromiseOpaque *promiseOpaque=new PromiseOpaque();
    jsvalSetOpaque(promiseVal,promiseOpaque);

    promiseOpaque->then=[promise, packer](JSVAL cb) mutable {
        if (promise.isSettled()) {
            if (promise.isResolved()) {
                JSVAL args[1];
                args[0]=packer(promise.getResult());
                JSVAL res=jsvalCall(cb,jsvalUndefined(),1,args);
                jsvalFree(res);
                jsvalFree(args[0]);
            }

            return;
        }

        Dispatcher<T> *thenDispatcher=promise.getThenDispatcher();
        JSVAL_REF cbRef=jsvalRefCreate(cb);
        int handle=thenDispatcher->on([cbRef, packer](T val) mutable {
            JSVAL args[1];
            args[0]=packer(val);
            JSVAL cbv=jsvalRefGetValue(cbRef);
            JSVAL res=jsvalCall(cbv,jsvalUndefined(),1,args);
            jsvalFree(res);
            jsvalFree(args[0]);
        });

        Listener *listener=new Listener((Dispatcher<>*) thenDispatcher,handle);
        global_context->listeners.push_back(listener);
        thenDispatcher->setDestructor(handle,[listener, cbRef](){
            global_context->removeListener(listener);
            jsvalRefFree(cbRef);
        });
    };

    promiseOpaque->onCatch=[promise](JSVAL cb) mutable {
        if (promise.isSettled()) {
            if (promise.isRejected()) {
                std::string reason=promise.getReason();
                JSVAL args[1];
                args[0]=jsvalCreateString(reason.c_str());
                JSVAL res=jsvalCall(cb,jsvalUndefined(),1,args);
                jsvalFree(res);
                jsvalFree(args[0]);
            }

            return;
        }

        Dispatcher<std::string> *catchDispatcher=promise.getCatchDispatcher();
        JSVAL_REF cbRef=jsvalRefCreate(cb);
        int handle=catchDispatcher->on([cbRef](std::string reason) mutable {
            JSVAL args[1];
            args[0]=jsvalCreateString(reason.c_str());
            JSVAL cbv=jsvalRefGetValue(cbRef);
            JSVAL res=jsvalCall(cbv,jsvalUndefined(),1,args);
            jsvalFree(res);
            jsvalFree(args[0]);
        });

        Listener *listener=new Listener((Dispatcher<>*) catchDispatcher,handle);
        global_context->listeners.push_back(listener);
        catchDispatcher->setDestructor(handle,[listener, cbRef](){
            global_context->removeListener(listener);
            jsvalRefFree(cbRef);
        });
    };

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
