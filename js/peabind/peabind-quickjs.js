import path from "path";
import os from "os";
import fs from "fs";
import {createPeabindJsvalBuilder} from "./peabind-jsval.js";
import {dirnameFromImportMeta} from "../utils/node-util.js";
import {autoIndent} from "../utils/lang-util.js";

let __dirname=dirnameFromImportMeta(import.meta);

export async function peabindQuickjs({idl, includePath, sources, output, prefix}) {
    if (!output.endsWith(".cpp"))
        throw new DeclaredError("Expected .cpp output");

    let projectName=path.basename(output).slice(0,-4);
    let builder=createPeabindJsvalBuilder({
        idl, 
        prefix,
        projectName,
        include: ["jsval-quickjs.h",projectName+".h"]
    });

    let source=autoIndent(`
        ${builder.generateSource()}

        static JSVAL held;

        void ${builder.prefix}init() {
            assert(jsvalQuickjsGetContext()!=NULL);
            ${builder.prefix}initmod(jsvalGetGlobal());
            held=jsvalEval("new String(1337)");
        }

        void ${builder.prefix}exit() {
            ${builder.prefix}exitmod();
            jsvalFree(held);
        }
    `);

    fs.writeFileSync(output,source); //source);

    let headerOutput=output.slice(0,-4)+".h";
    let headerContent=autoIndent(`
        #pragma once
        #include "quickjs.h"
        #include "jsval-quickjs.h"
        extern "C" void ${builder.prefix}initmod(JSVAL mod);
        extern "C" void ${builder.prefix}init();
        extern "C" void ${builder.prefix}exit();
    `);
    fs.writeFileSync(headerOutput,headerContent);
}