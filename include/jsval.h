#ifdef JSVAL_TARGET_QUICKJS
#define JSVAL_RUNTIME_REG
#include "jsval-quickjs.h"
#elif JSVAL_TARGET_WASM
#define JSVAL_RUNTIME_REG
#include "jsval-wasm.h"
#elif JSVAL_TARGET_MQJS
#include "jsval-mqjs.h"
#else
#error "Unknown JSVAL_TARGET_..."
#endif
