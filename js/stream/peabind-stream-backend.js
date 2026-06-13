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
            ${this.prefix}Backend::${this.prefix}Backend(StreamTransport &streamTransport_)
                    :cborStream(streamTransport_) {
            }
            ${this.idl.functions.map(func=>this.fs(func).generateBackendStub()).join("\n")}
            void ${this.prefix}Backend::loop() {
                if (cborStream.available()) {
                    std::vector<uint8_t> req=cborStream.read();
                    auto it=req.begin();
                    size_t items;
                    CborLite::decodeArraySize(it,req.end(),items);
                    int opcode;
                    CborLite::decodeInteger(it,req.end(),opcode);
                    int funcid;
                    CborLite::decodeInteger(it,req.end(),funcid);
                    std::vector<uint8_t> res;
                    //printf("call funcid=%d\\n",funcid);
                    switch (funcid) {
                        ${this.idl.functions.map(func=>`
                            case 1000+${this.fs(func).getId()}:
                                res=${this.prefix}${func.name}(req);
                                break;
                        `).join("\n")}
                    }
                    //printf("response size=%d\\n",res.size());
                    cborStream.write(res);
                }
            }
        `);
    }

    generateHeaderSource() {
        return autoIndent(`
            #pragma once
            #include <peabind.h>
            #include "StreamTransport.h"
            #include "CborStream.h"
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            class ${this.prefix}Backend {
            public:
                ${this.prefix}Backend(StreamTransport &streamTransport_);
                void loop();
            private:
                CborStream cborStream;
            };
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