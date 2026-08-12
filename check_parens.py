with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    text = f.read()

def check(text):
    stack = []
    for i, c in enumerate(text):
        if c in "({[":
            stack.append((c, i))
        elif c in ")}]":
            if not stack:
                print(f"Extra {c} at index {i}")
                return
            top, pos = stack.pop()
            if (top == "(" and c != ")") or (top == "{" and c != "}") or (top == "[" and c != "]"):
                print(f"Mismatch at index {i}: expected matching {top} from {pos}, but found {c}")
                return
    if stack:
        print("Unclosed brackets:")
        for c, pos in stack:
            # Let's count line numbers
            line = text[:pos].count('\n') + 1
            print(f"  {c} at index {pos} (line {line})")

check(text)
