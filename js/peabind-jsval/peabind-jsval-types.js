import {peabindNormalize, idlGetClass} from "../peabind/peabind-idl.js";

class IntTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
    }

    nativeType() {
        return "int";
    }

    nativeDecl(name) {
        if (this.typeDef.promise)
            return `std::optional<Promise<int32_t>> ${name};\n`;

        return `int32_t ${name};\n`;
    }

    nativeParam(name) {
        if (this.typeDef.promise)
            throw new Error("promises can't be parameters");

        return `int32_t ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalGetInt(${src});\n`;
    }

    pack(dest, src) {
        if (this.typeDef.promise) {
            return `
                ${dest}=packPromise<int32_t>(*${src},[](int32_t v) {
                    return jsvalCreateInt(v);
                });
            `;
        }

        return `${dest}=jsvalCreateInt(${src});\n`;
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }

    cborPack(msg, name) {
        return `CborLite::encodeInteger(${msg},${name});\n`;
    }

    cborUnpack(name, msg) {
        return `
            auto ${msg}_it=${msg}.begin();
            ${this.cborUnpackIt(name,`${msg}_it`,msg)}
        `;
    }

    cborUnpackIt(name, it, msg) {
        return `
            CborLite::decodeInteger(${it},${msg}.end(),${name});
        `;
    }
}

class FloatTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
        if (this.typeDef.promise)
            throw new Error("float promise not impl");
    }

    nativeType() {
        return "float";
    }

    nativeDecl(name) {
        return `float ${name};\n`;
    }

    nativeParam(name) {
        return `float ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalGetFloat(${src});\n`;
    }

    pack(dest, src) {
        return `${dest}=jsvalCreateFloat(${src});\n`;
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }

    cborUnpack(name, msg) {
        return `
            auto ${msg}_it=${msg}.begin();
            ${this.cborUnpackIt(name,`${msg}_it`,msg)}
        `;
    }

    cborUnpackIt(name, it, msg) {
        return `
            CborLite::decodeDoubleFloat(${it},${msg}.end(),${name});
        `;
    }

    cborPack(msg, name) {
        return `CborLite::encodeDoubleFloat(${msg},${name});\n`;
    }
}

class StringTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
    }

    nativeType() {
        return "std::string";
    }

    nativeDecl(name) {
        if (this.typeDef.promise)
            return `Promise<std::string> ${name};\n`;

        return `std::string ${name};\n`;
    }

    nativeParam(name) {
        return `std::string ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    pack(dest, src) {
        if (this.typeDef.promise) {
            return `
                ${dest}=packPromise<std::string>(${src},[](std::string v) {
                    return jsvalCreateString(v.c_str());
                });
            `;
        }

        return `${dest}=jsvalCreateString(${src}.c_str());\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalToStdString(${src});\n`;
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }

    cborPack(msg, name) {
        return `CborLite::encodeBytes(${msg},${name});\n`;
    }

    cborUnpack(name, msg) {
        return `
            auto ${msg}_it=${msg}.begin();
            ${this.cborUnpackIt(name,`${msg}_it`,msg)}
        `;
    }

    cborUnpackIt(name, it, msg) {
        return `
            CborLite::decodeBytes(${it},${msg}.end(),${name});
        `;
    }
}

class BufferTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
    }

    nativeType() {
        return "std::vector<uint8_t>";
    }

    nativeDecl(name) {
        if (this.typeDef.promise)
            return `Promise<std::vector<uint8_t>> ${name};\n`;

        return `std::vector<uint8_t> ${name};\n`;
    }

    nativeParam(name) {
        return `std::vector<uint8_t> ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    pack(dest, src) {
        if (this.typeDef.promise) {
            return `
                ${dest}=packPromise<std::vector<uint8_t>>(${src},[](std::vector<uint8_t> b) {
                    return jsvalCreateBuffer(b.data(),b.size());
                });
            `;
        }

        return `${dest}=jsvalCreateBuffer(${src}.data(),${src}.size());\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalToStdUint8Vector(${src});\n`;
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }

    cborPack(msg, name) {
        return `CborLite::encodeBytes(${msg},${name});\n`;
    }

    cborUnpack(name, msg) {
        return `
            auto ${msg}_it=${msg}.begin();
            ${this.cborUnpackIt(name,`${msg}_it`,msg)}
        `;
    }

    cborUnpackIt(name, it, msg) {
        return `
            CborLite::decodeBytes(${it},${msg}.end(),${name});
        `;
    }
}

class ObjectTypeStrategy {
    constructor(typeDef, {idl, prefix, idlRenderer}) {
        this.idlRenderer=idlRenderer;
        this.typeDef=typeDef;
        this.prefix=prefix;
        this.clsdef=idlGetClass(idl,this.typeDef.type);
        if (!this.clsdef)
            throw new Error("Unknown type: "+this.typeDef.type);
    }

    nativeType() {
        return `std::shared_ptr<${this.getTemplateParam()}>`;
    }

    getTemplateParam() {
        let t=this.typeDef.type;

        if (this.clsdef.namespace)
            t=`${this.clsdef.namespace}::${t}`;

        if (this.idlRenderer && this.idlRenderer.namespace)
            t=`${this.idlRenderer.namespace}::${t}`;

        return t;
    }

    nativeDecl(name) {
        if (this.typeDef.promise)
            return `Promise<std::shared_ptr<${this.getTemplateParam()}>> ${name};\n`;

        return `std::shared_ptr<${this.getTemplateParam()}> ${name};\n`;
    }

    nativeParam(name) {
        if (this.typeDef.promise)
            throw new Error("Can't use promise as param");

        return `std::shared_ptr<${this.getTemplateParam()}> ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    unpack(dest, src) {
        let id=`${this.prefix}${this.typeDef.type}_id`;
        return `${dest}=unpack<${this.getTemplateParam()}>(${src},${id});`;
    }

    pack(dest, src) {
        let id=`${this.prefix}${this.typeDef.type}_id`;

        if (this.typeDef.promise) {
            return `
                ${dest}=packPromise<std::shared_ptr<${this.getTemplateParam()}>>(${src},[](std::shared_ptr<${this.getTemplateParam()}> v) {
                    return pack<${this.getTemplateParam()}>(v,${id});
                });
            `;
        }


        if (this.typeDef.promise) {
            //return `printf("packing promise!!!\\n"); abort(); `;
            return `${dest}=packPromise<${this.getTemplateParam()}>(${src},${id});`
        }

        return `${dest}=pack<${this.getTemplateParam()}>(${src},${id});`
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }

    cborPack(msg, name) {
        let packer=this.idlRenderer.packer;
        return `CborLite::encodeInteger(${msg},${packer}->pack(${name}));\n`;
    }

    cborUnpack(name, msg) {
        return `
            auto ${msg}_it=${msg}.begin();
            ${this.cborUnpackIt(name,`${msg}_it`,msg)}
        `;
    }

    cborUnpackIt(name, it, msg) {
        let packer=this.idlRenderer.packer;

        return `
            int ${name}_id;
            CborLite::decodeInteger(${it},${msg}.end(),${name}_id);
            ${name}=${packer}->unpack<${this.getTemplateParam()}>(${name}_id);
        `;
    }
}

class VoidTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
    }

    nativeType() {
        return "void";
    }

    nativeDecl(name) {
        if (!this.typeDef.promise)
            throw new Error("declaring void without promise???");

        return `VoidPromise ${name};\n`;
    }

    nativeParam(name) {
        throw new Error("can't have void parameters");
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    unpack(dest, src) {
        throw new Error("can't unpack void");
    }

    pack(dest, src) {
        if (!this.typeDef.promise)
            throw new Error("packing void without promise???");

        return `
            ${dest}=packPromise<std::monostate>(${src},[](std::monostate m) {
                return jsvalUndefined();
            });
        `;
    }

    cleanup(name) {
        console.log("cleanup void... why?");
        return `jsvalFree(${name});\n`
    }
}

export function createTypeStrategy(typeDef, {idl, prefix, idlRenderer}) {
    switch (typeDef.type) {
        case "void":
            return new VoidTypeStrategy(typeDef);

        case "int":
            return new IntTypeStrategy(typeDef);
            break;

        case "float":
            return new FloatTypeStrategy(typeDef);
            break;

        case "string":
            return new StringTypeStrategy(typeDef);
            break;

        case "buffer":
            return new BufferTypeStrategy(typeDef);
            break;

        default:
            if (!idlGetClass(idl,typeDef.type))
                throw new Error("Unknown type: "+typeDef.type);

            return new ObjectTypeStrategy(typeDef, {idl, prefix, idlRenderer});
            break;
    }
}