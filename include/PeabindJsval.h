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

	std::vector<Listener*> listeners;
	std::vector<Opaque*> opaques;
};

extern PeabindJsval *global_context;
