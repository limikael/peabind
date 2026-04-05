#include "basic.h"

int hello(int a, int b) {
	return a+b;
}

int hello2() {
	return 222;
}

std::shared_ptr<Hello> createHello() {
	std::shared_ptr<Hello> h=std::make_shared<Hello>();

	return h;
}