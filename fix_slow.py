import re

with open("server.ts", "r") as f:
    content = f.read()

# Fix /api/ai/transcripts/ingest
target_ingest_key = """      if (!apiKey) {
          return res.status(500).json({ status: "ERROR", message: "NVIDIA_API_KEY missing" });
      }"""
replace_ingest_key = """      if (!apiKey) {
          return res.json({ status: "SIMULATED", message: "NVIDIA_API_KEY missing", data: { core_rules: [], risk_filters: [], priority_setups: [] } });
      }"""
content = content.replace(target_ingest_key, replace_ingest_key)

target_ingest_catch = """      } catch (err: any) {
        console.error("Transcript ingest failed:", err.message || err);
        return res.status(500).json({ status: "FAILED", reason: err.message || "Unknown Error" });
      }"""
replace_ingest_catch = """      } catch (err: any) {
        console.error("Transcript ingest failed:", err.message || err);
        return res.json({ status: "SIMULATED", message: err.message || "Unknown Error", data: { core_rules: [], risk_filters: [], priority_setups: [] } });
      }"""
content = content.replace(target_ingest_catch, replace_ingest_catch)


# Fix market/kline
# We need to add a default response at the very end of the try block, just in case everything falls through.
target_kline = """      } catch (e) {
          // Fall through
      }
    } catch (error: any) {"""
replace_kline = """      } catch (e) {
          // Fall through
      }
      throw new Error("All external APIs failed");
    } catch (error: any) {"""
content = content.replace(target_kline, replace_kline)


with open("server.ts", "w") as f:
    f.write(content)

print("Patched slow endpoints")
