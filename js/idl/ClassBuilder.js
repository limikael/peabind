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
                ~${this.cls.name}();
                ${this.cls.methods.map(m=>this.fs(m).generateSignature()).join("\n")}
                int instanceId;
            };
		`);
	}

    getId() {
        let names=this.idl.classes.map(c=>c.name);
        if (names.indexOf(this.cls.name)<0)
            throw new Error("unknown class: "+this.cls.name);

        return ((1+names.indexOf(this.cls.name))*1000);
    }

    generateFrontendStub() {
        let func=this.getCtorFunc();
        let args=func.args.map((a,i)=>this.ts(a).nativeParam(`arg_${i}`)).join(",");

        return ifdefWrap(this.cls.ifdef,`
            ${this.cls.name}::${this.cls.name}(${args}) {
                std::vector<uint8_t> req;
                size_t numParams=${func.args.length+2};
                CborLite::encodeArraySize(req,numParams); // num params
                CborLite::encodeInteger(req,PEABIND_STREAMOP_NEW); // new op
                CborLite::encodeInteger(req,${this.getId()}); // class id
                ${func.args.map((a,i)=>this.ts(a).cborPack("req",`arg_${i}`)).join("\n")}
                //printf("doing new q\\n");
                std::vector<uint8_t> res=${this.prefix}frontend->query(req);
                auto it=res.begin();
                CborLite::decodeInteger(it,res.end(),instanceId);
            }

            ${this.cls.name}::~${this.cls.name}() {
                std::vector<uint8_t> req;
                size_t numParams=2;
                CborLite::encodeArraySize(req,numParams);
                CborLite::encodeInteger(req,PEABIND_STREAMOP_DELETE);
                CborLite::encodeInteger(req,instanceId);
                ${this.prefix}frontend->query(req);
            }

            ${this.cls.methods.map(m=>this.fs(m).generateFrontendStub()).join("")}
        `);
    }

    getExtClassName() {
        let name=this.cls.name;
        if (this.cls.namespace)
            name=`${this.cls.namespace}::${this.cls.name}`;

        return name;
    }

    generateBackendStub() {
        let func=this.getCtorFunc();
        let params=this.cls.ctorArgs.map((a,i)=>`a${i}`).join(",");

        return ifdefWrap(this.cls.ifdef,`
            static std::vector<uint8_t> ${this.prefix}${this.cls.name}_constructor(PeabindStreamBackend* backend, std::vector<uint8_t> req) {
                //printf("ctor\\n");
                std::vector<uint8_t> res;
                auto it=req.begin();
                size_t items;
                CborLite::decodeArraySize(it,req.end(),items);
                int opcode,clsid;
                CborLite::decodeInteger(it,req.end(),opcode);
                CborLite::decodeInteger(it,req.end(),clsid);
                ${func.args.map((a,i)=>this.ts(a).nativeDecl(`a${i}`)).join("\n")}
                ${func.args.map((a,i)=>this.ts(a).cborUnpackIt(`a${i}`,"it","req")).join("\n")}
                auto instance=std::make_shared<${this.getExtClassName()}>(${params});
                int objid=backend->addInstance(instance);
                CborLite::encodeInteger(res,objid);
                return res;
            }

            ${this.cls.methods.map(func=>this.fs(func).generateBackendStub()).join("\n")}
        `);
    }
}

export function createClassBuilder({idl, cls, prefix}) {
	return new ClassBuilder({idl, cls, prefix});
}