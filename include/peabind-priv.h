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
