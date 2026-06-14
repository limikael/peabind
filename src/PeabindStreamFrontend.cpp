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

std::vector<uint8_t> PeabindStreamFrontend::query(std::vector<uint8_t> req) {
	cborStream->write(req);
    return cborStream->read();
}