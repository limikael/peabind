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

PeabindJsval::PeabindJsval() {

}

PeabindJsval::~PeabindJsval() {
	
}

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
