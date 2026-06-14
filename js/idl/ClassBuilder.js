import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {ifdefWrap} from "../utils/lang-util.js";
import {createFuncBuilder} from "./FuncBuilder.js";

export default class ClassBuilder {
	constructor({idl, cls, prefix}) {
		this.idl=idl;
		this.cls=cls;
		this.prefix=prefix;
	}

    ts(type) {
        return createTypeStrategy(type, {idl: this.idl, prefix: this.prefix});
    }

    fs(func) {
        return createFuncBuilder({idl: this.idl, prefix: this.prefix, func});
    }

    getCtorFunc() {
        return ({
            name: this.cls.name,
            args: this.cls.ctorArgs,
            return: {type: "void"},
            ctor: true
        });
    }

	generateSignature() {
		return ifdefWrap(this.cls.ifdef,`
            class ${this.cls.name} {
            public:
                ${this.fs(this.getCtorFunc()).generateSignature()}
                ${this.cls.methods.map(m=>this.fs(m).generateSignature()).join("\n")}
            };
		`);
	}

    getId() {
        let names=this.idl.classes.map(f=>f.name);
        return names.indexOf(this.cls.name);
    }

    generateFrontendStub() {
        let func=this.getCtorFunc();
        let args=func.args.map((a,i)=>this.ts(a).nativeParam(`arg_${i}`)).join(",");

        return ifdefWrap(this.cls.ifdef,`
            ${this.cls.name}::${this.cls.name}(${args}) {
                std::vector<uint8_t> req;
                size_t numParams=${func.args.length+2};
                CborLite::encodeArraySize(req,numParams); // num params
                CborLite::encodeInteger(req,PEABIND_STREAMOP_NEW); // function call op
                CborLite::encodeInteger(req,${this.getId()}); // class id
                ${func.args.map((a,i)=>this.ts(a).cborPack("req",`arg_${i}`)).join("\n")}
                std::vector<uint8_t> res=${this.prefix}frontend->query(req);
            }
        `);
    }
}

export function createClassBuilder({idl, cls, prefix}) {
	return new ClassBuilder({idl, cls, prefix});
}