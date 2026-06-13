#pragma once
#include <memory>
#include <vector>
#include <cstdint>
#include "StreamTransport.h"
#include "cbor-lite/codec.h"

class CborStream {
public:
	CborStream(StreamTransport &transport_);
	std::vector<uint8_t> read();
	//void loop();
	bool available();
	void write(std::vector<uint8_t> v);
	StreamTransport* getTransport() { return &transport; }

private:
	StreamTransport& transport;
	std::vector<uint8_t> buffer;
};
