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
}

class ObjectTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
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
}

class VoidTypeStrategy {
    abiType() {
        return `void`;
    }
}

export function createTypeStrategy(idl, typeDef) {
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

        default:
            if (!idlGetClass(idl,typeDef.type))
                throw new Error("Unknown type: "+typeDef.type);

            return new ObjectTypeStrategy(typeDef);
            break;
    }
}