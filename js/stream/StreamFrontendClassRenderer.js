import ClassRenderer from "../idl/ClassRenderer.js";
import {ifdefWrap} from "../utils/lang-util.js";

export default class StreamFrontendClassRenderer extends ClassRenderer {
    generateSignature() {
        return ifdefWrap(this.cls.ifdef,`
            class ${this.cls.name}: public StreamFrontendProxy {
            public:
                ${this.fr(this.getCtorFunc()).generateSignature()}
                ${this.cls.name}(InstanceIdTag instanceIdTag);
                ~${this.cls.name}();
                ${this.cls.methods.map(m=>this.fr(m).generateSignature()).join("\n")}
                static std::shared_ptr<${this.cls.name}> createInstanceProxy(int instanceId_);
                ${this.getEventNames().map(e=>this.er(e).generateSignature()).join("\n")}
                void initFrontendProxy();
            };
        `);
    }

    generateForwardSignature() {
        return ifdefWrap(this.cls.ifdef,`
            class ${this.cls.name};
        `);
    }

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
                size_t arraySize;
                CborLite::decodeArraySize(it,res.end(),arraySize);
                int returnOpCode;
                CborLite::decodeInteger(it,res.end(),returnOpCode);
                assert(returnOpCode==PEABIND_STREAMOP_RETURN);
                CborLite::decodeInteger(it,res.end(),instanceId);
                initFrontendProxy();
            }

            ${this.cls.name}::${this.cls.name}(InstanceIdTag instanceIdTag) {
                instanceId=instanceIdTag.instanceId;
                initFrontendProxy();
            }

            ${this.cls.name}::~${this.cls.name}() {
                std::vector<uint8_t> req;
                size_t numParams=2;
                CborLite::encodeArraySize(req,numParams);
                CborLite::encodeInteger(req,PEABIND_STREAMOP_DELETE);
                CborLite::encodeInteger(req,instanceId);
                std::vector<uint8_t> res=${this.prefix}frontend->query(req);
                auto it=res.begin();
                size_t arraySize;
                CborLite::decodeArraySize(it,res.end(),arraySize);
                assert(arraySize==1);
                int returnOpCode;
                CborLite::decodeInteger(it,res.end(),returnOpCode);
                assert(returnOpCode==PEABIND_STREAMOP_RETURN);
                this->frontend->liveObjectCount--;
                assert(this->frontend->liveObjectCount>=0);
            }

            std::shared_ptr<${this.cls.name}> ${this.cls.name}::createInstanceProxy(int instanceId_) {
                //printf("creating instance proxy...");
                return std::make_shared<${this.cls.name}>(InstanceIdTag{instanceId_});
            }

            ${this.cls.methods.map(m=>this.fr(m).generateFrontendStub()).join("")}

            void ${this.cls.name}::initFrontendProxy() {
                assert(${this.prefix}frontend && "no frontend active");
                this->frontend=${this.idlRenderer.prefix}frontend;
                this->frontend->liveObjectCount++;
                ${this.getEventNames().map(e=>this.er(e).generateProxyInit()).join("\n")}
            }
        `);
    }
}