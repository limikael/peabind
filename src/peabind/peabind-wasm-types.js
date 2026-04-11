import {peabindNormalize, idlGetClass} from "./peabind-idl.js";

class IntTypeStrategy {
    abiType() {
        return `int`;
    }

    nativeParam(name) {
        return `int ${name}`;
    }

    abiParam(name) {
        return `int ${name}`;
    }

    abiDecl(name) {
        return `int ${name};`;
    }

    nativeDecl(name) {
        return `int ${name};`;
    }

    unpack(to, from) {
        return `${to}=${from};\n`;
    }

    pack(to, from) {
        return `${to}=${from};\n`;
    }

    jsDecl(name) {
        return `let ${name};\n`;
    }

    jsPack(to, from) {
        return `${to}=${from};\n`;
    }

    jsUnpack(to, from) {
        return `${to}=${from};\n`;
    }
}

class FloatTypeStrategy {
    abiType() {
        return `float`;
    }

    nativeParam(name) {
        return `float ${name}`;
    }

    abiParam(name) {
        return `float ${name}`;
    }

    abiDecl(name) {
        return `float ${name};\n`;
    }

    nativeDecl(name) {
        return `float ${name};`;
    }

    unpack(to, from) {
        return `${to}=${from};\n`;
    }

    pack(to, from) {
        return `${to}=${from};\n`;
    }

    jsDecl(name) {
        return `let ${name};`
    }

    jsPack(to, from) {
        return `${to}=${from};\n`;
    }

    jsUnpack(to, from) {
        return `${to}=${from};\n`;
    }
}

class ObjectTypeStrategy {
    constructor(typeDef, {idl, prefix}) {
        this.typeDef=typeDef;
        this.prefix=prefix;
    }

    abiType() {
        return `int`;
    }

    nativeParam(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name}`;
    }

    abiParam(name) {
        return `int ${name}`;
    }

    abiDecl(name) {
        return `int ${name};\n`;
    }

    nativeDecl(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name};`;
    }

    unpack(to, from) {
        return `${to}=std::static_pointer_cast<${this.typeDef.type}>(registry[${from}]);\n`;
    }

    pack(to, from) {
        return `${to}=store(${from});\n`;
    }

    jsDecl(name) {
        return `let ${name};`
    }

    jsPack(to, from) {
        return `${to}=${from}._handle;\n`;
    }

    jsUnpack(to, from) {
        return `${to}=${this.prefix}getRegistryObject(${from},${this.typeDef.type});\n`;
    }
}

class StringTypeStrategy {
    abiType() {
        return `TransferBuffer *`;
    }

    /*nativeParam(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name}`;
    }*/

    abiParam(name) {
        return `TransferBuffer* ${name}`;
    }

    abiDecl(name) {
        return `TransferBuffer* ${name};\n`;
    }

    nativeDecl(name) {
        return `std::string ${name};`;
    }

    unpack(to, from) {
        return `
            ${to}=std::string(static_cast<const char*>(transferBufferGetPointer(${from})),transferBufferGetSize(${from}));
            transferBufferDispose(${from});
        `;
    }

    pack(to, from) {
        return `
            ${to}=transferBufferCreate(${from}.size());
            memcpy(transferBufferGetPointer(${to}),${from}.data(),${from}.size());
        `;
    }

    jsUnpack(to, from) {
        return `
            let ${to}_bytes=new Uint8Array(memory.buffer,exp.transferBufferGetPointer(${from}),exp.transferBufferGetSize(${from}));
            ${to}=new TextDecoder("utf-8").decode(${to}_bytes);
            exp.transferBufferDispose(${from});
        `
    }

    jsDecl(name) {
        return `let ${name};`
    }

    jsPack(to, from) {
        return `
            let ${from}_encoder=new TextEncoder();
            let ${from}_bytes=${from}_encoder.encode(${from});
            ${to}=exp.transferBufferCreate(${from}_bytes.length);
            let ${to}_mem=new Uint8Array(memory.buffer,exp.transferBufferGetPointer(${to}),${from}_bytes.length);
            ${to}_mem.set(${from}_bytes)
        `;
    }
}

class VoidTypeStrategy {
    abiType() {
        return `void`;
    }
}

export function createTypeStrategy(typeDef, {idl, prefix}) {
    switch (typeDef.type) {
        case "int":
            return new IntTypeStrategy();
            break;

        case "float":
            return new FloatTypeStrategy();
            break;

        case "void":
            return new VoidTypeStrategy();
            break;

        case "string":
            return new StringTypeStrategy();
            break;

        default:
            if (!idlGetClass(idl,typeDef.type))
                throw new Error("Unknown type: "+typeDef.type);

            return new ObjectTypeStrategy(typeDef, {idl, prefix});
            break;
    }
}