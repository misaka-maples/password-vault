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
            target1 = 'if name.wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/) == nil {'
            target2 = 'if name.range(of: "^[a-zA-Z_\\$][a-zA-Z0-9_\\$]*$", options: .regularExpression) == nil {'
            repl = 'if name.range(of: "^[a-zA-Z_$][a-zA-Z0-9_$]*$", options: .regularExpression) == nil {'
            if target1 in c:
                c = c.replace(target1, repl)
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Patched JavaScriptRuntime.swift: {p}")
            elif target2 in c:
                c = c.replace(target2, repl)
                with open(p, 'w', encoding='utf-8') as fp:
                    fp.write(c)
                print(f"Fixed escape in JavaScriptRuntime.swift: {p}")
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

def main():
    for base in ['node_modules', 'ios']:
        if not os.path.exists(base):
            continue
        for root, dirs, files in os.walk(base):
            for f in files:
                patch_file(os.path.join(root, f))

if __name__ == '__main__':
    main()
