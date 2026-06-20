#pragma once
#include "async_primitives.hpp"

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
	void clearListeners();
	void removeListener(Listener *listener);

	std::vector<Listener*> listeners;
};

extern PeabindJsval *global_context;
