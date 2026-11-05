#!/usr/bin/env python3
import os
import re

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
            if 'swiftLanguageModes: [.v6]' in c:
                c = c.replace('swiftLanguageModes: [.v6]', 'swiftLanguageModes: [.v5]')
                mod = True
            if '"-Werror", "ImplicitStrongCapture",' in c:
                c = c.replace('"-Werror", "ImplicitStrongCapture",', '')
                mod = True
            if '"-Werror", "NoUsage",' in c:
                c = c.replace('"-Werror", "NoUsage",', '')
                mod = True
            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched Package.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'JavaScriptRuntime.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            mod = False
            # 1. Regex literal
            target1 = 'if name.wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/) == nil {'
            target2 = 'if name.range(of: "^[a-zA-Z_\\$][a-zA-Z0-9_\\$]*$", options: .regularExpression) == nil {'
            repl_regex = 'if name.range(of: "^[a-zA-Z_$][a-zA-Z0-9_$]*$", options: .regularExpression) == nil {'
            if target1 in c:
                c = c.replace(target1, repl_regex)
                mod = True
            elif target2 in c:
                c = c.replace(target2, repl_regex)
                mod = True

            # 2. vector.push_back move-only C++ fix via expo.addPropNameId
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

            # 3. HostFunctionClosure instantiation
            if 'return expo.HostFunctionClosure(context, call, deallocate)' in c:
                c = c.replace('return expo.HostFunctionClosure(context, call, deallocate)', 'return expo.createHostFunctionClosure(context, call, deallocate)')
                mod = True

            # 4. Optional borrowing Setter compiler crash fix
            old_set_guard = """        guard let set = context.set else {
          // Unreachable in practice: when the user passed `nil` for `set`, the call site
          // below creates the read-only `expo.HostObjectCallbacks` without a setter, and
          // `HostObjectCallbacks::set` throws a `jsi::JSError` directly instead of
          // calling back into Swift. Trap loudly so a future C++ refactor can't silently
          // swallow assignments.
          FatalError.readOnlyHostObjectSetterInvoked()
        }"""
            if old_set_guard in c:
                c = c.replace(old_set_guard, "        let set = context.set")
                mod = True
            elif 'guard let set = context.set else {' in c:
                c = re.sub(r'guard let set = context\.set else \{.*?FatalError\.readOnlyHostObjectSetterInvoked\(\)\s*\}', 'let set = context.set', c, flags=re.DOTALL)
                mod = True

            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptRuntime.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'HostObjectContext.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            mod = False
            if '  let set: Setter?' in c:
                c = c.replace('  let set: Setter?', '  let set: Setter')
                mod = True
            if '    self.set = set\n' in c:
                c = c.replace('    self.set = set\n', '    self.set = set ?? { _, _ in FatalError.readOnlyHostObjectSetterInvoked() }\n')
                mod = True
            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched HostObjectContext.swift: {p}")
        except Exception as e:
            print(f"Error patching {p}: {e}")

    elif filename == 'JavaScriptPromise.swift':
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
            target = '@JavaScriptActor\n  private final class LongLivedState: LongLivedObject {'
            repl = 'private final class LongLivedState: LongLivedObject {\n    nonisolated init() {}'
            if target in c:
                c = c.replace(target, repl)
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptPromise.swift: {p}")
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
            if 'createHostFunctionClosure' not in c:
                marker = '} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure'
                factory = """} SWIFT_IMMORTAL_REFERENCE; // class HostFunctionClosure

inline HostFunctionClosure *createHostFunctionClosure(RetainedSwiftPointer::Context context, HostFunctionClosure::Closure closure, RetainedSwiftPointer::Deallocator deallocator) {
  return new HostFunctionClosure(context, closure, deallocator);
}"""
                if marker in c:
                    c = c.replace(marker, factory)
                    with open(p, 'w', encoding='utf-8') as fp:
                        fp.write(c)
                    print(f"Patched HostFunctionClosure.h: {p}")
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
