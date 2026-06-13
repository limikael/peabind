#include "CborStream.h"
#include "cbor-util.h"

CborStream::CborStream(StreamTransport& transport_)
		:transport(transport_) {
}

void CborStream::loop() {
	while (transport.available())
		buffer.push_back(transport.read());
}

bool CborStream::available() {
	loop();

	ssize_t size=cborByteSize(buffer.begin(),buffer.end());
	return (size>0);
}

std::vector<uint8_t> CborStream::read() {
	loop();

	ssize_t size=cborByteSize(buffer.begin(),buffer.end());
	std::vector<uint8_t> res;
	res.insert(res.begin(),buffer.begin(),buffer.begin()+size);
	buffer.erase(buffer.begin(),buffer.begin()+size);
	return res;
}

void CborStream::write(std::vector<uint8_t> v) {
	for (int i=0; i<v.size(); i++)
		transport.write(v[i]);
}
