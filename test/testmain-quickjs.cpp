#include <stdio.h>

void test_jsval_size();
void test_jsval_borrow();
void test_jsval_classid();
void test_basic();
void test_events();
void test_types();
void test_event_types();
void test_strings();
void test_gc();
void test_buffers();
void test_exceptions();
void test_throw_exceptions();
void test_refactor_obj();
void test_static_methods();
void test_wrong_type();
void test_microtasks();
void test_promises();
void test_promises_lifetime();

int main() {
	printf("Running tests...\n");

	test_wrong_type();
	test_static_methods();
	test_refactor_obj();
	test_jsval_size();
	test_jsval_borrow();
	test_jsval_classid();
	test_exceptions();
	test_throw_exceptions();
	test_microtasks();
	test_basic();
	test_buffers();
	test_events();
	test_types();
	test_event_types();
	test_strings();
	test_gc();
	test_promises();
	test_promises_lifetime();

	return 0;
}