import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {ifdefWrap} from "../utils/lang-util.js";
import {idlGetClass} from "../peabind/peabind-idl.js";
import {createClassBuilder} from "./ClassBuilder.js";

export default class FuncBuilder {
	constructor({idl, func, prefix, idlRenderer}) {
		this.idl=idl;
		this.func=func;
		this.prefix=prefix;
        this.idlRenderer=idlRenderer;

        if (!this.idlRenderer)
            throw new Error("got no renderer!!!");

        this.cls=(...args)=>this.idlRenderer.cls(...args);
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
            let clsId=this.cls(cls).getId();
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

	/*generateBackendStub() {
        let name,callTarget,prelude;
        if (this.func.className) {
            if (this.func.static) {
                throw new Error("unimpl...");
                name=`${this.prefix}${this.func.className}_${this.func.name}`;
                prelude="";
                callTarget=`${this.getExtClassName(this.func.className)}::${this.func.name}`
            }

            else {
                name=`${this.prefix}${this.func.className}_${this.func.name}`;
                let extName=this.cs(this.func.className).getExtClassName();
                prelude=`
                    std::shared_ptr<${extName}> instance=std::static_pointer_cast<${extName}>(backend->getInstance(thisid));
                `;
                callTarget=`instance->${this.func.name}`;
            }
        }

        else {
            name=`${this.prefix}${this.func.name}`;
            callTarget=`${this.func.name}`;
            prelude="";
            if (this.func.namespace)
                callTarget=`${this.func.namespace}::${this.func.name}`
        }

        let call;
        if (this.func.return.type=="void" && !this.func.return.promise) {
            call=`
                ${callTarget}(${this.func.args.map((arg,i)=>`a${i}`).join(",")});
                CborLite::encodeInteger(res,-1);
            `;
        }

        else {
            call=`
                ${this.tr(this.func.return).nativeDecl("ret")}
                ret=${callTarget}(${this.func.args.map((arg,i)=>`a${i}`).join(",")});
                ${this.tr(this.func.return).cborPack("res","ret")}
            `;
        }

        return ifdefWrap(this.func.ifdef,`
            static std::vector<uint8_t> ${name}(PeabindStreamBackend* backend, std::vector<uint8_t> req) {
        		//printf("calling backend func\\n");
        		std::vector<uint8_t> res;
        		auto it=req.begin();
            	size_t items;
				CborLite::decodeArraySize(it,req.end(),items);
                int opcode,funcid,thisid;
                CborLite::decodeInteger(it,req.end(),opcode);
                CborLite::decodeInteger(it,req.end(),funcid);
                CborLite::decodeInteger(it,req.end(),thisid);
                ${this.func.args.map((a,i)=>this.tr(a).nativeDecl(`a${i}`)).join("\n")}
                ${this.func.args.map((a,i)=>this.tr(a).cborUnpackIt(`a${i}`,"it","req")).join("\n")}
                ${prelude}
                ${call}
                return res;
            }
        `);
	}*/

	generateFrontendStub() {
		let args=this.func.args.map((a,i)=>this.tr(a).nativeParam(`arg_${i}`)).join(",");
        let declName=this.func.name;
        let instanceIdExpr="0";
        if (this.func.className) {
            declName=`${this.func.className}::${this.func.name}`;
            instanceIdExpr="instanceId";
        }

        let epilogue="";
        if (this.func.return.type!="void" || this.func.return.promise) {
            epilogue=`
                ${this.tr(this.func.return).nativeDecl("ret")}
                ${this.tr(this.func.return).cborUnpack("ret","res")}
                return ret;
            `;
        }

		return ifdefWrap(this.func.ifdef,`
			${this.tr(this.func.return).nativeType()} ${declName}(${args}) {
				std::vector<uint8_t> req;
				size_t numParams=${this.func.args.length+3};
                int thisId=${instanceIdExpr};
				CborLite::encodeArraySize(req,numParams);
                CborLite::encodeInteger(req,PEABIND_STREAMOP_CALL);
				CborLite::encodeInteger(req,${this.getId()});
                CborLite::encodeInteger(req,thisId);
				${this.func.args.map((a,i)=>this.tr(a).cborPack("req",`arg_${i}`)).join("\n")}
				std::vector<uint8_t> res=${this.prefix}frontend->query(req);
				${epilogue}
			}
		`);
	}
}

export function createFuncBuilder({idl, func, prefix}) {
	return new FuncBuilder({idl, func, prefix});
}