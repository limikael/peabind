#pragma once
#include <memory>

int hello(int a, int b);
int hello2();

class Hello {
public:
	int getVal() {
		return 123;
	}
};

std::shared_ptr<Hello> createHello();
