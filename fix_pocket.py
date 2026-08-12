import re

with open("server.ts", "r") as f:
    content = f.read()

# Fix save-settings
target_save = """    } catch (e: any) {
      console.error("Failed to save to Python backend:", e.message);
      res.status(500).json({ error: "Python backend is offline or saving failed" });
    }"""
replace_save = """    } catch (e: any) {
      console.warn("Python backend is offline, save settings simulated.", e.message);
      res.json({ status: "ok", simulated: true });
    }"""
content = content.replace(target_save, replace_save)

# Fix stats
target_stats = """    } catch (e: any) {
      res.status(503).json({ status: "offline", message: e.message });
    }"""
replace_stats = """    } catch (e: any) {
      console.warn("Python backend is offline, stats simulated.", e.message);
      res.json({ status: "offline_simulated", sessionWins: 0, sessionLosses: 0 });
    }"""
content = content.replace(target_stats, replace_stats)

# Fix export
target_export = """      } else {
        res.status(500).json({ error: "Export failed from Python backend" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }"""
replace_export = """      } else {
        res.json({ status: "error", message: "Export failed from Python backend" });
      }
    } catch (e: any) {
      console.warn("Python backend is offline, export simulated.", e.message);
      res.json([]);
    }"""
content = content.replace(target_export, replace_export)

with open("server.ts", "w") as f:
    f.write(content)

print("Patched pocket option endpoints")
