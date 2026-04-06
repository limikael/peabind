#pragma once
#include <memory>

int hello(int a, int b);
int hello2();

class Hello {
public:
	Hello() {
		val=100;
		//printf("creating hello, val=%d\n",val);
	}

	~Hello() {
		//printf("destroying hello...\n");
	}

	int getVal() {
		//printf("getting val: %d\n",val);
		return val;
	}

	void setVal(int val_) {
		//printf("setting val: %d\n",val_);
		val=val_;
	}

	int val;
};

std::shared_ptr<Hello> createHello();
