import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {ifdefWrap} from "../utils/lang-util.js";
import {idlGetClass} from "../peabind/peabind-idl.js";
import {createClassBuilder} from "./ClassBuilder.js";

export default class FunctionRenderer {
	constructor({idl, func, prefix, idlRenderer}) {
		this.idl=idl;
		this.func=func;
		this.prefix=prefix;
        this.idlRenderer=idlRenderer;

        if (!this.idlRenderer)
            throw new Error("got no renderer!!!");

        this.cr=(...args)=>this.idlRenderer.cr(...args);
        this.tr=(...args)=>this.idlRenderer.tr(...args);
	}

	generateSignature() {
		let args=this.func.args.map(a=>this.tr(a).nativeType()).join(",");
        let typeSpec=this.tr(this.func.return).nativeType();
        if (this.func.ctor)
            typeSpec="";

		return ifdefWrap(this.func.ifdef,`
			${typeSpec} ${this.func.name}(${args});
		`);
	}

	getId() {
        if (this.func.className) {
            let cls=idlGetClass(this.idl,this.func.className)
            let clsId=this.cr(cls).getId();
            let names=cls.methods.map(f=>f.name);
            let idx=names.indexOf(this.func.name);
            if (idx<0)
                throw new Error("method not found");

            return clsId+idx;
        }

		let names=this.idl.functions.map(f=>f.name);
        if (names.indexOf(this.func.name)<0)
            throw new Error("function not found");

		return names.indexOf(this.func.name);
	}
}
