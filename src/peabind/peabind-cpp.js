import {autoIndent} from "../utils/lang-util.js";
import {isPrimitiveType, idlGetClass} from "./peabind-idl.js";

export function peabindGenerateCpp({idl, prefix}) {
	return autoIndent(`
        ${idl.include.map(i=>`#include "${i}"`).join("\n")}
        #include <map>
        #include <string>

        static std::map<int, std::shared_ptr<void>> registry;
        static std::map<void*, int> reverseRegistry;
        static int registryIdCounter = 1;

        template<typename T>
        static int store(std::shared_ptr<T> obj) {
            void* key = obj.get();
            auto it = reverseRegistry.find(key);
            if (it != reverseRegistry.end())
                return it->second;

            int id = registryIdCounter++;
            registry[id] = obj;
            reverseRegistry[key] = id;
            return id;
        }

        static void destroy(int id) {
            auto it = registry.find(id);
            if (it == registry.end()) return;
            void* key = it->second.get();
            reverseRegistry.erase(key);
            registry.erase(it);
        }

        TransferBuffer *transferBufferCreate(size_t size) {
            TransferBuffer *t=(TransferBuffer *)malloc(sizeof(TransferBuffer));
            t->pointer=malloc(size);
            t->size=size;
            return t;
        }

        void *transferBufferGetPointer(TransferBuffer *t) {
            return t->pointer;
        }

        size_t transferBufferGetSize(TransferBuffer *t) {
            return t->size;
        }

        void transferBufferDispose(TransferBuffer *t) {
            free(t->pointer);
            free(t);
        }
    `);
}