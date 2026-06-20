#include "PeabindStreamFrontend.h"
#include <cassert>

PeabindStreamFrontend::PeabindStreamFrontend(StreamTransport* streamTransport_) {
	streamTransport=streamTransport_;
	cborStream=new CborStream(streamTransport);
	//printf("frontend ctor\n");
}

PeabindStreamFrontend::~PeabindStreamFrontend() {
	delete cborStream;
	//printf("frontend dtor\n");
}

void PeabindStreamFrontend::loop() {
	while (cborStream->available()) {
		std::vector<uint8_t> msg=cborStream->read();
		handleMessage(msg);
	}
}

void PeabindStreamFrontend::handleEmit(std::vector<uint8_t> msg) {
	size_t size;
	int opcode,listenerId;
	auto it=msg.begin();

	CborLite::decodeArraySize(it,msg.end(),size);
	CborLite::decodeInteger(it,msg.end(),opcode);
	CborLite::decodeInteger(it,msg.end(),listenerId);

	if (listeners.find(listenerId)==listeners.end()) // FIX
		return;

	listeners[listenerId]->emit(msg);

	//printf("handle emit: %d\n",listenerId);
}

void PeabindStreamFrontend::handleMessage(std::vector<uint8_t> msg) {
	size_t size;
	int opcode;
	auto it=msg.begin();

	CborLite::decodeArraySize(it,msg.end(),size);
	CborLite::decodeInteger(it,msg.end(),opcode);

	switch (opcode) {
		case PEABIND_STREAMOP_EMIT:
			handleEmit(msg);
			break;

		default:
			assert(0 && "unexpected op code");
			break;
	}
}

std::vector<uint8_t> PeabindStreamFrontend::query(std::vector<uint8_t> req) {
	cborStream->write(req);
	std::vector<uint8_t> res;

	while (true) {
		res=cborStream->read();

		size_t size;
		int opcode;
		auto it=res.begin();

		CborLite::decodeArraySize(it,res.end(),size);
		CborLite::decodeInteger(it,res.end(),opcode);
		if (opcode==PEABIND_STREAMOP_RETURN)
			return res;

		handleMessage(res);
	}

	// not reached
    return res;
}

int PeabindStreamFrontend::addEventListener(int instanceId, int eventId, std::function<void()> fn) {
	std::vector<uint8_t> req;
	size_t arraySize=3;
	CborLite::encodeArraySize(req,arraySize);
	CborLite::encodeInteger(req,PEABIND_STREAMOP_ON);
	CborLite::encodeInteger(req,instanceId);
	CborLite::encodeInteger(req,eventId);

	std::vector<uint8_t> res=query(req);
	auto it=res.begin();
	size_t resSize;
	int resOpCode,listenerId;
	CborLite::decodeArraySize(it,res.end(),resSize);
	CborLite::decodeInteger(it,res.end(),resOpCode);
	CborLite::decodeInteger(it,res.end(),listenerId);

	listeners[listenerId]=std::make_unique<StreamFrontendListener>(fn);

	//printf("adding... instanceId=%d, eventId=%d, handlerId=%d\n",instanceId,eventId,resHandlerId);

	return listenerId;
}