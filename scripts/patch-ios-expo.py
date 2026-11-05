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

            # 2. vector.push_back(consuming:) -> vector.push_back()
            if 'vector.push_back(consuming: propNameId)' in c:
                c = c.replace('vector.push_back(consuming: propNameId)', 'vector.push_back(propNameId)')
                mod = True

            # 3. HostFunctionClosure instantiation
            if 'return expo.HostFunctionClosure(context, call, deallocate)' in c:
                c = c.replace('return expo.HostFunctionClosure(context, call, deallocate)', 'return expo.createHostFunctionClosure(context, call, deallocate)')
                mod = True

            if mod:
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptRuntime.swift: {p}")
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
                    # fallback line replacement
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

def main():
    for base in ['node_modules', 'ios']:
        if not os.path.exists(base):
            continue
        for root, dirs, files in os.walk(base):
            for f in files:
                patch_file(os.path.join(root, f))

if __name__ == '__main__':
    main()
