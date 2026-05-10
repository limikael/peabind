#ifdef JSVAL_TARGET_QUICKJS
#include "jsval-quickjs.h"
#elif JSVAL_TARGET_WASM
#include "jsval-wasm.h"
#elif JSVAL_TARGET_MQJS
#include "jsval-mqjs.h"
#else
#error "Unknown JSVAL_TARGET_..."
#endif
