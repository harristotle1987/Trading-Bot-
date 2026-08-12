with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

print("Text at 10779:", repr(content[10779:10820]))
print("Text at 23147:", repr(content[23147:23180]))
