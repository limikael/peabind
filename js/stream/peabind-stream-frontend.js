import fs from "node:fs";
import path from "node:path";
import {ifdefWrap, autoIndent, namespaceWrap} from "../utils/lang-util.js";
import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import StreamFrontendFunctionRenderer from "./StreamFrontendFunctionRenderer.js";
import StreamFrontendClassRenderer from "./StreamFrontendClassRenderer.js";
import IdlRenderer from "../idl/IdlRenderer.js";

class StreamFrontendRenderer extends IdlRenderer {
    constructor(options) {
        super({
            ...options,
            functionRendererClass: StreamFrontendFunctionRenderer,
            classRendererClass: StreamFrontendClassRenderer,
        });
    }

    generateSource() {
        return autoIndent(`
            #include "${this.projectName}.h"
            PeabindStreamFrontend* ${this.prefix}frontend=nullptr;
            ${namespaceWrap(this.namespace,`
                ${this.idl.functions.map(f=>this.fr(f).generateFrontendStub()).join("\n")}
                ${this.idl.classes.map(c=>this.cr(c).generateFrontendStub()).join("\n")}
            `)}
            void ${this.prefix}init(StreamTransport* transport) {
                ${this.prefix}frontend=new PeabindStreamFrontend(transport);
            }
            void ${this.prefix}exit() {
                delete ${this.prefix}frontend;
                ${this.prefix}frontend=nullptr;
            }
        `);
    }

    generateHeaderSource() {
        return autoIndent(`
            #pragma once
            #include <PeabindStreamFrontend.h>
            extern PeabindStreamFrontend* ${this.prefix}frontend;
            ${namespaceWrap(this.namespace,`
                ${this.idl.classes.map(c=>this.cr(c).generateForwardSignature()).join("\n")}
                ${this.idl.functions.map(f=>this.fr(f).generateSignature()).join("\n")}
                ${this.idl.classes.map(f=>this.cr(f).generateSignature()).join("\n")}
            `)}
            void ${this.prefix}init(StreamTransport* transport);
            void ${this.prefix}exit();
        `);
    }
}

export async function peabindStreamFrontend(options) {
    let renderer=new StreamFrontendRenderer(options);
    fs.writeFileSync(renderer.getOutput(),renderer.generateSource());
    fs.writeFileSync(renderer.getOutput(".h"),renderer.generateHeaderSource());
}