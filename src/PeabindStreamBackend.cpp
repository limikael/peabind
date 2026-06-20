#include "PeabindStreamBackend.h"
#include <cassert>

PeabindStreamBackend::PeabindStreamBackend(StreamTransport* streamTransport_) {
	streamTransport=streamTransport_;
	cborStream=new CborStream(streamTransport);
}

PeabindStreamBackend::~PeabindStreamBackend() {
	delete cborStream;
}

std::vector<uint8_t> PeabindStreamBackend::handleCall(std::vector<uint8_t> req) {
	std::vector<uint8_t> res;
	auto it=req.begin();
	size_t items;
	int opcode,funcid;

	CborLite::decodeArraySize(it,req.end(),items);
	CborLite::decodeInteger(it,req.end(),opcode);
	CborLite::decodeInteger(it,req.end(),funcid);

	if (functions.find(funcid)==functions.end()) { // FIXME
        assert(0 && "unknown function");
		return res;
    }

	res=functions[funcid](this,req);

	return res;
}

std::vector<uint8_t> PeabindStreamBackend::handleNew(std::vector<uint8_t> req) {
    std::vector<uint8_t> res;
    auto it=req.begin();
    size_t items;
    int opcode,clsid;

    CborLite::decodeArraySize(it,req.end(),items);
    CborLite::decodeInteger(it,req.end(),opcode);
    CborLite::decodeInteger(it,req.end(),clsid);

    if (constructors.find(clsid)==constructors.end()) // FIXME
        return res;

    res=constructors[clsid](this,req);

    return res;
}

std::vector<uint8_t> PeabindStreamBackend::handleDelete(std::vector<uint8_t> req) {
    std::vector<uint8_t> res;
    auto it=req.begin();
    size_t items;
    int opcode,instanceId;

    CborLite::decodeArraySize(it,req.end(),items);
    CborLite::decodeInteger(it,req.end(),opcode);
    CborLite::decodeInteger(it,req.end(),instanceId);

    //printf("delete id: %d\n",instanceId);
    instances.erase(instanceId);

    size_t arraySize=1;
    CborLite::encodeArraySize(res,arraySize);
    CborLite::encodeInteger(res,PEABIND_STREAMOP_RETURN);

    return res;
}

std::vector<uint8_t> PeabindStreamBackend::handleOn(std::vector<uint8_t> req) {
    auto it=req.begin();
    size_t items;
    int opcode,instanceId,eventId;

    CborLite::decodeArraySize(it,req.end(),items);
    CborLite::decodeInteger(it,req.end(),opcode);
    CborLite::decodeInteger(it,req.end(),instanceId);
    CborLite::decodeInteger(it,req.end(),eventId);

    return onHandler(this,instanceId,eventId);
}

void PeabindStreamBackend::loop() {
	if (cborStream->available()) {
		std::vector<uint8_t> req=cborStream->read();
        std::vector<uint8_t> res;
        auto it=req.begin();
        size_t items;
        int opcode;

        CborLite::decodeArraySize(it,req.end(),items);
        CborLite::decodeInteger(it,req.end(),opcode);

        //printf("opcode: %d\n",opcode);

        switch (opcode) {
            case PEABIND_STREAMOP_CALL:
            	res=handleCall(req);
            	break;

            case PEABIND_STREAMOP_NEW:
                res=handleNew(req);
            	break;

            case PEABIND_STREAMOP_DELETE:
            	res=handleDelete(req);
            	break;

            case PEABIND_STREAMOP_ON:
                res=handleOn(req);
                break;

            default:
                assert(0 && "unknown op");
                break;
        }

        cborStream->write(res);
	}
}

int PeabindStreamBackend::addInstance(std::shared_ptr<void> instance) {
	int instanceId=nextInstanceId++;
	instances[instanceId]=instance;

	return instanceId;
}

void PeabindStreamBackend::addFunction(int id, PeabindStreamBackendFunction* f) {
	functions[id]=f;
}

void PeabindStreamBackend::addClass(int id, PeabindStreamBackendFunction* f) {
	constructors[id]=f;
}

std::shared_ptr<void> PeabindStreamBackend::getInstance(int instanceId) {
    if (instances.find(instanceId)==instances.end())
        return nullptr;

    return instances[instanceId];
}
