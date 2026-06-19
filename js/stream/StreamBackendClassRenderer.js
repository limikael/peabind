import ClassRenderer from "../idl/ClassRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamBackendClassRenderer extends ClassRenderer {
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
                ${func.args.map((a,i)=>this.tr(a).nativeDecl(`a${i}`)).join("\n")}
                ${func.args.map((a,i)=>this.tr(a).cborUnpackIt(`a${i}`,"it","req")).join("\n")}
                auto instance=std::make_shared<${this.getExtClassName()}>(${params});
                int objid=backend->addInstance(instance);
                CborLite::encodeInteger(res,objid);
                return res;
            }

            ${this.cls.methods.map(func=>this.fr(func).generateBackendStub()).join("\n")}
        `);
    }
}