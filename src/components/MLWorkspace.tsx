import React, { useState, useEffect } from "react";
import { Cpu, RotateCw, AlertTriangle, CheckCircle, Database, TrendingUp, Sliders, Play, RotateCcw, Info, BarChart, ArrowRight, ShieldAlert, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";

interface BucketStats {
  bucketRange: string;
  count: number;
  actualWinRate: number;
  predictedWinRate: number;
  expectedValue: number;
  predictedEV: number;
}

interface ComparisonMetrics {
  tradesCount: number;
  winRatePct: number;
  netProfitR: number;
  maxDrawdownPct: number;
}

interface DetailedModelMetrics {
  accuracy: number;
  auc: number;
  brierScore: number;
  logLoss: number;
  passedValidation: boolean;
  precision: number;
  recall: number;
  f1: number;
  ece: number;
  alpha: number;
  beta: number;
  buckets: BucketStats[];
  comparison: {
    baseline: ComparisonMetrics;
    filtered: ComparisonMetrics;
  };
}

interface RegisteredModel {
  version: string;
  modelType: "logistic_regression" | "random_forest" | "gbdt";
  calibratorAlpha: number;
  calibratorBeta: number;
  metrics: DetailedModelMetrics;
  deployed: boolean;
  candidateMetrics?: {
    logistic_regression: DetailedModelMetrics;
    random_forest: DetailedModelMetrics;
    gbdt: DetailedModelMetrics;
  };
}

interface MLStats {
  totalSignalsTracked: number;
  closedSignalsCount: number;
  winRatePct: number;
  activeModel: {
    version: string;
    modelType: string;
    metrics: DetailedModelMetrics;
    calibratorAlpha: number;
    calibratorBeta: number;
  } | null;
}

export default function MLWorkspace() {
  const [stats, setStats] = useState<MLStats | null>(null);
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<RegisteredModel | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatsAndModels = async () => {
    try {
      const statsRes = await fetch("/api/ml/stats");
      const statsData = await statsRes.json();
      if (statsData.status === "success") {
        setStats(statsData);
      }

      const modelsRes = await fetch("/api/ml/models");
      const modelsData = await modelsRes.json();
      if (modelsData.status === "success") {
        const fetchedModels: RegisteredModel[] = modelsData.models || [];
        setModels(fetchedModels);
        
        // Auto-select active or latest model if nothing is selected
        if (fetchedModels.length > 0 && !selectedModel) {
          const active = fetchedModels.find(m => m.deployed) || fetchedModels[0];
          setSelectedModel(active);
        }
      }
    } catch (err: any) {
      console.error("Error fetching ML metrics:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndModels();
    const interval = setInterval(fetchStatsAndModels, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetrain = async () => {
    setIsTraining(true);
    toast.info("Initializing multi-model validation sequence...");
    try {
      const res = await fetch("/api/ml/train", { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Validation finished! Candidate version ${data.version} registered inside Archive. Inspect its out-of-sample metrics prior to promotion.`);
        fetchStatsAndModels();
      } else if (data.status === "deferred") {
        toast.info(data.message || "Retraining deferred: insufficient outcomes.");
      } else {
        toast.error(data.error || "Retraining failed.");
      }
    } catch (err: any) {
      toast.error(`Retraining exception: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handlePromote = async (version: string) => {
    try {
      const res = await fetch("/api/ml/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version })
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Successfully promoted model version ${version} to active production status.`);
        fetchStatsAndModels();
        // Update selected model's deployment state locally to reflect the change
        if (selectedModel && selectedModel.version === version) {
          setSelectedModel(prev => prev ? { ...prev, deployed: true } : null);
        }
      } else {
        toast.error(data.error || "Promotion failed.");
      }
    } catch (err: any) {
      toast.error(`Promotion exception: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <RotateCw className="animate-spin text-[#3DDBD9] mr-2" size={24} />
        <span className="text-[#838C9C] font-mono">Synchronizing Supervised Predictor Matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-[#838C9C]" id="ml-workspace-container">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#232833] pb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <Cpu className="text-[#3DDBD9]" size={28} />
            Supervised Machine Learning Workspace
          </h2>
          <p className="text-xs text-[#838C9C] mt-1">
            Ensemble pipeline evaluating candidate classifiers under rigorous out-of-sample (OOS) constraints. No future leakage.
          </p>
        </div>
        <button
          disabled={isTraining}
          onClick={handleRetrain}
          className="px-5 py-2.5 bg-gradient-to-r from-[#3DDBD9] to-[#00E676] hover:brightness-110 active:brightness-95 disabled:opacity-50 text-[#0B0E13] rounded font-bold font-mono text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#3DDBD9]/10"
        >
          <RotateCw className={isTraining ? "animate-spin" : ""} size={14} />
          {isTraining ? "Validating Candidates..." : "Retrain & Evaluate Candidates"}
        </button>
      </div>

      {/* KPI Stats Panel Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#12161D] border border-[#232833] p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#838C9C] uppercase font-mono tracking-wider block">Signals Collected</span>
            <div className="text-2xl font-bold font-mono text-white">{stats?.totalSignalsTracked ?? 0}</div>
          </div>
          <Database className="text-[#3DDBD9] opacity-80" size={32} />
        </div>

        <div className="bg-[#12161D] border border-[#232833] p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#838C9C] uppercase font-mono tracking-wider block">Outcomes Logged</span>
            <div className="text-2xl font-bold font-mono text-[#00E676]">{stats?.closedSignalsCount ?? 0}</div>
          </div>
          <CheckCircle className="text-[#00E676] opacity-80" size={32} />
        </div>

        <div className="bg-[#12161D] border border-[#232833] p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#838C9C] uppercase font-mono tracking-wider block">Historical Win Rate</span>
            <div className="text-2xl font-bold font-mono text-white">{(stats?.winRatePct ?? 0.0).toFixed(1)}%</div>
          </div>
          <TrendingUp className="text-[#00E676] opacity-80" size={32} />
        </div>

        <div className="bg-[#12161D] border border-[#232833] p-5 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#838C9C] uppercase font-mono tracking-wider block">Active Production Model</span>
            <div className="text-md font-bold font-mono text-[#3DDBD9]">
              {stats?.activeModel ? `${stats.activeModel.version} (${stats.activeModel.modelType})` : "FALLBACK (NONE)"}
            </div>
          </div>
          <Cpu className="text-[#3DDBD9] opacity-80" size={32} />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Grid Columns: Model Archive list + Deep Validation Inspector Card */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Model Registry List */}
          <div className="bg-[#12161D] border border-[#232833] rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#181D26] pb-3">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <BarChart className="text-[#3DDBD9]" size={18} />
                Registered Model Archives
              </h3>
              <span className="text-xs text-[#838C9C] font-mono">Select a version to inspect detailed OOS performance report</span>
            </div>

            {models.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-[#838C9C] bg-[#181D26] rounded border border-[#232833] space-y-2">
                <AlertTriangle className="mx-auto text-yellow-500 opacity-80" size={24} />
                <p>No model evaluation records available. Require at least 10 terminal trade outcomes to train models.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#838C9C] font-mono">
                  <thead>
                    <tr className="border-b border-[#232833] text-white">
                      <th className="py-3 px-2">VERSION</th>
                      <th className="py-3 px-2">MODEL TYPE</th>
                      <th className="py-3 px-2 text-center">OOS AUC</th>
                      <th className="py-3 px-2 text-center">F1-SCORE</th>
                      <th className="py-3 px-2 text-center">STATUS</th>
                      <th className="py-3 px-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr 
                        key={model.version} 
                        onClick={() => setSelectedModel(model)}
                        className={`border-b border-[#181D26] hover:bg-[#181D26]/50 cursor-pointer transition-colors ${selectedModel?.version === model.version ? 'bg-[#181D26] border-l-2 border-l-[#3DDBD9]' : ''}`}
                      >
                        <td className="py-3 px-2 font-bold text-white flex items-center gap-1.5">
                          {model.version}
                          {model.deployed && <span className="w-1.5 h-1.5 bg-[#00E676] rounded-full animate-pulse" title="Active model" />}
                        </td>
                        <td className="py-3 px-2 uppercase text-[10px]">{model.modelType.replace("_", " ")}</td>
                        <td className="py-3 px-2 text-center text-[#00E676] font-bold">
                          {(model.metrics.auc * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          {model.metrics.f1 ? (model.metrics.f1 * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {model.deployed ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20">
                              ACTIVE PROD
                            </span>
                          ) : model.metrics.passedValidation ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#838C9C]/10 text-[#838C9C] border border-[#838C9C]/20">
                              STABLE CANDIDATE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FF4D4F]/10 text-[#FF4D4F] border border-[#FF4D4F]/20">
                              REJECTED (AUC &lt; 0.52)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right" onClick={e => e.stopPropagation()}>
                          {model.deployed ? (
                            <span className="text-[10px] text-[#00E676] font-bold">Running</span>
                          ) : (
                            <button
                              disabled={!model.metrics.passedValidation}
                              onClick={() => handlePromote(model.version)}
                              className="px-2.5 py-1 bg-[#181D26] hover:bg-[#232833] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Promote to Active
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Deep Validation Inspector Panel (Fulfills Step 20 request details) */}
          {selectedModel && (
            <div className="bg-[#12161D] border border-[#232833] rounded-lg p-6 space-y-8">
              
              {/* Card Title & Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#232833] pb-4 gap-4">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Sliders className="text-[#3DDBD9]" size={18} />
                    Out-Of-Sample Validation Inspector Report: <span className="text-[#3DDBD9]">{selectedModel.version}</span>
                  </h3>
                  <p className="text-xs text-[#838C9C] mt-1">
                    Complete evaluation on test dataset partition. Enforces strict zero-leakage cross-validation.
                  </p>
                </div>
                
                {selectedModel.deployed ? (
                  <span className="px-3 py-1 bg-[#00E676]/10 text-[#00E676] rounded text-xs font-mono font-bold border border-[#00E676]/20 flex items-center gap-1.5 self-start md:self-auto">
                    <CheckCircle size={14} /> Active Production Deployed
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-mono font-bold border border-yellow-500/20">
                      Inactive Candidate
                    </span>
                    <button
                      disabled={!selectedModel.metrics.passedValidation}
                      onClick={() => handlePromote(selectedModel.version)}
                      className="px-3 py-1.5 bg-gradient-to-r from-[#3DDBD9] to-[#00E676] hover:brightness-110 active:brightness-95 disabled:opacity-40 text-[#0B0E13] rounded font-bold text-xs cursor-pointer"
                    >
                      Deploy Model
                    </button>
                  </div>
                )}
              </div>

              {/* 1. Ensemble Candidates Multi-Evaluation Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#3DDBD9]" />
                  1. Multi-Model Candidate Evaluations (Unseen OOS Test Set)
                </h4>
                <p className="text-xs text-[#838C9C]">
                  Comparison metrics of the trained candidate algorithms evaluated on the 30% out-of-sample test partition:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono text-[#838C9C] border border-[#232833] rounded">
                    <thead>
                      <tr className="bg-[#181D26] border-b border-[#232833] text-white">
                        <th className="py-2.5 px-3">Candidate Model Type</th>
                        <th className="py-2.5 px-3 text-center">ROC-AUC</th>
                        <th className="py-2.5 px-3 text-center">Precision</th>
                        <th className="py-2.5 px-3 text-center">Recall</th>
                        <th className="py-2.5 px-3 text-center">F1-Score</th>
                        <th className="py-2.5 px-3 text-center">Brier Score</th>
                        <th className="py-2.5 px-3 text-center">Calibration ECE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Candidate: Logistic Regression */}
                      <tr className="border-b border-[#232833] hover:bg-[#181D26]/20">
                        <td className="py-2.5 px-3 font-semibold text-[#E6E9EF]">Logistic Regression Baseline</td>
                        <td className="py-2.5 px-3 text-center text-[#3DDBD9]">
                          {selectedModel.candidateMetrics?.logistic_regression?.auc ? (selectedModel.candidateMetrics.logistic_regression.auc * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.logistic_regression?.precision ? (selectedModel.candidateMetrics.logistic_regression.precision * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.logistic_regression?.recall ? (selectedModel.candidateMetrics.logistic_regression.recall * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.logistic_regression?.f1 ? (selectedModel.candidateMetrics.logistic_regression.f1 * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.logistic_regression?.brierScore?.toFixed(4) || "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.logistic_regression?.ece !== undefined ? (selectedModel.candidateMetrics.logistic_regression.ece * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                      </tr>

                      {/* Candidate: Random Forest */}
                      <tr className="border-b border-[#232833] hover:bg-[#181D26]/20">
                        <td className="py-2.5 px-3 font-semibold text-[#E6E9EF]">Random Forest Classifier</td>
                        <td className="py-2.5 px-3 text-center text-[#3DDBD9]">
                          {selectedModel.candidateMetrics?.random_forest?.auc ? (selectedModel.candidateMetrics.random_forest.auc * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.random_forest?.precision ? (selectedModel.candidateMetrics.random_forest.precision * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.random_forest?.recall ? (selectedModel.candidateMetrics.random_forest.recall * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.random_forest?.f1 ? (selectedModel.candidateMetrics.random_forest.f1 * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.random_forest?.brierScore?.toFixed(4) || "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.random_forest?.ece !== undefined ? (selectedModel.candidateMetrics.random_forest.ece * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                      </tr>

                      {/* Candidate: GBDT */}
                      <tr className="border-b border-[#232833] hover:bg-[#181D26]/20">
                        <td className="py-2.5 px-3 font-semibold text-[#E6E9EF]">Gradient Boosted GBDT Trees</td>
                        <td className="py-2.5 px-3 text-center text-[#3DDBD9]">
                          {selectedModel.candidateMetrics?.gbdt?.auc ? (selectedModel.candidateMetrics.gbdt.auc * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.gbdt?.precision ? (selectedModel.candidateMetrics.gbdt.precision * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.gbdt?.recall ? (selectedModel.candidateMetrics.gbdt.recall * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.gbdt?.f1 ? (selectedModel.candidateMetrics.gbdt.f1 * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.gbdt?.brierScore?.toFixed(4) || "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedModel.candidateMetrics?.gbdt?.ece !== undefined ? (selectedModel.candidateMetrics.gbdt.ece * 100).toFixed(1) + "%" : "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Probability Calibration Evaluation (Buckets 50-100%) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Database size={14} className="text-[#00E676]" />
                  2. Model Calibration Evaluation (Probability Buckets)
                </h4>
                <p className="text-xs text-[#838C9C]">
                  Calibration accuracy over specific risk cohorts. Compares the average predicted win probability against actual realized market outcomes:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {selectedModel.metrics.buckets?.map((bucket, index) => {
                    const deviation = Math.abs(bucket.actualWinRate - bucket.predictedWinRate);
                    return (
                      <div key={index} className="p-3 bg-[#181D26] border border-[#232833] rounded flex flex-col justify-between space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold font-mono text-[11px]">{bucket.bucketRange}</span>
                          <span className="text-[10px] text-[#838C9C] font-mono">N={bucket.count}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span>Forecasted:</span>
                            <span className="text-[#3DDBD9] font-bold">{(bucket.predictedWinRate * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>Realized Win Rate:</span>
                            <span className="text-[#00E676] font-bold">{(bucket.actualWinRate * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-[10px] border-t border-[#232833] pt-1">
                            <span>Realized Return:</span>
                            <span className={bucket.expectedValue >= 0 ? "text-[#00E676] font-mono" : "text-[#FF4D4F] font-mono"}>
                              {bucket.expectedValue >= 0 ? "+" : ""}{bucket.expectedValue.toFixed(2)}R
                            </span>
                          </div>
                        </div>

                        {bucket.count > 0 ? (
                          <div className="w-full bg-[#12161D] h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full ${deviation < 0.1 ? 'bg-[#00E676]' : (deviation < 0.2 ? 'bg-yellow-500' : 'bg-[#FF4D4F]')}`} 
                              style={{ width: `${Math.max(10, Math.min(100, (1 - deviation) * 100))}%` }} 
                            />
                          </div>
                        ) : (
                          <span className="text-[9px] text-[#838C9C] italic">No samples in test</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-4 bg-[#181D26] border border-[#232833] rounded flex items-start gap-2.5 text-xs">
                  <Info className="text-[#3DDBD9] flex-shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <span className="text-[#E6E9EF] font-bold">Note on Probability Bucket Performance</span>
                    <p>
                      <strong>Do not automatically assume higher predicted probability means better trading performance.</strong> Market regimes, spread variation, and strategy-derived expected value can lead to higher-risk thresholds exhibiting different profit dynamics. Useful calibration is shown when the realized win rate tracks closely with the model's forecasted cohort expectation.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Backtest Simulation: Baseline vs Strategy + ML Filter */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-yellow-500" />
                  3. System Backtest Comparison: Baseline Strategy vs Strategy + ML Filter
                </h4>
                <p className="text-xs text-[#838C9C]">
                  Out-of-sample simulation comparing trading performance without filtering (Baseline) against trading filtered strictly with this model (calibrated probability &ge; 55%):
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Baseline panel */}
                  <div className="p-4 bg-[#181D26] border border-[#232833] rounded space-y-3">
                    <div className="flex justify-between items-center border-b border-[#232833] pb-2">
                      <span className="text-white font-bold text-xs">Baseline Strategy (Unfiltered)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#838C9C]/10 text-[#838C9C] border border-[#838C9C]/20">
                        Takes All Signals
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Trades Evaluated:</span>
                        <span className="text-white font-bold text-sm">{selectedModel.metrics.comparison?.baseline?.tradesCount ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Win Rate:</span>
                        <span className="text-white font-bold text-sm">{(selectedModel.metrics.comparison?.baseline?.winRatePct ?? 0).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Net Return:</span>
                        <span className={selectedModel.metrics.comparison?.baseline?.netProfitR >= 0 ? "text-[#00E676] font-bold text-sm" : "text-[#FF4D4F] font-bold text-sm"}>
                          {selectedModel.metrics.comparison?.baseline?.netProfitR >= 0 ? "+" : ""}{selectedModel.metrics.comparison?.baseline?.netProfitR?.toFixed(2) ?? "0.00"}R
                        </span>
                      </div>
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Max Drawdown:</span>
                        <span className="text-[#FF4D4F] font-bold text-sm">{(selectedModel.metrics.comparison?.baseline?.maxDrawdownPct ?? 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Filtered panel */}
                  <div className="p-4 bg-[#181D26] border border-l-2 border-[#232833] border-l-[#00E676] rounded space-y-3">
                    <div className="flex justify-between items-center border-b border-[#232833] pb-2">
                      <span className="text-[#00E676] font-bold text-xs">Strategy + ML Filtered (Threshold &ge; 55%)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20">
                        Active Risk Constraint
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Filtered Trades taken:</span>
                        <span className="text-white font-bold text-sm">{selectedModel.metrics.comparison?.filtered?.tradesCount ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Filtered Win Rate:</span>
                        <span className="text-[#00E676] font-bold text-sm">{(selectedModel.metrics.comparison?.filtered?.winRatePct ?? 0).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Net Return:</span>
                        <span className={selectedModel.metrics.comparison?.filtered?.netProfitR >= 0 ? "text-[#00E676] font-bold text-sm" : "text-[#FF4D4F] font-bold text-sm"}>
                          {selectedModel.metrics.comparison?.filtered?.netProfitR >= 0 ? "+" : ""}{selectedModel.metrics.comparison?.filtered?.netProfitR?.toFixed(2) ?? "0.00"}R
                        </span>
                      </div>
                      <div>
                        <span className="text-[#838C9C] block text-[10px]">Max Drawdown:</span>
                        <span className="text-[#00E676] font-bold text-sm">{(selectedModel.metrics.comparison?.filtered?.maxDrawdownPct ?? 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#231E18] border border-[#4C3B20] rounded flex items-start gap-2.5 text-xs text-yellow-500">
                  <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wider block text-[10px]">Promotion Safety Guidelines</span>
                    <p className="text-[#D4A350]">
                      <strong>Only promote the candidate model to production if it provides measurable out-of-sample improvement without unacceptable drawdown degradation.</strong> Inspect if the Filtered net return is higher, win rate is boosted, or maximum drawdown is lower compared to the Baseline strategy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Model Inputs, Platt Coefficients & Checklist */}
        <div className="space-y-6">
          
          {/* Platt Sigmoid Calibration Coefficients */}
          {selectedModel && (
            <div className="bg-[#12161D] border border-[#232833] rounded-lg p-6 space-y-4">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Sliders className="text-[#3DDBD9]" size={18} />
                Platt Sigmoid Coefficients
              </h3>
              <p className="text-xs text-[#838C9C]">
                Scaling coefficients used to transform raw outputs into true conditional success probability distributions:
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs p-3 bg-[#181D26] rounded border border-[#232833] font-mono">
                  <span className="text-white">Alpha (Gain Scale)</span>
                  <span className="text-[#3DDBD9] font-bold">{selectedModel.calibratorAlpha.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 bg-[#181D26] rounded border border-[#232833] font-mono">
                  <span className="text-white">Beta (Risk Offset)</span>
                  <span className="text-[#3DDBD9] font-bold">{selectedModel.calibratorBeta.toFixed(4)}</span>
                </div>
                
                <div className="p-3 bg-[#181D26] rounded border border-[#232833] text-[10px] text-[#838C9C] space-y-1 font-mono">
                  <span className="font-bold block text-white text-[11px]">Calibration Sigmoid:</span>
                  <code>P(y=1 | x) = 1 / (1 + exp({selectedModel.calibratorAlpha.toFixed(2)} * score + {selectedModel.calibratorBeta.toFixed(2)}))</code>
                </div>
              </div>
            </div>
          )}

          {/* Feature Inputs Matrix */}
          <div className="bg-[#12161D] border border-[#232833] rounded-lg p-6 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Sliders className="text-[#3DDBD9]" size={18} />
              Model Feature Map Matrix
            </h3>
            <p className="text-xs text-[#838C9C]">
              The following numerical signals are captured at execution and normalized before feeding into our active model:
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs p-2 bg-[#181D26] rounded border border-[#232833]">
                <span className="text-white font-mono">1. Signal Score</span>
                <span className="text-[#838C9C]">Win confluence rating (50 - 100)</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-[#181D26] rounded border border-[#232833]">
                <span className="text-white font-mono">2. Strategy Confluence</span>
                <span className="text-[#838C9C]">Agreement ratio of indicators (0.0 - 1.0)</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-[#181D26] rounded border border-[#232833]">
                <span className="text-white font-mono">3. Expected Value (EV)</span>
                <span className="text-[#838C9C]">Statistical edge per trade</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-[#181D26] rounded border border-[#232833]">
                <span className="text-white font-mono">4. Market Regimes</span>
                <span className="text-[#838C9C]">One-hot Bull, Bear, Congestion vectors</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-[#181D26] rounded border border-[#232833]">
                <span className="text-white font-mono">5. CTrader Low Spread</span>
                <span className="text-[#838C9C]">1.0 for low spread, 0.0 otherwise</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-[#181D26] rounded border border-[#232833]">
                <span className="text-white font-mono">6. Log10 Entry Price</span>
                <span className="text-[#838C9C]">Normalized logarithmic entry coordinate</span>
              </div>
            </div>
          </div>

          <div className="bg-[#12161D] border border-[#232833] rounded-lg p-6 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <RotateCcw className="text-[#3DDBD9]" size={18} />
              ML Predictor Status Checklist
            </h3>
            <ul className="space-y-3 text-xs text-[#838C9C]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00E676] rounded-full"></span>
                Conventional Logistic Regression Baseline
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00E676] rounded-full"></span>
                Random Forest Decision Node Bootstrapping
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00E676] rounded-full"></span>
                Gradient Boosted Sequential Regression (GBDT)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00E676] rounded-full"></span>
                Active Out-Of-Sample Gate checking ROC-AUC &ge; 0.52
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00E676] rounded-full"></span>
                Strict Look-Ahead Bias Leakage Protection
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
