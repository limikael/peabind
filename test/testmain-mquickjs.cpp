#include <stdio.h>

void test_jsval_mqjs_basic();
void test_jsval_size();

int main() {
	printf("Running mquickjs tests...\n");

	test_jsval_mqjs_basic();
	test_jsval_size();

	return 0;
}