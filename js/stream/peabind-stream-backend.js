import fs from "node:fs";
import path from "node:path";
import {ifdefWrap, autoIndent} from "../utils/lang-util.js";
import StreamBackendFunctionRenderer from "./StreamBackendFunctionRenderer.js";
import StreamBackendClassRenderer from "./StreamBackendClassRenderer.js";
import StreamBackendEventRenderer from "./StreamBackendEventRenderer.js";
import IdlRenderer from "../idl/IdlRenderer.js";

class StreamBackendRenderer extends IdlRenderer {
    constructor(options) {
        super({
            ...options,
            functionRendererClass: StreamBackendFunctionRenderer,
            classRendererClass: StreamBackendClassRenderer,
            eventRendererClass: StreamBackendEventRenderer
        });

        this.packer="backend";
    }

    generateSource() {
        return autoIndent(`
            #include "${this.projectName}.h"
            ${this.idl.include.map(i=>`#include "${i}"`).join("\n")}
            ${this.idl.functions.map(func=>this.fr(func).generateBackendStub()).join("\n")}
            ${this.idl.classes.map(cls=>this.cr(cls).generateBackendStub()).join("\n")}

            static std::vector<uint8_t> ${this.prefix}handle_on(PeabindStreamBackend* backend, int instanceId, int eventId) {
                std::vector<uint8_t> res;
                int handlerId=backend->nextInstanceId++;
                switch (eventId) {
                    ${this.getEventRenderers().map(e=>e.generateBackendCase()).join("\n")}

                    default:
                        handlerId=-1;
                        break;
                }

                size_t size=2;
                CborLite::encodeArraySize(res,size);
                CborLite::encodeInteger(res,PEABIND_STREAMOP_RETURN);
                CborLite::encodeInteger(res,handlerId);

                return res;
            }

            PeabindStreamBackend* ${this.prefix}create_stream_backend(StreamTransport* streamTransport) {
                PeabindStreamBackend* backend=new PeabindStreamBackend(streamTransport);
                backend->setOnHandler(${this.prefix}handle_on);
                ${this.idl.functions.map(func=>ifdefWrap(func.ifdef,`
                    backend->addFunction(${this.fr(func).getId()},${this.prefix}${func.name});
                `)).join("")}
                ${this.idl.classes.map(cls=>`
                    backend->addClass(${this.cr(cls).getId()},${this.prefix}${cls.name}_constructor);
                    ${cls.methods.map(func=>`
                        backend->addFunction(${this.fr(func).getId()},${this.prefix}${cls.name}_${func.name});
                    `).join("")}
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

export async function peabindStreamBackend(options) {
    let renderer=new StreamBackendRenderer(options);

    fs.writeFileSync(renderer.getOutput(),renderer.generateSource());
    fs.writeFileSync(renderer.getOutput(".h"),renderer.generateHeaderSource());
}