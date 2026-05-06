#	./ext/mquickjs-main/mqjs_stdlib > lab/js_stdlib.out.h
.PHONY: mqjslab test-quickjs test-mquickjs default

default: test-quickjs test-mquickjs

test-mquickjs:
	rm -f test/*.out.*
	wrapcc gcc -o bin/mqjs_stdlib_test \
		-Iext/mquickjs-main \
		ext/mquickjs-main/mquickjs_build.c \
		test/mqjs_stdlib_test.c
	./bin/mqjs_stdlib_test -m64 > test/js_stdlib.out.h
	wrapcc gcc -g -o bin/testmain-mquickjs \
		-Wno-narrowing \
		-Iinclude \
		-Iext/mquickjs-main \
		-lm \
		test/test-jsval-mquickjs.cpp \
		test/testmain-mquickjs.cpp \
		src/jsval-mqjs.cpp \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c
	valgrind --quiet \
		--leak-check=full \
		--show-leak-kinds=all \
		--error-exitcode=1 \
		--errors-for-leak-kinds=all \
		./bin/testmain-mquickjs

test-quickjs:
	rm -f test/*.out.*

	peabind -otest/basic.out.cpp \
		spec/basic/basic.json \
		-pbasic_ \
		-tquickjs
	wrapcc g++ -o bin/testmain-quickjs \
		-std=c++20 \
		-Ispec/basic \
		-Iext/quickjs-2025-09-13 \
		spec/basic/basic.cpp \
		test/basic.out.cpp \
		test/test-basic.cpp \
		test/test-jsval-quickjs.cpp \
		test/testmain-quickjs.cpp \
		ext/quickjs-2025-09-13/libquickjs.a \
		$(shell peabind --lib-conf=cargs -tquickjs) -O0
	./bin/testmain-quickjs

#mqjslab:
#	gcc -o bin/mqjs_stdlib_lab \
#		-Iext/mquickjs-main \
#		ext/mquickjs-main/mquickjs_build.c \
#		lab/mqjs_stdlib_lab.c
#	./bin/mqjs_stdlib_lab -m64 > lab/js_stdlib.out.h
#	gcc -o bin/mquickjslab \
#		-Iext/mquickjs-main \
#		lab/mquickjslab.c \
#		ext/mquickjs-main/mquickjs.c \
#		ext/mquickjs-main/dtoa.c \
#		ext/mquickjs-main/cutils.c \
#		ext/mquickjs-main/libm.c \
#		-lm
#	./bin/mquickjslab
