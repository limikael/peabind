import {peabindNormalize, idlGetClass} from "./peabind-idl.js";

class IntTypeStrategy {
    nativeParam(name) {
        return `int ${name}`;
    }

    nativeDecl(name) {
        return `int32_t ${name};\n`;
    }

    unpack(dest, src) {
        return `JS_ToInt32(ctx,&${dest},${src});\n`;
    }

    pack(dest, src) {
        return `${dest}=JS_NewInt32(ctx,${src});\n`;
    }
}

class FloatTypeStrategy {
    nativeParam(name) {
        return `float ${name}`;
    }

    nativeDecl(name) {
        return `double ${name};\n`;
    }

    unpack(dest, src) {
        return `JS_ToFloat64(ctx,&${dest},${src});\n`;
    }

    pack(dest, src) {
        return `${dest}=JS_NewFloat64(ctx,${src});\n`;
    }
}

class ObjectTypeStrategy {
    constructor(typeDef, {idl, prefix}) {
        this.typeDef=typeDef;
        this.prefix=prefix;
    }

    nativeParam(name) {
        return `std::shared_ptr<${this.typeDef.type}> ${name}`;
    }

    nativeDecl(name) {
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

    pack(dest, src) {
        return `
            ${dest}=JS_NewInt32(ctx,store(${src}));
        `;
    }
}

class StringTypeStrategy {
    nativeParam(name) {
        return `std::string ${name}`;
    }

    nativeDecl(name) {
        return `std::string ${name};\n`;
    }

    unpack(dest, src) {
        return `
            size_t ${dest}_len;
            const char *${dest}_ptr=JS_ToCStringLen(ctx, &${dest}_len, ${src});
            ${dest}.assign(${dest}_ptr,${dest}_len);
            JS_FreeCString(ctx,${dest}_ptr);
        `;
    }

    pack(dest, src) {
        return `${dest}=JS_NewString(ctx,${src}.c_str());\n`;
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