import {createTypeStrategy} from "../peabind/peabind-jsval-types.js";
import {ifdefWrap} from "../utils/lang-util.js";
import {idlGetClass} from "../peabind/peabind-idl.js";
import FunctionRenderer from "../idl/FunctionRenderer.js";

export default class StreamBackendFunctionRenderer extends FunctionRenderer {
	generateBackendStub() {
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
                let extName=this.idlRenderer.cr(this.func.className).getExtClassName();
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
	}
}