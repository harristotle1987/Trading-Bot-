with open("src/App.tsx", "r") as f:
    content = f.read()

# Add MT4Adapter tab
nav_items_old = """  const navItems = [
    { id: "Signals", label: "Pocket Signals", icon: <Radio size={16} />, color: "text-[#3DDBD9]" },
    { id: "PaperSignals", label: "Paper Trading", icon: <Layers size={16} />, color: "text-[#FF9100]" },
    { id: "Strategies", label: "Strategy Studio", icon: <Sliders size={16} /> },
    { id: "ML", label: "Machine Learning", icon: <Cpu size={16} /> },
    { id: "Charts", label: "Live Charts", icon: <LineChart size={16} /> },
  ];"""

nav_items_new = """  const navItems = [
    { id: "Signals", label: "Pocket Signals", icon: <Radio size={16} />, color: "text-[#3DDBD9]" },
    { id: "PaperSignals", label: "Paper Trading", icon: <Layers size={16} />, color: "text-[#FF9100]" },
    { id: "MT4Adapter", label: "MT4 Signal Adapter", icon: <Cpu size={16} />, color: "text-blue-400" },
    { id: "Strategies", label: "Strategy Studio", icon: <Sliders size={16} /> },
    { id: "ML", label: "Machine Learning", icon: <Cpu size={16} /> },
    { id: "Charts", label: "Live Charts", icon: <LineChart size={16} /> },
  ];"""

content = content.replace(nav_items_old, nav_items_new)

# Add MT4Adapter import
import_old = 'import PocketSignalsWorkspace from "./components/PocketSignalsWorkspace";'
import_new = import_old + '\nimport MT4SignalAdapterTester from "./components/MT4SignalAdapterTester";'
content = content.replace(import_old, import_new)

# Add to routing
routing_old = """          ) : activeTab === "PaperSignals" ? (
            <PaperSignalsWorkspace />
          ) : activeTab === "Charts" ? ("""

routing_new = """          ) : activeTab === "PaperSignals" ? (
            <PaperSignalsWorkspace />
          ) : activeTab === "MT4Adapter" ? (
            <MT4SignalAdapterTester />
          ) : activeTab === "Charts" ? ("""

content = content.replace(routing_old, routing_new)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Patched App.tsx")
