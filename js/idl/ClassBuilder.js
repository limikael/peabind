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

	/*getId() {
		let names=this.idl.functions.map(f=>f.name);
		return names.indexOf(this.func.name);
	}*/
}

export function createClassBuilder({idl, cls, prefix}) {
	return new ClassBuilder({idl, cls, prefix});
}