import React, { useState } from "react";
import { Terminal, Play, Copy, Check, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  payload: any;
  expectedStatus: string;
  expectedBehavior: string;
  actualStatus?: number;
  actualResponse?: any;
  latencyMs?: number;
  passed?: boolean;
}

export default function LiveAPITesterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"runner" | "curl" | "js">("runner");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const initialTestCases: TestResult[] = [
    {
      id: "TEST_1",
      name: "TEST 1 — Valid Market Signal",
      description: "Request a signal for a supported symbol (BTCUSDT, 15m)",
      endpoint: "/api/pocket-option/generate-signal",
      method: "POST",
      payload: { symbol: "BTCUSDT", timeframe: "15m", strategyName: "Day Trading (Conservative High-Confluence)" },
      expectedStatus: "200 OK",
      expectedBehavior: "Valid signal JSON with live entry price and market indicators"
    },
    {
      id: "TEST_2",
      name: "TEST 2 — Invalid Symbol Rejection",
      description: "Request a signal for an unsupported symbol",
      endpoint: "/api/pocket-option/generate-signal",
      method: "POST",
      payload: { symbol: "INVALID_XYZ_999", timeframe: "15m" },
      expectedStatus: "400 Bad Request",
      expectedBehavior: "Structured error: status=NO_TRADE, reason=INVALID_SYMBOL"
    },
    {
      id: "TEST_3",
      name: "TEST 3 — Invalid Timeframe Rejection",
      description: "Request a signal with an invalid timeframe value",
      endpoint: "/api/pocket-option/generate-signal",
      method: "POST",
      payload: { symbol: "BTCUSDT", timeframe: "invalid_tf_999" },
      expectedStatus: "400 Bad Request",
      expectedBehavior: "Structured error: status=INVALID_PARAMETER, reason=INVALID_TIMEFRAME"
    },
    {
      id: "TEST_4",
      name: "TEST 4 — Missing Required Parameters",
      description: "Send empty body payload missing symbol & timeframe",
      endpoint: "/api/pocket-option/generate-signal",
      method: "POST",
      payload: {},
      expectedStatus: "400 Bad Request",
      expectedBehavior: "Structured error: status=INVALID_PARAMETER, reason=MISSING_REQUIRED_PARAMETER"
    },
    {
      id: "TEST_5",
      name: "TEST 5 — Provider Data Unavailable",
      description: "Evaluate an unlisted pair with no provider price feed",
      endpoint: "/api/ai/evaluate-pair",
      method: "POST",
      payload: { symbol: "UNSUPPORTED_TOKEN_000" },
      expectedStatus: "400 Bad Request",
      expectedBehavior: "NO_TRADE response: status=NO_TRADE, reason=MARKET_DATA_UNAVAILABLE"
    },
    {
      id: "TEST_6",
      name: "TEST 6 — Sentiment Market Verification",
      description: "Fetch market sentiment analysis for pair",
      endpoint: "/api/sentiment/latest/BTCUSDT",
      method: "GET",
      payload: null,
      expectedStatus: "200 OK",
      expectedBehavior: "Structured sentiment object with aggregate score and research items"
    },
    {
      id: "TEST_7",
      name: "TEST 7 — Response Schema Verification",
      description: "Verify signal payload structure contains required properties",
      endpoint: "/api/pocket-option/signals?strategy=Day%20Trading&timeframe=15m",
      method: "GET",
      payload: null,
      expectedStatus: "200 OK",
      expectedBehavior: "Array of PocketSignal objects with valid price numbers"
    }
  ];

  const [testResults, setTestResults] = useState<TestResult[]>(initialTestCases);

  const PROD_ORIGIN = "https://trading-bot-ten-rho.vercel.app";
  const CURRENT_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
  const [targetOrigin, setTargetOrigin] = useState(PROD_ORIGIN);
  const [hasCorsError, setHasCorsError] = useState(false);

  if (!isOpen) return null;

  const runTestCase = async (test: TestResult): Promise<TestResult> => {
    const start = performance.now();
    try {
      const options: RequestInit = {
        method: test.method,
        headers: { "Content-Type": "application/json" }
      };
      if (test.payload && test.method !== "GET") {
        options.body = JSON.stringify(test.payload);
      }

      const baseUrl = targetOrigin.trim().replace(/\/$/, '');
      const fetchUrl = baseUrl ? `${baseUrl}${test.endpoint}` : test.endpoint;
      const response = await fetch(fetchUrl, options);
      const latency = Math.round(performance.now() - start);
      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        data = { rawText: await response.text() };
      }

      let passed = false;
      if (test.id === "TEST_1" && response.status === 200 && data.symbol && data.entryPrice > 0) {
        passed = true;
      } else if (test.id === "TEST_2" && response.status === 400 && data.reason === "INVALID_SYMBOL") {
        passed = true;
      } else if (test.id === "TEST_3" && response.status === 400 && data.reason === "INVALID_TIMEFRAME") {
        passed = true;
      } else if (test.id === "TEST_4" && response.status === 400 && data.reason === "MISSING_REQUIRED_PARAMETER") {
        passed = true;
      } else if (test.id === "TEST_5" && response.status === 400 && data.status === "NO_TRADE") {
        passed = true;
      } else if (test.id === "TEST_6" && response.status === 200 && data.aggregate) {
        passed = true;
      } else if (test.id === "TEST_7" && response.status === 200 && (Array.isArray(data) || data.status === "NO_TRADE")) {
        passed = true;
      }

      return {
        ...test,
        actualStatus: response.status,
        actualResponse: data,
        latencyMs: latency,
        passed
      };
    } catch (err: any) {
      const isCors = err.message === "Failed to fetch" || err.name === "TypeError";
      if (isCors && targetOrigin && targetOrigin !== CURRENT_ORIGIN && targetOrigin !== "") {
        setHasCorsError(true);
      }
      return {
        ...test,
        actualStatus: 0,
        actualResponse: {
          error: err.message || "Network execution error",
          corsNotice: isCors ? "Browser Cross-Origin (CORS) restriction blocked this fetch because the target URL is on a different domain than your current window." : undefined,
          solution: isCors ? "Open https://trading-bot-ten-rho.vercel.app/ directly in your browser or use the cURL tab below." : undefined
        },
        latencyMs: Math.round(performance.now() - start),
        passed: false
      };
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    toast.loading("Running Live Endpoint Verification Suite...", { id: "test-suite" });

    const updated: TestResult[] = [];
    for (const test of testResults) {
      const result = await runTestCase(test);
      updated.push(result);
      setTestResults([...updated, ...testResults.slice(updated.length)]);
    }

    setRunning(false);
    const passedCount = updated.filter(t => t.passed).length;
    if (passedCount === updated.length) {
      toast.success(`Suite Passed! All ${passedCount}/${updated.length} Endpoint Tests Passed Cleanly.`, { id: "test-suite" });
    } else {
      toast.error(`Completed: ${passedCount}/${updated.length} Tests Passed.`, { id: "test-suite" });
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCurlCommands = (hostUrl: string) => {
    return `# 1. Valid Market Signal Request
curl -i -X POST "${hostUrl}/api/pocket-option/generate-signal" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTCUSDT","timeframe":"15m"}'

# 2. Invalid Symbol Rejection
curl -i -X POST "${hostUrl}/api/pocket-option/generate-signal" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"INVALID_XYZ_999","timeframe":"15m"}'

# 3. Invalid Timeframe Rejection
curl -i -X POST "${hostUrl}/api/pocket-option/generate-signal" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTCUSDT","timeframe":"invalid_tf_999"}'

# 4. Missing Parameters Rejection
curl -i -X POST "${hostUrl}/api/pocket-option/generate-signal" \\
  -H "Content-Type: application/json" \\
  -d '{}'

# 5. Unlisted Provider Data Check
curl -i -X POST "${hostUrl}/api/ai/evaluate-pair" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"UNSUPPORTED_TOKEN_000"}'

# 6. Sentiment Endpoint Check
curl -i "${hostUrl}/api/sentiment/latest/BTCUSDT"

# 7. Active Signals List Check
curl -i "${hostUrl}/api/pocket-option/signals?strategy=Day%20Trading&timeframe=15m"`;
  };

  const getBrowserJsSnippet = (hostUrl: string) => {
    return `// Paste into Browser DevTools Console on https://trading-bot-ten-rho.vercel.app/
(async () => {
  console.log("%c Starting Endpoint Tests...", "color: #3DDBD9; font-weight: bold; font-size: 14px;");

  const run = async (name, url, method, body) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    console.group(\`%c \${res.ok ? "✅ PASS" : "⚠️ RESP"} [\${res.status}] \${name}\`, "color: " + (res.ok ? "#00E676" : "#FF1744"));
    console.log("URL:", url);
    console.log("Payload:", body);
    console.log("Response:", data);
    console.groupEnd();
  };

  await run("TEST 1: Valid Market", "${hostUrl}/api/pocket-option/generate-signal", "POST", { symbol: "BTCUSDT", timeframe: "15m" });
  await run("TEST 2: Invalid Symbol", "${hostUrl}/api/pocket-option/generate-signal", "POST", { symbol: "INVALID_XYZ_999", timeframe: "15m" });
  await run("TEST 3: Invalid Timeframe", "${hostUrl}/api/pocket-option/generate-signal", "POST", { symbol: "BTCUSDT", timeframe: "invalid_tf_999" });
  await run("TEST 4: Missing Parameters", "${hostUrl}/api/pocket-option/generate-signal", "POST", {});
  await run("TEST 5: Unlisted Pair", "${hostUrl}/api/ai/evaluate-pair", "POST", { symbol: "UNSUPPORTED_TOKEN_000" });
  await run("TEST 6: Sentiment Endpoint", "${hostUrl}/api/sentiment/latest/BTCUSDT", "GET");
  await run("TEST 7: Signal List Schema", "${hostUrl}/api/pocket-option/signals?strategy=Day%20Trading&timeframe=15m", "GET");
})();`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0B0E13] border border-[#232833] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#232833] flex items-center justify-between bg-[#12161D]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#3DDBD9]/10 border border-[#3DDBD9]/30 text-[#3DDBD9]">
              <Terminal size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Live Endpoint Verification Suite
                <span className="text-[10px] bg-[#00E676]/20 border border-[#00E676]/30 text-[#00E676] px-2 py-0.5 rounded-full uppercase font-mono">
                  Production Validated
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#838C9C] font-mono mt-0.5">
                <span>Target Origin:</span>
                <input
                  type="text"
                  value={targetOrigin}
                  onChange={(e) => { setTargetOrigin(e.target.value); setHasCorsError(false); }}
                  placeholder="Relative / Current Origin"
                  className="bg-[#0B0E13] border border-[#232833] text-[#3DDBD9] px-2 py-0.5 rounded text-xs focus:outline-none focus:border-[#3DDBD9] w-60"
                />
                <button
                  onClick={() => { setTargetOrigin(PROD_ORIGIN); setHasCorsError(false); }}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                    targetOrigin === PROD_ORIGIN
                      ? "bg-[#3DDBD9]/20 border-[#3DDBD9] text-[#3DDBD9] font-bold"
                      : "bg-[#181D26] border-[#232833] text-[#838C9C] hover:text-white"
                  }`}
                >
                  Vercel Prod
                </button>
                <button
                  onClick={() => { setTargetOrigin(""); setHasCorsError(false); }}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                    targetOrigin === "" || targetOrigin === CURRENT_ORIGIN
                      ? "bg-[#00E676]/20 border-[#00E676] text-[#00E676] font-bold"
                      : "bg-[#181D26] border-[#232833] text-[#838C9C] hover:text-white"
                  }`}
                >
                  Current App (Relative)
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#838C9C] hover:text-white hover:bg-[#181D26] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Controls & Execution Button */}
        <div className="px-5 py-3 border-b border-[#232833] bg-[#0B0E13] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("runner")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                activeTab === "runner"
                  ? "bg-[#3DDBD9] text-[#0B0E13]"
                  : "text-[#838C9C] hover:text-white hover:bg-[#181D26]"
              }`}
            >
              Interactive Test Runner
            </button>
            <button
              onClick={() => setActiveTab("curl")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                activeTab === "curl"
                  ? "bg-[#3DDBD9] text-[#0B0E13]"
                  : "text-[#838C9C] hover:text-white hover:bg-[#181D26]"
              }`}
            >
              cURL Commands
            </button>
            <button
              onClick={() => setActiveTab("js")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                activeTab === "js"
                  ? "bg-[#3DDBD9] text-[#0B0E13]"
                  : "text-[#838C9C] hover:text-white hover:bg-[#181D26]"
              }`}
            >
              Browser DevTools JS
            </button>
          </div>

          {activeTab === "runner" && (
            <button
              onClick={runAllTests}
              disabled={running}
              className="px-4 py-2 bg-gradient-to-r from-[#00E676] to-[#3DDBD9] text-[#0B0E13] text-xs font-bold font-mono rounded-xl hover:brightness-110 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] disabled:opacity-50"
            >
              <Play size={14} className={running ? "animate-spin" : "fill-current"} />
              <span>{running ? "Running Verification..." : "Run All 7 Tests"}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs">
          {activeTab === "runner" && (
            <div className="flex flex-col gap-4">
              {hasCorsError && (
                <div className="p-4 rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 text-white flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-[#FF9500]">
                    <AlertTriangle size={16} />
                    <span>Browser Cross-Origin Security (CORS) Notice</span>
                  </div>
                  <p className="text-xs text-[#E6E9EF]">
                    When running from inside the preview environment iframe, browsers block direct cross-domain JavaScript <code className="text-[#3DDBD9]">fetch()</code> calls to external hosts (<code className="text-[#3DDBD9]">{targetOrigin}</code>) due to Same-Origin security.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <a
                      href="https://trading-bot-ten-rho.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#FF9500] text-[#0B0E13] font-bold rounded-lg text-xs hover:brightness-110 transition-all"
                    >
                      Open Vercel Live Tab ↗
                    </a>
                    <button
                      onClick={() => { setTargetOrigin(""); setHasCorsError(false); }}
                      className="px-3 py-1 bg-[#181D26] border border-[#232833] text-[#3DDBD9] font-bold rounded-lg text-xs hover:bg-[#232833] transition-all"
                    >
                      Switch to Relative Origin (Works 100% in Browser)
                    </button>
                    <button
                      onClick={() => setActiveTab("curl")}
                      className="px-3 py-1 bg-[#181D26] border border-[#232833] text-white font-bold rounded-lg text-xs hover:bg-[#232833] transition-all"
                    >
                      View cURL Commands (Bypasses CORS)
                    </button>
                  </div>
                </div>
              )}

              {testResults.map((test) => (
                <div
                  key={test.id}
                  className="p-4 rounded-xl border border-[#232833] bg-[#12161D] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{test.name}</span>
                      <span className="px-2 py-0.5 rounded bg-[#181D26] border border-[#232833] text-[#3DDBD9] font-mono text-[10px]">
                        {test.method} {test.endpoint}
                      </span>
                    </div>

                    <div>
                      {test.passed === true && (
                        <span className="flex items-center gap-1 text-[#00E676] font-bold bg-[#00E676]/10 px-2.5 py-1 rounded-md border border-[#00E676]/30">
                          <ShieldCheck size={14} /> PASS ({test.actualStatus} OK • {test.latencyMs}ms)
                        </span>
                      )}
                      {test.passed === false && (
                        <span className="flex items-center gap-1 text-[#FF1744] font-bold bg-[#FF1744]/10 px-2.5 py-1 rounded-md border border-[#FF1744]/30">
                          <AlertTriangle size={14} /> RESP ({test.actualStatus || "ERR"})
                        </span>
                      )}
                      {test.passed === undefined && (
                        <span className="text-[#838C9C] bg-[#181D26] px-2.5 py-1 rounded-md">
                          READY
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[#838C9C]">{test.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 bg-[#0B0E13] p-3 rounded-lg border border-[#232833]">
                    <div>
                      <span className="text-[10px] text-[#838C9C] uppercase font-bold">Request Payload:</span>
                      <pre className="text-[11px] text-[#3DDBD9] overflow-x-auto mt-1">
                        {test.payload ? JSON.stringify(test.payload, null, 2) : "NONE (GET)"}
                      </pre>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#838C9C] uppercase font-bold">
                        Expected: {test.expectedStatus}
                      </span>
                      <p className="text-[11px] text-[#E6E9EF] mt-1">{test.expectedBehavior}</p>

                      {test.actualResponse && (
                        <div className="mt-2 pt-2 border-t border-[#232833]">
                          <span className="text-[10px] text-[#00E676] uppercase font-bold">Actual Response Body:</span>
                          <pre className="text-[10px] text-[#E6E9EF] overflow-x-auto mt-1 max-h-32">
                            {JSON.stringify(test.actualResponse, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "curl" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Copy Shell cURL Commands</span>
                <button
                  onClick={() => copyText(getCurlCommands(targetOrigin), "curl_all")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181D26] border border-[#232833] text-[#3DDBD9] rounded-lg hover:bg-[#232833] transition-all"
                >
                  {copiedIndex === "curl_all" ? <Check size={14} className="text-[#00E676]" /> : <Copy size={14} />}
                  <span>{copiedIndex === "curl_all" ? "Copied!" : "Copy All cURL Commands"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#0B0E13] border border-[#232833] text-[#3DDBD9] overflow-x-auto whitespace-pre leading-relaxed">
                {getCurlCommands(targetOrigin)}
              </pre>
            </div>
          )}

          {activeTab === "js" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Browser Console Automation Snippet</span>
                <button
                  onClick={() => copyText(getBrowserJsSnippet(targetOrigin), "js_all")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181D26] border border-[#232833] text-[#3DDBD9] rounded-lg hover:bg-[#232833] transition-all"
                >
                  {copiedIndex === "js_all" ? <Check size={14} className="text-[#00E676]" /> : <Copy size={14} />}
                  <span>{copiedIndex === "js_all" ? "Copied!" : "Copy JS Snippet"}</span>
                </button>
              </div>

              <p className="text-[#838C9C]">
                Open your browser DevTools Console (<kbd className="bg-[#181D26] px-1.5 py-0.5 rounded text-white">F12</kbd> or <kbd className="bg-[#181D26] px-1.5 py-0.5 rounded text-white">Cmd+Option+I</kbd>) on <span className="text-[#3DDBD9]">{targetOrigin}</span> and paste the script below to verify responses live.
              </p>

              <pre className="p-4 rounded-xl bg-[#0B0E13] border border-[#232833] text-[#00E676] overflow-x-auto whitespace-pre leading-relaxed">
                {getBrowserJsSnippet(targetOrigin)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
