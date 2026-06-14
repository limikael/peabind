#include "PeabindStreamFrontend.h"
#include <cassert>

PeabindStreamFrontend::PeabindStreamFrontend(StreamTransport* streamTransport_) {
	streamTransport=streamTransport_;
	cborStream=new CborStream(streamTransport);
}

PeabindStreamFrontend::~PeabindStreamFrontend() {
	delete cborStream;
}

std::vector<uint8_t> PeabindStreamFrontend::query(std::vector<uint8_t> req) {
	cborStream->write(req);
    return cborStream->read();
}