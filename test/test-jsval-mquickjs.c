#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "js_stdlib.out.h"
#include "jsval-mqjs.h"

#define MEMSIZE 65536

void test_jsval_mqjs_basic() {
    printf("- test mquickjs basic\n");

    /*jsvalMqjsInit();

    JSVAL v=jsvalEval("1+2");
    char s[256];
    jsvalReadString(v,s);
    printf("s: %s\n",s);

    jsvalMqjs();*/

    void *mem; //, *buf;
    JSContext *ctx;
    JSCStringBuf b;

    mem=malloc(MEMSIZE);
    ctx=JS_NewContext(mem, MEMSIZE, &js_stdlib);

    printf("context created...\n");

    const char *s="100";
    JSValue val=JS_Eval(ctx,s,strlen(s),"<inline>",JS_EVAL_RETVAL);
    const char *t=JS_ToCString(ctx,val,&b);

    printf("res: %s\n",t);

    JS_FreeContext(ctx);
    free(mem);

    printf("done...\n");
}
