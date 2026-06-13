import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class FuncBuilder {
	constructor({idl, func, prefix}) {
		this.idl=idl;
		this.func=func;
		this.prefix=prefix;
	}

    ts(type) {
        return createTypeStrategy(type, {idl: this.idl, prefix: this.prefix});
    }

	generateSignature() {
		let args=this.func.args.map(a=>this.ts(a).nativeType()).join(",");
        let typeSpec=this.ts(this.func.return).nativeType();
        if (this.func.ctor)
            typeSpec="";

		return ifdefWrap(this.func.ifdef,`
			${typeSpec} ${this.func.name}(${args});
		`);
	}

	getId() {
		let names=this.idl.functions.map(f=>f.name);
		return names.indexOf(this.func.name);
	}

	generateBackendStub() {
        let name,callTarget;//,prelude,,argStart;
        if (this.func.className) {
            throw new Error("unimpl...");
            /*if (func.static) {
                name=`${this.prefix}${func.className}_${func.name}`;
                prelude="";
                callTarget=`${this.getExtClassName(func.className)}::${func.name}`
            }

            else {
                name=`${this.prefix}${func.className}_${func.name}`;
                prelude=`
                    Opaque *opaque=(Opaque *)jsvalGetOpaque(thisobj);
                    assert(opaque!=NULL);
                    std::shared_ptr<${this.getExtClassName(func.className)}> instance=std::static_pointer_cast<${this.getExtClassName(func.className)}>(opaque->instance);
                `;
                callTarget=`instance->${func.name}`;
            }*/
        }

        else {
            name=`${this.prefix}${this.func.name}`;
            callTarget=`${this.func.name}`;
            //prelude="";
            if (this.func.namespace)
                callTarget=`${this.func.namespace}::${this.func.name}`
        }

        let call;
        if (this.func.return.type=="void" && !this.func.return.promise) {
            call=`
                ${callTarget}(${this.func.args.map((arg,i)=>`a${i}`).join(",")});
            `;
        }

        else {
            call=`
                ${this.ts(this.func.return).nativeDecl("ret")}
                ret=${callTarget}(${this.func.args.map((arg,i)=>`a${i}`).join(",")});
                ${this.ts(this.func.return).cborPack("res","ret")}
            `;
        }

        return ifdefWrap(this.func.ifdef,`
            static std::vector<uint8_t> ${name}(std::vector<uint8_t> req) {
        		//printf("calling backend func\\n");
        		std::vector<uint8_t> res;
        		auto it=req.begin();
            	size_t items;
				CborLite::decodeArraySize(it,req.end(),items);
                int opcode,funcid;
                CborLite::decodeInteger(it,req.end(),opcode);
                CborLite::decodeInteger(it,req.end(),funcid);
                ${this.func.args.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${this.func.args.map((a,i)=>this.ts(a).cborUnpackIt(`a${i}`,"it","req")).join("\n")}
                ${call}
                return res;
            }
        `);
	}

	generateFrontendImpl() {
		let args=this.func.args.map((a,i)=>this.ts(a).nativeParam(`arg_${i}`)).join(",");

        let prelude="";
        if (this.func.return.type!="void" || this.func.return.promise) {
            prelude=`
                ${this.ts(this.func.return).nativeDecl("ret")}
                ${this.ts(this.func.return).cborUnpack("ret","res")}
                return ret;
            `;
        }

		return ifdefWrap(this.func.ifdef,`
			${this.ts(this.func.return).nativeType()} ${this.func.name}(${args}) {
				std::vector<uint8_t> req;
				size_t numParams=${this.func.args.length+2};
				CborLite::encodeArraySize(req,numParams); // num params
				CborLite::encodeInteger(req,1); // function call op
				CborLite::encodeInteger(req,1000+${this.getId()}); // function id
				${this.func.args.map((a,i)=>this.ts(a).cborPack("req",`arg_${i}`)).join("\n")}
				std::vector<uint8_t> res=${this.prefix}query(req);
				${prelude}
			}
		`);
	}
}

export function createFuncBuilder({idl, func, prefix}) {
	return new FuncBuilder({idl, func, prefix});
}