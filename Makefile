#	./ext/mquickjs-main/mqjs_stdlib > lab/js_stdlib.out.h
.PHONY: mqjslab test-quickjs test-mqjs test test-jsval-mqjs

test: test-quickjs test-jsval-mqjs test-mqjs test-stream

test-jsval-mqjs:
	rm -f vgcore.*
	rm -f test/*.out.*
	jsval-mqjs-stdlibgen \
		-o test/test-jsval-mqjs.bindings.out.h \
		test/test-jsval-mqjs.bindings.json
	wrapcc --linker=g++ gcc \
		-o bin/test-jsval-mqjs \
		-DJSVAL_TARGET_MQJS \
		-Iinclude \
		-Iext/mquickjs-main \
		-Wno-narrowing \
		src/jsval-mqjs.cpp \
		src/jsval-util.cpp \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c \
		test/test-jsval-mqjs.cpp
	valgrind --quiet \
		--leak-check=full \
		--show-leak-kinds=all \
		--error-exitcode=1 \
		--errors-for-leak-kinds=all \
		./bin/test-jsval-mqjs

test-mqjs:
	rm -f vgcore.*
	rm -f test/*.out.*
	peabind -otest/basic.out.cpp \
		spec/basic/basic.json \
		-pbasic_ \
		-tmqjs
	wrapcc --linker=g++ gcc -g -o bin/test-mqjs-basic \
		-Wno-narrowing \
		-Iinclude \
		-Iext/mquickjs-main \
		-Ispec/basic \
		-lm \
		spec/basic/basic.cpp \
		test/basic.out.cpp \
		test/test-mqjs-basic.cpp \
		ext/mquickjs-main/mquickjs.c \
		ext/mquickjs-main/dtoa.c \
		ext/mquickjs-main/cutils.c \
		ext/mquickjs-main/libm.c \
		$(shell peabind --lib-conf=cargs -tmqjs) -O0
	valgrind --quiet \
		--leak-check=full \
		--show-leak-kinds=all \
		--error-exitcode=1 \
		--errors-for-leak-kinds=all \
		./bin/test-mqjs-basic

test-quickjs:
	rm -f vgcore.*
	rm -f test/*.out.*
	peabind -otest/basic.out.cpp \
		spec/basic/basic.json \
		-pbasic_ \
		-tquickjs
	wrapcc g++ -g -o bin/testmain-quickjs \
		-DFULLTEST \
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
	valgrind --quiet \
		--leak-check=full \
		--show-leak-kinds=all \
		--error-exitcode=1 \
		--errors-for-leak-kinds=all \
		./bin/testmain-quickjs

test-stream:
	rm -f vgcore.*
	rm -f test/*.out.*
	peabind -otest/stream-backend.out.cpp \
		spec/basic/basic-lite.json \
		-pbasic_ \
		-tstream-backend
	peabind -otest/stream-frontend.out.cpp \
		-nBasicFrontend \
		spec/basic/basic-lite.json \
		-pbasic_ \
		-tstream-frontend
	wrapcc --linker=g++ gcc -o bin/testmain-stream \
		-fsanitize=address -fno-omit-frame-pointer -g \
		-Wnon-virtual-dtor \
		-Iinclude \
		-Ispec/basic \
		-Iext/cbor-lite/include \
		spec/basic/basic.cpp \
		test/testmain-stream.cpp \
		test/stream-backend.out.cpp \
		test/stream-frontend.out.cpp \
		src/CborStream.cpp \
		src/PeabindStreamBackend.cpp
	ASAN_OPTIONS=detect_leaks=1 ./bin/testmain-stream
