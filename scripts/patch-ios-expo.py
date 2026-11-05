#!/usr/bin/env python3
import os

def patch_file(p):
    filename = os.path.basename(p)
    if filename == 'Package.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            mod = False
            if 'swift-tools-version: 6.2' in c:
                c = c.replace('swift-tools-version: 6.2', 'swift-tools-version: 6.0')
                mod = True
            if 'swiftLanguageModes: [.v5]' in c:
                c = c.replace('swiftLanguageModes: [.v5]', 'swiftLanguageModes: [.v6]')
                mod = True
            if '"-Werror", "ImplicitStrongCapture",' in c:
                c = c.replace('"-Werror", "ImplicitStrongCapture",', '')
                mod = True
            if '"-Werror", "NoUsage",' in c:
                c = c.replace('"-Werror", "NoUsage",', '')
                mod = True
            if '.enableUpcomingFeature("NonisolatedNonsendingByDefault"),' in c:
                c = c.replace('.enableUpcomingFeature("NonisolatedNonsendingByDefault"),', '')
                mod = True
            if '.enableUpcomingFeature("InferIsolatedConformances"),' in c:
                c = c.replace('.enableUpcomingFeature("InferIsolatedConformances"),', '')
                mod = True
            if '"-warn-concurrency"' not in c:
                marker = '"-no-verify-emitted-module-interface",'
                repl = '"-no-verify-emitted-module-interface",\n          "-Xfrontend", "-warn-concurrency",'
                if marker in c:
                    c = c.replace(marker, repl)
                    mod = True
            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched Package.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'JavaScriptCallback.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            mod = False

            old1 = """    @JavaScriptActor
    func call(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime) throws {
      let arguments = box.value
      try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try Self.encodeArguments(repeat each arguments, into: buffer, in: runtime)
      }
    }"""
            new1 = """    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> Void = {
      function, runtime in
      let arguments = box.value
      try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try Self.encodeArguments(repeat each arguments, into: buffer, in: runtime)
      }
    }"""
            if old1 in c:
                c = c.replace(old1, new1)
                mod = True

            old3 = """    @JavaScriptActor
    func call(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime) throws -> UncheckedSendableBox<R>
    {
      let arguments = box.value
      let decoded = try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try Self.encodeArguments(repeat each arguments, into: buffer, in: runtime)
      } withResult: { result, runtime in
        return try R.decode(result, in: runtime)
      }
      return UncheckedSendableBox(decoded)
    }"""
            new3 = """    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> UncheckedSendableBox<R> = {
      function, runtime in
      let arguments = box.value
      let decoded = try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try Self.encodeArguments(repeat each arguments, into: buffer, in: runtime)
      } withResult: { result, runtime in
        return try R.decode(result, in: runtime)
      }
      return UncheckedSendableBox(decoded)
    }"""
            if old3 in c:
                c = c.replace(old3, new3)
                mod = True

            old4 = """    @JavaScriptActor
    func call(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime) throws {
      try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try emplacing(box.value, buffer, runtime)
      }
    }"""
            new4 = """    let emplacingBox = UncheckedSendableBox(emplacing)
    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> Void = {
      function, runtime in
      try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try emplacingBox.value(box.value, buffer, runtime)
      }
    }"""
            if old4 in c:
                c = c.replace(old4, new4)
                mod = True

            old6 = """    @JavaScriptActor
    func call(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime) throws -> UncheckedSendableBox<R>
    {
      let decoded = try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try emplacing(box.value, buffer, runtime)
      } withResult: { result, runtime in
        return try R.decode(result, in: runtime)
      }
      return UncheckedSendableBox(decoded)
    }"""
            new6 = """    let emplacingBox = UncheckedSendableBox(emplacing)
    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> UncheckedSendableBox<R> = {
      function, runtime in
      let decoded = try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try emplacingBox.value(box.value, buffer, runtime)
      } withResult: { result, runtime in
        return try R.decode(result, in: runtime)
      }
      return UncheckedSendableBox(decoded)
    }"""
            if old6 in c:
                c = c.replace(old6, new6)
                mod = True

            old7 = """    @JavaScriptActor
    func call(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime) throws -> UncheckedSendableBox<R>
    {
      let decoded = try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try emplacing(box.value, buffer, runtime)
      } withResult: { result, runtime in
        return try decode(result, runtime)
      }
      return UncheckedSendableBox(decoded)
    }"""
            new7 = """    let emplacingBox = UncheckedSendableBox(emplacing)
    let decodeBox = UncheckedSendableBox(decode)
    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> UncheckedSendableBox<R> = {
      function, runtime in
      let decoded = try function.call(argumentCount: argumentCount, in: runtime) { buffer, runtime in
        try emplacingBox.value(box.value, buffer, runtime)
      } withResult: { result, runtime in
        return try decodeBox.value(result, runtime)
      }
      return UncheckedSendableBox(decoded)
    }"""
            if old7 in c:
                c = c.replace(old7, new7)
                mod = True

            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptCallback.swift to Sendable closures: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'JavaScriptRuntime.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            mod = False

            # vector.push_back move-only C++ fix via expo.addPropNameId
            old_loop1 = """      for propertyName in propertyNames {
        let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))
        vector.push_back(consuming: propNameId)
      }"""
            old_loop2 = """      for propertyName in propertyNames {
        let propNameId = facebook.jsi.PropNameID.forUtf8(iRuntime, std.string(propertyName))
        vector.push_back(propNameId)
      }"""
            new_loop = """      for propertyName in propertyNames {
        expo.addPropNameId(&vector, iRuntime, std.string(propertyName))
      }"""
            if old_loop1 in c:
                c = c.replace(old_loop1, new_loop)
                mod = True
            elif old_loop2 in c:
                c = c.replace(old_loop2, new_loop)
                mod = True

            # HostFunctionClosure instantiation via C++ factory
            if 'return expo.HostFunctionClosure(context, call, deallocate)' in c:
                c = c.replace('return expo.HostFunctionClosure(context, call, deallocate)', 'return expo.createHostFunctionClosure(context, call, deallocate)')
                mod = True

            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptRuntime.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'Task+immediate.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            if 'Task.immediate(name: name, priority: priority, operation: operation)' in c:
                old_block = """    if #available(macOS 26.0, iOS 26.0, watchOS 26.0, tvOS 26.0, *) {
      return Task.immediate(name: name, priority: priority, operation: operation)
    } else {
      // In the polyfill always use the highest priority and hope it executes earlier.
      return Task(name: name, priority: .high, operation: operation)
    }"""
                new_block = "    return Task(priority: .high, operation: operation)"
                if old_block in c:
                    c = c.replace(old_block, new_block)
                else:
                    c = c.replace('return Task.immediate(name: name, priority: priority, operation: operation)', 'return Task(priority: .high, operation: operation)')
                    c = c.replace('return Task(name: name, priority: .high, operation: operation)', 'return Task(priority: .high, operation: operation)')
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched Task+immediate.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'HostFunctionClosure.h':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            mod = False
            if 'createHostFunctionClosure' in c and 'HostFunctionClosure *_Nonnull createHostFunctionClosure' not in c:
                c = c.replace('HostFunctionClosure *createHostFunctionClosure', 'HostFunctionClosure *_Nonnull createHostFunctionClosure')
                mod = True
            elif 'createHostFunctionClosure' not in c:
                marker = '} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure'
                factory = """} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure

inline HostFunctionClosure *_Nonnull createHostFunctionClosure(RetainedSwiftPointer::Context context, HostFunctionClosure::Closure closure, RetainedSwiftPointer::Deallocator deallocator) {
  return new HostFunctionClosure(context, closure, deallocator);
}"""
                if marker in c:
                    c = c.replace(marker, factory)
                    mod = True
            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched HostFunctionClosure.h: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'JSIUtils.h':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            if 'errorFromMovedValue' not in c:
                target = """inline jsi::JSError errorFromValue(jsi::IRuntime &runtime, jsi::Value value) {
  return jsi::JSError(runtime, std::move(value));
}"""
                replacement = """inline jsi::JSError errorFromValue(jsi::IRuntime &runtime, jsi::Value value) {
  return jsi::JSError(runtime, std::move(value));
}

inline jsi::JSError errorFromMovedValue(jsi::IRuntime &runtime, jsi::Value *value) {
  return jsi::JSError(runtime, std::move(*value));
}"""
                if target in c:
                    c = c.replace(target, replacement)
                    with open(p, 'w', encoding='utf-8') as fp:
                        fp.write(c)
                    print(f"Patched JSIUtils.h: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'JavaScriptError.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            target = "self.pointee = expo.errorFromValue(runtime.pointee, value.pointee)"
            replacement = "self.pointee = expo.errorFromMovedValue(runtime.pointee, &value.pointee)"
            if target in c:
                c = c.replace(target, replacement)
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptError.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'HostObjectCallbacks.h':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            if 'addPropNameId' not in c:
                marker = '} SWIFT_NONCOPYABLE; // class HostObjectCallbacks'
                helper = """} SWIFT_NONCOPYABLE; // class HostObjectCallbacks

inline void addPropNameId(HostObjectCallbacks::PropNameIds &vector, facebook::jsi::IRuntime &runtime, const std::string &name) {
  vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));
}"""
                if marker in c:
                    c = c.replace(marker, helper)
                    with open(p, 'w', encoding='utf-8') as fp:
                        fp.write(c)
                    print(f"Patched HostObjectCallbacks.h: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

def main():
    for base in ['node_modules', 'ios']:
        if not os.path.exists(base):
            continue
        for root, dirs, files in os.walk(base):
            for f in files:
                patch_file(os.path.join(root, f))

if __name__ == '__main__':
    main()
