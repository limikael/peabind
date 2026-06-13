import fs from "node:fs";
import path from "node:path";
import {ifdefWrap, autoIndent} from "../utils/lang-util.js";

class PeabindStreamBackendBuilder {
    constructor({idl, prefix}) {
        this.idl=idl;
        this.prefix=prefix;
    }

    generateSource() {
        return autoIndent(`
            ${this.prefix}Backend::${this.prefix}Backend(StreamTransport &streamTransport_) {
            }

            void ${this.prefix}Backend::loop() {
            }
        `);
    }

    generateHeaderSource() {
        return autoIndent(`
            #pragma once
            #include <peabind.h>
            class ${this.prefix}Backend {
            public:
                ${this.prefix}Backend(StreamTransport &streamTransport_);
                void loop();
            private:
                StreamTransport &streamTransport;
            };
        `);
    }
}

export async function peabindStreamBackend({idl, output, prefix}) {
    if (!prefix) {
        let projectName=path.basename(output).slice(0,-4);
        prefix=projectName.replaceAll(".","_")+"_";
    }

    let builder=new PeabindStreamBackendBuilder({idl, prefix});
    fs.writeFileSync(output,builder.generateSource());

    let headerOutput=output.slice(0,-4)+".h";
    fs.writeFileSync(headerOutput,builder.generateHeaderSource());
}