import tokenize
import io

with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    text = f.read()

# We can just use a simple state machine that ignores strings (and comments ideally).
def check(text):
    stack = []
    in_string = False
    string_char = ''
    i = 0
    while i < len(text):
        c = text[i]
        
        # Skip escape characters
        if c == '\\' and in_string:
            i += 2
            continue
            
        if in_string:
            if c == string_char:
                in_string = False
            i += 1
            continue
            
        if c in "'\"`":
            in_string = True
            string_char = c
            i += 1
            continue
            
        # Handle comments
        if c == '/' and i + 1 < len(text) and text[i+1] == '/':
            while i < len(text) and text[i] != '\n':
                i += 1
            continue
        if c == '/' and i + 1 < len(text) and text[i+1] == '*':
            while i + 1 < len(text) and not (text[i] == '*' and text[i+1] == '/'):
                i += 1
            i += 2
            continue
            
        if c in "({[":
            stack.append((c, i))
        elif c in ")}]":
            if not stack:
                print(f"Extra {c} at index {i} (line {text[:i].count(chr(10))+1})")
                return
            top, pos = stack.pop()
            if (top == "(" and c != ")") or (top == "{" and c != "}") or (top == "[" and c != "]"):
                print(f"Mismatch at index {i} (line {text[:i].count(chr(10))+1}): expected matching {top} from line {text[:pos].count(chr(10))+1}, but found {c}")
                return
        i += 1
        
    if stack:
        print("Unclosed brackets:")
        for c, pos in stack:
            print(f"  {c} at line {text[:pos].count(chr(10))+1}")

check(text)
