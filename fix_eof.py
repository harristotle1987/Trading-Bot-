with open("src/components/PocketSignalsWorkspace.tsx", "r") as f:
    content = f.read()

if "export default PocketSignalsWorkspace;" not in content:
    content += "\n\nexport default PocketSignalsWorkspace;\n"
    with open("src/components/PocketSignalsWorkspace.tsx", "w") as f:
        f.write(content)
    print("Added export default")
