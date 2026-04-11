import {peabindNormalize, idlGetClass} from "./peabind-idl.js";

class IntTypeStrategy {
    decl(name) {
        return `int32_t ${name};\n`;
    }

    unpack(dest, src) {
        return `JS_ToInt32(ctx,&${dest},${src});\n`;
    }

    param(name) {
        return `int ${name}`;
    }

    pack(dest, src) {
        return `${dest}=JS_NewInt32(ctx,${src});\n`;
    }
}

class FloatTypeStrategy {
    decl(name) {
        return `double ${name};\n`;
    }

    unpack(dest, src) {
        return `JS_ToFloat64(ctx,&${dest},${src});\n`;
    }

    param(name) {
        return `float ${name}`;
    }

    pack(dest, src) {
        return `${dest}=JS_NewFloat64(ctx,${src});\n`;
    }
}

class ObjectTypeStrategy {
    constructor(typeDef) {
        this.typeDef=typeDef;
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

    param(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name}`;
    }

    pack(dest, src) {
        return `
            ${dest}=JS_NewInt32(ctx,store(${src}));
        `;
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

        default:
            if (!idlGetClass(idl,typeDef.type))
                throw new Error("Unknown type: "+typeDef.type);

            return new ObjectTypeStrategy(typeDef);
            break;
    }
}