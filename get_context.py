with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    text = f.read()

pos = 25699
print(text[pos-200:pos+100])
