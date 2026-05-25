#include "basic.h"

int liveHelloCount=0;

int mynamespace::hello3() {
	return 333;
}

int getLiveHelloCount() {
	return liveHelloCount;
}

int hello(int a, int b) {
	return a+b;
}

int hello2() {
	return 222;
}

std::string hellos(std::string s, std::string t) {
	return s+t;
}

std::shared_ptr<Hello> globalHello;

void removeHello() {
	globalHello=nullptr;
}

std::shared_ptr<Hello> createHello() {
	if (!globalHello) {
		//printf("creating the global hello...\n");

//		globalHello=std::make_shared<Hello>();
		globalHello=Hello::create();//std::make_shared<Hello>();
	}

	//printf("setting the global hello...\n");
	globalHello->setVal(666);

	return globalHello;
}

void setHelloVal(std::shared_ptr<Hello> hello, int val) {
	hello->setVal(val);
}

int getHelloVal(std::shared_ptr<Hello> hello) {
	return hello->getVal();
}

int hellof(float f) {
	return (f*10.0);
}

float hellothird(int i) {
	float f=((float)i)/3;
	return f;
}

std::vector<uint8_t> createBuffer() {
	std::vector<uint8_t> buffer = {11,22,33,44,55,66,77,88,99,00};
	return buffer;
}

int peekBuffer(std::vector<uint8_t> buffer, int i) {
	return buffer[i];
}

static Promise<int> pendingInt;
static Promise<std::string> pendingString;
static Promise<void> pendingVoid;

Promise<int> getPromisedInt() {
	pendingInt=Promise<int>();
	return pendingInt;
}

void resolvePromisedInt(int v) {
	pendingInt.resolve(v);
}

void rejectPromisedInt(std::string reason) {
	pendingInt.reject(reason);
}

Promise<std::string> getPromisedString() {
	pendingString=Promise<std::string>();
	return pendingString;
}

void resolvePromisedString(std::string s) {
	pendingString.resolve(s);
}

Promise<void> getPromisedVoid() {
	pendingVoid=Promise<void>();
	return pendingVoid;
}

void resolvePromisedVoid() {
	pendingVoid.resolve();
}

void clearPendingPromises() {
	pendingInt=Promise<int>();
	pendingString=Promise<std::string>();
	pendingVoid=Promise<void>();
}
