#include <stdio.h>

void test_basic();
void test_events();
void test_types();
void test_event_types();
void test_strings();
void test_gc();
void test_jsval_size();
void test_buffers();

int main() {
	printf("Running tests...\n");

	test_jsval_size();

	test_basic();
	test_buffers();
	test_events();
	test_types();
	test_event_types();
	test_strings();
	test_gc();

	return 0;
}