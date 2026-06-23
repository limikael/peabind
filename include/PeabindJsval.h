#pragma once
#include <string>
#include <map>
#include <memory>
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <variant>
#include <optional>
#include "peabind.h"
#include "jsval.h"
#include "jsval-util.h"

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
    std::function<void(JSVAL)> onCatch;
};

class Listener {
public:
    Listener(Dispatcher<> *dispatcher_, int handle_) {
        dispatcher=dispatcher_;
        handle=handle_;
    }

    Dispatcher<> *dispatcher;
    int handle;
};

class PeabindJsval {
public:
	PeabindJsval();
	~PeabindJsval();
	void shutdown();
	void removeListener(Listener *listener);
    std::shared_ptr<void> unpackInstance(JSVAL v, JSVAL classId);
    JSVAL packInstance(std::shared_ptr<void> instance, JSVAL classId);
    template<class T> std::shared_ptr<T> unpack(JSVAL v, JSVAL classId);
    template<class T> JSVAL pack(std::shared_ptr<T> instance, JSVAL classId);
    template<typename T> JSVAL packPromise(Promise<T> promise, std::function<JSVAL(T)> packer);

    #ifdef JSVAL_RUNTIME_REG
        void initPromiseClass(JSVAL mod);
    #endif

	std::vector<Listener*> listeners;
	std::vector<Opaque*> opaques;

    JSVAL promiseClassId;
};

#include "PeabindJsval.tpp"
