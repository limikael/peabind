import {peabindNormalize, idlGetClass} from "./peabind-idl.js";

class IntTypeStrategy {
    decl(name) {
        return `int32_t ${name};\n`;
    }

    unpack(dest, src) {
        return `JS_ToInt32(ctx,&${dest},${src});\n`;
    }

    nativeParam(name) {
        return `int ${name}`;
    }

    pack(dest, src) {
        return `${dest}=JS_NewInt32(ctx,${src});\n`;
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

class FloatTypeStrategy {
    decl(name) {
        return `double ${name};\n`;
    }

    unpack(dest, src) {
        return `JS_ToFloat64(ctx,&${dest},${src});\n`;
    }

    nativeParam(name) {
        return `float ${name}`;
    }

    pack(dest, src) {
        return `${dest}=JS_NewFloat64(ctx,${src});\n`;
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

    decl(name) {
        return `
            int ${name}_id;
            std::shared_ptr<${this.typeDef.type}> ${name}; 
        `;
    }

    unpack(dest, src) {
        return `
            JS_ToInt32(ctx,&${dest}_id,${src});\n
            ${dest}=std::static_pointer_cast<${this.typeDef.type}>(registry[${dest}_id]);\n
        `;
    }

    nativeParam(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name}`;
    }

    pack(dest, src) {
        return `
            ${dest}=JS_NewInt32(ctx,store(${src}));
        `;
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

export function createTypeStrategy(typeDef, {idl, prefix}) {
    switch (typeDef.type) {
        case "int":
            return new IntTypeStrategy();
            break;

        case "float":
            return new FloatTypeStrategy();
            break;

        default:
            if (!idlGetClass(idl,typeDef.type))
                throw new Error("Unknown type: "+typeDef.type);

            return new ObjectTypeStrategy(typeDef, {idl, prefix});
            break;
    }
}