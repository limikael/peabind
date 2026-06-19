import ClassRenderer from "../idl/ClassRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamFrontendClassRenderer extends ClassRenderer {
    generateFrontendStub() {
        let func=this.getCtorFunc();
        let args=func.args.map((a,i)=>this.tr(a).nativeParam(`arg_${i}`)).join(",");

        return ifdefWrap(this.cls.ifdef,`
            ${this.cls.name}::${this.cls.name}(${args}) {
                std::vector<uint8_t> req;
                size_t numParams=${func.args.length+2};
                CborLite::encodeArraySize(req,numParams); // num params
                CborLite::encodeInteger(req,PEABIND_STREAMOP_NEW); // new op
                CborLite::encodeInteger(req,${this.getId()}); // class id
                ${func.args.map((a,i)=>this.tr(a).cborPack("req",`arg_${i}`)).join("\n")}
                //printf("doing new q\\n");
                std::vector<uint8_t> res=${this.prefix}frontend->query(req);
                auto it=res.begin();
                CborLite::decodeInteger(it,res.end(),instanceId);
            }

            ${this.cls.name}::${this.cls.name}(InstanceIdTag instanceIdTag) {
                instanceId=instanceIdTag.instanceId;
            }

            ${this.cls.name}::~${this.cls.name}() {
                std::vector<uint8_t> req;
                size_t numParams=2;
                CborLite::encodeArraySize(req,numParams);
                CborLite::encodeInteger(req,PEABIND_STREAMOP_DELETE);
                CborLite::encodeInteger(req,instanceId);
                ${this.prefix}frontend->query(req);
            }

            std::shared_ptr<${this.cls.name}> ${this.cls.name}::createInstanceProxy(int instanceId_) {
                //printf("creating instance proxy...");
                return std::make_shared<${this.cls.name}>(InstanceIdTag{instanceId_});
            }

            ${this.cls.methods.map(m=>this.fr(m).generateFrontendStub()).join("")}
        `);
    }
}