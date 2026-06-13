#include <stdio.h>
#include "stream-backend.out.h"
#include <deque>
#include <cassert>
#include "CborStream.h"

using namespace CborLite;

class MockStreamTransport: public StreamTransport {
public:
	void loop() override {
	}

	virtual bool available() override {
		return buffer.size();
	}

	virtual int read() override {
		int res=buffer.front();
		buffer.pop_front();
		return res;
	}

	virtual void write(int value) override {
		other->buffer.push_back(value);
	}

	std::deque<uint8_t> buffer;
	MockStreamTransport *other;
};

std::pair<StreamTransport *, StreamTransport *> createMockStreamPair() {
	auto a=new MockStreamTransport();
	auto b=new MockStreamTransport();
	a->other=b;
	b->other=a;

	return std::make_pair(a,b);
}

void test_stream() {
	fprintf(stderr,"- Stream...\n");
	auto p=createMockStreamPair();
	auto a=p.first, b=p.second;
	int i;

	assert(!b->available());

	a->write(123);
	a->write(125);
	assert(b->available());
	i=b->read();
	assert(i==123);
	i=b->read();
	assert(i==125);
	assert(!b->available());

	delete p.first;
	delete p.second;
}

void test_cbor() {
	fprintf(stderr,"- Cbor stream...\n");
	auto p=createMockStreamPair();
	auto a=new CborStream(*(p.first)), b=new CborStream(*(p.second));

    std::vector<unsigned char> outm;
    size_t size=5;
    encodeArraySize(outm,size);
    encodeInteger(outm,101);
    encodeInteger(outm,102);
    encodeInteger(outm,103);
    encodeInteger(outm,104);
    encodeInteger(outm,105);
	a->write(outm);

	outm.clear();
    encodeInteger(outm,42);
	a->write(outm);

	assert(b->available());
    std::vector<unsigned char> inm1=b->read();
    auto pos=inm1.begin();
    size_t items;
    decodeArraySize(pos,inm1.end(),items);
    assert(items==5);

	assert(b->available());
    std::vector<unsigned char> inm2=b->read();
    assert(inm2.size()==2);
	assert(!b->available());
}

int main() {
	fprintf(stderr,"Running stream tests...\n");

	test_stream();
	test_cbor();

	return 0;
}