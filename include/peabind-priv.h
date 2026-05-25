#pragma once
#include "jsval.h"
#include "peabind.h"
#include <string>
#include <map>
#include <memory>
#include <algorithm>
#include <cassert>

class Opaque;
extern std::vector<Opaque*> opaques;

class Opaque {
public:
    Opaque(std::shared_ptr<void> instance_, JSVAL val_) { 
        instance=instance_; 
        val=val_;
    };

    std::shared_ptr<void> instance;
    JSVAL val;
};

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
static std::shared_ptr<T> unpack(JSVAL v, JSVAL classId) {
    if (!jsvalInstanceOf(v,classId))
        return nullptr;

    Opaque *opaque=(Opaque *)jsvalGetOpaque(v);
    if (!opaque)
        return nullptr;

    std::shared_ptr<T> p=std::static_pointer_cast<T>(opaque->instance);
    return p;
}

class Listener {
public:
    Listener(Dispatcher<> *dispatcher_, int handle_) {
        dispatcher=dispatcher_;
        handle=handle_;
    }

    Dispatcher<> *dispatcher;
    int handle;
};
