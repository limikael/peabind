#pragma once
#include "async_primitives.hpp"
#include "jsval.h"

class Opaque {
public:
    Opaque(std::shared_ptr<void> instance_, JSVAL val_) { 
        instance=instance_; 
        val=val_;
    };

    std::shared_ptr<void> instance;
    JSVAL val;
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

    template<typename T> 
    std::shared_ptr<T> unpack(JSVAL v, JSVAL classId) { 
        return std::static_pointer_cast<T>(unpackInstance(v,classId)); 
    }

	std::vector<Listener*> listeners;
	std::vector<Opaque*> opaques;
};

extern PeabindJsval *global_context;
