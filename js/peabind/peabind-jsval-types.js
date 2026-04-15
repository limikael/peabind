import {peabindNormalize, idlGetClass} from "./peabind-idl.js";

class IntTypeStrategy {
    nativeDecl(name) {
        return `int32_t ${name};\n`;
    }

    nativeParam(name) {
        return `int ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    unpack(dest, src) {
        return `${dest}=jsvalGetInt(${src});\n`;
    }

    pack(dest, src) {
        return `${dest}=jsvalCreateInt(${src});\n`;
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
}

class ObjectTypeStrategy {
    constructor(typeDef, {idl, prefix}) {
        this.typeDef=typeDef;
        this.prefix=prefix;
    }

    nativeDecl(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name};\n`;
    }

    nativeParam(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name}`;
    }

    abiDecl(name) {
        return `JSVAL ${name};\n`;
    }

    unpack(dest, src) {
        return `${dest}=unpack<${this.typeDef.type}>(${src});`;
    }

    pack(dest, src) {
        let id=`${this.prefix}${this.typeDef.type}_id`;
        return `${dest}=pack<${this.typeDef.type}>(${src},${id});`
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
        return `
            int ${dest}_len=jsvalGetSize(${src});
            char ${dest}_str[${dest}_len+1];
            jsvalReadString(${src},${dest}_str);
            ${dest}=std::string(${dest}_str);
        `;
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