import fs from "node:fs";
import path from "node:path";
import {ifdefWrap, autoIndent} from "../utils/lang-util.js";
import {createFuncBuilder} from "../idl/FuncBuilder.js";

class PeabindStreamBackendBuilder {
    constructor({idl, prefix, projectName}) {
        this.idl=idl;
        this.prefix=prefix;
        this.projectName=projectName;
    }

    fs(func) {
        return createFuncBuilder({idl: this.idl, prefix: this.prefix, func});
    }

    generateSource() {
        return autoIndent(`
            #include "${this.projectName}.h"
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            ${this.idl.functions.map(func=>this.fs(func).generateBackendStub()).join("\n")}
            PeabindStreamBackend* ${this.prefix}create_stream_backend(StreamTransport* streamTransport) {
                PeabindStreamBackend* backend=new PeabindStreamBackend(streamTransport);
                ${this.idl.functions.map(func=>`
                    backend->addFunction(${this.fs(func).getId()},${this.prefix}${func.name});
                `).join("")}

                return backend;
            }

        `);
    }

    generateHeaderSource() {
        return autoIndent(`
            #pragma once
            #include <PeabindStreamBackend.h>
            PeabindStreamBackend* ${this.prefix}create_stream_backend(StreamTransport*);
        `);
    }
}

export async function peabindStreamBackend({idl, output, prefix}) {
    let projectName=path.basename(output).slice(0,-4);
    if (!prefix)
        prefix=projectName.replaceAll(".","_")+"_";

    let builder=new PeabindStreamBackendBuilder({idl, prefix, projectName});
    fs.writeFileSync(output,builder.generateSource());

    let headerOutput=output.slice(0,-4)+".h";
    fs.writeFileSync(headerOutput,builder.generateHeaderSource());
}