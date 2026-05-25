import {peabindNormalize, idlGetClass} from "./peabind-idl.js";

class IntTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
    }

    nativeDecl(name) {
        if (this.typeDef.promise)
            return `Promise<int32_t> ${name};\n`;

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
                ${dest}=packPromise<int32_t>(${src},[](int32_t v) {
                    return jsvalCreateInt(v);
                });
            `;
        }

        return `${dest}=jsvalCreateInt(${src});\n`;
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }
}

class FloatTypeStrategy {
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
}

class StringTypeStrategy {
    nativeDecl(name) {
        return `std::string ${name};\n`;
    }

    nativeParam(name) {
        return `std::string ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    pack(dest, src) {
        return `${dest}=jsvalCreateString(${src}.c_str());\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalToStdString(${src});\n`;
        /*return `
            int ${dest}_len=jsvalGetSize(${src});
            char ${dest}_str[${dest}_len+1];
            jsvalReadString(${src},${dest}_str);
            ${dest}=std::string(${dest}_str);
        `;*/
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }
}

class BufferTypeStrategy {
    nativeDecl(name) {
        return `std::vector<uint8_t> ${name};\n`;
    }

    nativeParam(name) {
        return `std::vector<uint8_t> ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    pack(dest, src) {
        return `${dest}=jsvalCreateBuffer(${src}.data(),${src}.size());\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalToStdUint8Vector(${src});\n`;
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }
}

class ObjectTypeStrategy {
    constructor(typeDef, {idl, prefix}) {
        this.typeDef=typeDef;
        this.prefix=prefix;
        this.clsdef=idlGetClass(idl,this.typeDef.type);
        if (!this.clsdef)
            throw new Error("Unknown type: "+this.typeDef.type);
    }

    getTemplateParam() {
        if (this.clsdef.namespace)
            return `${this.clsdef.namespace}::${this.typeDef.type}`;

        return `${this.typeDef.type}`;
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
            //return `printf("packing promise!!!\\n"); abort(); `;
            return `${dest}=packPromise<${this.getTemplateParam()}>(${src},${id});`
        }

        return `${dest}=pack<${this.getTemplateParam()}>(${src},${id});`
    }

    cleanup(name) {
        return `jsvalFree(${name});\n`
    }
}

export function createTypeStrategy(typeDef, {idl, prefix}) {
    switch (typeDef.type) {
        case "int":
            return new IntTypeStrategy(typeDef);
            break;

        case "float":
            return new FloatTypeStrategy();
            break;

        case "string":
            return new StringTypeStrategy();
            break;

        case "buffer":
            return new BufferTypeStrategy();
            break;

        default:
            if (!idlGetClass(idl,typeDef.type))
                throw new Error("Unknown type: "+typeDef.type);

            return new ObjectTypeStrategy(typeDef, {idl, prefix});
            break;
    }
}