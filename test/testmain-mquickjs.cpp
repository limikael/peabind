#include <stdio.h>

void test_jsval_mqjs_basic();
void test_jsval_size();
void test_jsval_mqjs_borrow();
void test_mqjs_basic();

int main() {
	printf("Running mquickjs tests...\n");

	test_jsval_mqjs_basic();
	test_jsval_size();
	test_jsval_mqjs_borrow();
	//test_mqjs_basic();

	return 0;
}