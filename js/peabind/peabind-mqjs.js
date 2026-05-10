import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";
import {autoIndent} from "../utils/lang-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabindMqjs({idl, includePath, sources, output, prefix}) {
    if (!output.endsWith(".cpp"))
        throw new DeclaredError("Expected .cpp output");

    let projectName=path.basename(output).slice(0,-4);
    let builder=createPeabindJsvalBuilder({
        idl, 
        prefix,
        projectName,
        include: ["jsval-mqjs.h",projectName+".h"]
    });

    let source=autoIndent(`
        ${builder.generateSource()}

        extern "C" void ${builder.prefix}initmod(JSVAL mod);
        extern "C" void ${builder.prefix}exitmod();

        static JSVAL lock;
        static bool owned;

        void ${builder.prefix}init(JSContext *ctx) {
            jsvalMqjsInitBorrowed(ctx);
            owned=true;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}init_jsval() {
            assert(jsvalMqjsGetContext()!=NULL);
            owned=false;
            ${builder.prefix}initmod(jsvalGetGlobal());
            lock=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}exit() {
            ${builder.prefix}exitmod();
            jsvalFree(lock);
            if (owned)
                jsvalMqjsExit();
        }
    `);

    fs.writeFileSync(output,source);

    let headerOutput=output.slice(0,-4)+".h";
    let headerContent=autoIndent(`
        #pragma once
        #include "jsval.h"
        #include "jsval-util.h"
        extern "C" void ${builder.prefix}init(JSContext *ctx);
        extern "C" void ${builder.prefix}init_jsval();
        extern "C" void ${builder.prefix}exit();
        extern "C" int ${builder.prefix}get_num_objects();
        extern "C" int ${builder.prefix}get_num_listeners();
    `);
    fs.writeFileSync(headerOutput,headerContent);
}