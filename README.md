# PEABIND(1)

## NAME

**peabind** — generate JavaScript ↔ native bindings for QuickJS and WebAssembly

## SYNOPSIS

```id="u6t4qg"
peabind <idl> <sources...> --output <file> --target <quickjs|wasm> [--prefix <name>]
```

## DESCRIPTION

**peabind** is a tool that lets you call C++ code from JavaScript.

You describe your API once (in a simple JSON IDL), and peabind generates everything needed to expose it to JavaScript — either:

* inside an embedded engine like QuickJS
* or as a WebAssembly module usable from standard JavaScript

The focus is on usability:

> Write C++ → describe it → use it from JavaScript.

You do not need to deal with:

* JS engine internals
* manual binding code
* cross-language memory handling

## ARGUMENTS

### `<idl>`

The first positional argument.

Path to the IDL JSON file describing your API.

### `<sources...>`

All remaining positional arguments before flags.

C++ source files implementing the API.

## OPTIONS

### `--output <file>`

Output file. Its extension must match the selected target.

### `--target <quickjs|wasm>`

Selects the output type.

* `quickjs` → generates C++ bindings
* `wasm` → generates JavaScript + WebAssembly module

### `--prefix <name>`

Optional.

Used mainly for the QuickJS target:

* prefixes generated symbols
* defines the init function name

Has little practical effect for the WASM target.

## BASIC USAGE

### Example (WASM)

```id="6q3j3v"
peabind api.json api.cpp --output module.js --target wasm
```

Given a `api.cpp` source file:
```js id="2z8pzt"
int add(int a, int b) {
  return a+b;
}
```

And a `api.json` idl description file:
```json
{
  "functions": {
    "add": {"return": "int", "args": ["int","int"]}
  }
}
```

You can use it from JavaScript like a normal module:
```js id="2z8pzt"
import * as mod from "./module.js";

let result = mod.add(1, 2);
```

### Example (QuickJS)

```id="jjv3ok"
peabind api.json api.cpp --output bindings.cpp --target quickjs --prefix mod
```

Integrate in C++:

```cpp id="h7s7ml"
JSContext *ctx;

// Init quickjs...

mod_init(ctx);
```

## TARGETS

### QUICKJS

```
--target quickjs --output bindings.cpp
```

Generates:

* `bindings.cpp`
* `bindings.h`

You compile these into your application.

#### Entry Point

```cpp id="pb4x7l"
void mod_init(JSContext *ctx);
```

Where `mod` comes from `--prefix`.

### WASM

```
--target wasm --output module.js
```

Generates:

* `module.js`
* `module.wasm`

In this mode:

* compilation to WebAssembly is handled internally
* intermediate steps are hidden

You can import the result like a normal JavaScript module.

## FUNCTIONS

Functions are exposed as JavaScript functions:

```js id="z7s7ku"
mod.add(1, 2);
```

## CLASSES

C++ classes become JavaScript classes.

IDL:

```json id="ks7u9r"
{
  "classes": {
    "Counter": {
      "methods": {
        "inc": {},
        "get": { "return": "int" }
      }
    }
  }
}
```

Usage:

```js id="jcf1z7"
let c = new mod.Counter();
c.inc();
console.log(c.get());
```

## COMMON WORKFLOWS

### Embedded (QuickJS)

1. Generate bindings
2. Compile into application
3. Call init function
4. Use from JS

### Web / Node.js (WASM)

1. Generate module
2. Import in JavaScript
3. Call functions directly

## WHAT PEABIND HANDLES

* JS ↔ C++ type conversion
* Function dispatch
* Object identity across calls
* Memory safety across the boundary
* WASM compilation pipeline

## LIMITATIONS

* Requires explicit IDL
* Output must match target
* Debugging may involve generated code
* GC timing is non-deterministic

## FILES

### QuickJS

```id="0bovv1"
bindings.cpp
bindings.h
```

### WASM

```id="3dfq5v"
module.js
module.wasm
```

## SUMMARY

peabind lets you expose C++ code to JavaScript with a simple interface description, targeting both embedded QuickJS environments and WebAssembly modules.

"decl": ["static", "promise", "expected","allownull"]