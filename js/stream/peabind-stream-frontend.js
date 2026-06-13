import fs from "node:fs";
import path from "node:path";
import {ifdefWrap, autoIndent, namespaceWrap} from "../utils/lang-util.js";
import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {createFuncBuilder} from "../idl/FuncBuilder.js";
import {createClassBuilder} from "../idl/ClassBuilder.js";

class PeabindStreamFrontendBuilder {
    constructor({idl, prefix, projectName, namespace}) {
        this.idl=idl;
        this.prefix=prefix;
        this.projectName=projectName;
        this.namespace=namespace;
    }

    ts(typeDef) {
        if (typeof typeDef=="string")
            typeDef={type: typeDef};

        return createTypeStrategy(typeDef, {
            idl: this.idl, 
            prefix: this.prefix
        });
    }

    fs(func) {
        return createFuncBuilder({idl: this.idl, prefix: this.prefix, func});
    }

    cs(cls) {
        return createClassBuilder({idl: this.idl, prefix: this.prefix, cls});
    }

    generateSource() {
        return autoIndent(`
            #include "${this.projectName}.h"
            #include "cbor-lite/codec.h"
            #include "CborStream.h"
            CborStream *${this.prefix}stream=nullptr;
            std::vector<uint8_t> ${this.prefix}query(std::vector<uint8_t> req) {
                ${this.prefix}stream->write(req);
                return ${this.prefix}stream->read();
            }
            ${namespaceWrap(this.namespace,`
                ${this.idl.functions.map(f=>this.fs(f).generateFrontendImpl()).join("\n")}
            `)}
            void ${this.prefix}init(StreamTransport &transport) {
                ${this.prefix}stream=new CborStream(transport);
            }
        `);
    }

    generateHeaderSource() {
        return autoIndent(`
            #pragma once
            #include <peabind.h>
            #include <vector>
            #include "StreamTransport.h"
            #include "CborStream.h"
            ${namespaceWrap(this.namespace,`
                ${this.idl.functions.map(f=>this.fs(f).generateSignature()).join("\n")}
                ${this.idl.classes.map(f=>this.cs(f).generateSignature()).join("\n")}
            `)}
            void ${this.prefix}init(StreamTransport &transport);
        `);
    }
}

export async function peabindStreamFrontend({idl, output, prefix, namespace}) {
    let projectName=path.basename(output).slice(0,-4);
    if (!prefix)
        prefix=projectName.replaceAll(".","_")+"_";

    let builder=new PeabindStreamFrontendBuilder({idl, prefix, projectName, namespace});
    fs.writeFileSync(output,builder.generateSource());

    let headerOutput=output.slice(0,-4)+".h";
    fs.writeFileSync(headerOutput,builder.generateHeaderSource());
}