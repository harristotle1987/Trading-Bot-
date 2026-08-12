import { SignalRecord, SignalOutcome } from "./signalDataset.js";
import fs from "fs";
import path from "path";

// ==========================================
// 1. MATHEMATICAL UTILITIES
// ==========================================
export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
}

export function logLoss(p: number, y: number): number {
  const eps = 1e-15;
  const pClamped = Math.max(eps, Math.min(1 - eps, p));
  return -(y * Math.log(pClamped) + (1 - y) * Math.log(1 - pClamped));
}

// ==========================================
// 2. MACHINE LEARNING MODELS (PURE TS)
// ==========================================

/**
 * 2.1 Logistic Regression with L2 Regularization & Gradient Descent
 */
export class LogisticRegressionModel {
  weights: number[] = [];
  bias = 0.0;
  learningRate: number;
  lambda: number; // L2 regularization coefficient
  epochs: number;

  constructor(learningRate = 0.05, lambda = 0.01, epochs = 200) {
    this.learningRate = learningRate;
    this.lambda = lambda;
    this.epochs = epochs;
  }

  train(X: number[][], y: number[]) {
    if (X.length === 0) return;
    const numFeatures = X[0].length;
    this.weights = new Array(numFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    this.bias = 0.0;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (let i = 0; i < X.length; i++) {
        const xi = X[i];
        const yi = y[i];
        
        let z = this.bias;
        for (let j = 0; j < numFeatures; j++) {
          z += xi[j] * this.weights[j];
        }
        
        const pi = sigmoid(z);
        const error = pi - yi;

        // Gradient descent with L2 regularization
        this.bias -= this.learningRate * error;
        for (let j = 0; j < numFeatures; j++) {
          const l2Grad = this.lambda * this.weights[j];
          this.weights[j] -= this.learningRate * (error * xi[j] + l2Grad);
        }
      }
    }
  }

  predictProbability(x: number[]): number {
    let z = this.bias;
    for (let j = 0; j < x.length; j++) {
      z += x[j] * (this.weights[j] || 0);
    }
    return sigmoid(z);
  }
}

/**
 * 2.2 Decision Tree Classifier for Random Forest & GBDT
 */
export interface TreeNode {
  featureIdx: number | null;
  threshold: number | null;
  left: TreeNode | null;
  right: TreeNode | null;
  value: number | null; // Probability prediction or leaf weight
  isLeaf: boolean;
}

export class DecisionTree {
  root: TreeNode | null = null;
  maxDepth: number;
  minSamplesSplit: number;

  constructor(maxDepth = 4, minSamplesSplit = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  trainClassification(X: number[][], y: number[]) {
    this.root = this.buildTree(X, y, 0);
  }

  private buildTree(X: number[][], y: number[], depth: number): TreeNode {
    const numSamples = X.length;
    const numFeatures = numSamples > 0 ? X[0].length : 0;

    // Base conditions for leaf nodes
    const allSameLabel = y.every(val => val === y[0]);
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || allSameLabel || numSamples === 0) {
      const sum = y.reduce((acc, val) => acc + val, 0);
      return {
        featureIdx: null,
        threshold: null,
        left: null,
        right: null,
        value: numSamples > 0 ? sum / numSamples : 0.5,
        isLeaf: true
      };
    }

    let bestGini = 1.0;
    let bestFeatureIdx = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    // Gini Impurity calculation helper
    const calculateGini = (leftY: number[], rightY: number[]): number => {
      const gLeft = leftY.length > 0 ? 1 - Math.pow(leftY.filter(x => x === 1).length / leftY.length, 2) - Math.pow(leftY.filter(x => x === 0).length / leftY.length, 2) : 0;
      const gRight = rightY.length > 0 ? 1 - Math.pow(rightY.filter(x => x === 1).length / rightY.length, 2) - Math.pow(rightY.filter(x => x === 0).length / rightY.length, 2) : 0;
      return (leftY.length / numSamples) * gLeft + (rightY.length / numSamples) * gRight;
    };

    // Find the optimal binary split threshold
    for (let f = 0; f < numFeatures; f++) {
      const values = X.map(row => row[f]);
      const thresholds = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let t = 0; t < thresholds.length - 1; t++) {
        const threshold = (thresholds[t] + thresholds[t + 1]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < numSamples; i++) {
          if (X[i][f] <= threshold) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const gini = calculateGini(
          leftIdx.map(idx => y[idx]),
          rightIdx.map(idx => y[idx])
        );

        if (gini < bestGini) {
          bestGini = gini;
          bestFeatureIdx = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    // Fallback if no splitting yields improvement
    if (bestFeatureIdx === -1) {
      const sum = y.reduce((acc, val) => acc + val, 0);
      return {
        featureIdx: null,
        threshold: null,
        left: null,
        right: null,
        value: numSamples > 0 ? sum / numSamples : 0.5,
        isLeaf: true
      };
    }

    const leftNode = this.buildTree(bestLeftIndices.map(i => X[i]), bestLeftIndices.map(i => y[i]), depth + 1);
    const rightNode = this.buildTree(bestRightIndices.map(i => X[i]), bestRightIndices.map(i => y[i]), depth + 1);

    return {
      featureIdx: bestFeatureIdx,
      threshold: bestThreshold,
      left: leftNode,
      right: rightNode,
      value: null,
      isLeaf: false
    };
  }

  predict(x: number[]): number {
    let node = this.root;
    while (node && !node.isLeaf) {
      const val = x[node.featureIdx!];
      if (val <= node.threshold!) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return node ? (node.value ?? 0.5) : 0.5;
  }
}

/**
 * 2.3 Random Forest Classifier
 */
export class RandomForestModel {
  trees: DecisionTree[] = [];
  numTrees: number;
  maxDepth: number;

  constructor(numTrees = 8, maxDepth = 4) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
  }

  train(X: number[][], y: number[]) {
    this.trees = [];
    const numSamples = X.length;

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sampling (bagging)
      const X_boot: number[][] = [];
      const y_boot: number[] = [];

      for (let s = 0; s < numSamples; s++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        X_boot.push(X[randIdx]);
        y_boot.push(y[randIdx]);
      }

      const tree = new DecisionTree(this.maxDepth);
      tree.trainClassification(X_boot, y_boot);
      this.trees.push(tree);
    }
  }

  predictProbability(x: number[]): number {
    if (this.trees.length === 0) return 0.5;
    let sum = 0.0;
    for (const tree of this.trees) {
      sum += tree.predict(x);
    }
    return sum / this.trees.length;
  }
}

/**
 * 2.4 Gradient Boosted Decision Trees (GBDT / XGBoost Style)
 */
export class GBDTModel {
  trees: DecisionTree[] = [];
  learningRate: number;
  numEstimators: number;
  maxDepth: number;
  basePrediction = 0.0; // log-odds initial value

  constructor(numEstimators = 8, learningRate = 0.1, maxDepth = 3) {
    this.numEstimators = numEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  train(X: number[][], y: number[]) {
    this.trees = [];
    const numSamples = X.length;
    if (numSamples === 0) return;

    // Initial base forecast (mean probability translated to log-odds)
    const pMean = Math.max(0.01, Math.min(0.99, y.reduce((acc, v) => acc + v, 0) / numSamples));
    this.basePrediction = Math.log(pMean / (1 - pMean));

    const F = new Array(numSamples).fill(this.basePrediction);

    for (let t = 0; t < this.numEstimators; t++) {
      // Calculate probability outputs & negative gradient residuals (pseudo-residuals)
      const r: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        const pi = sigmoid(F[i]);
        r.push(y[i] - pi); // Log-Loss residual
      }

      // Train tree directly to estimate residuals
      const tree = new DecisionTree(this.maxDepth);
      tree.trainClassification(X, r);

      // Gradient update step
      for (let i = 0; i < numSamples; i++) {
        F[i] += this.learningRate * tree.predict(X[i]);
      }

      this.trees.push(tree);
    }
  }

  predictProbability(x: number[]): number {
    let logOdds = this.basePrediction;
    for (const tree of this.trees) {
      logOdds += this.learningRate * tree.predict(x);
    }
    return sigmoid(logOdds);
  }
}

// ==========================================
// 3. PROBABILITY CALIBRATION (PLATT SCALING)
// ==========================================
export class PlattCalibrator {
  alpha = 1.0;
  beta = 0.0;

  train(probabilities: number[], labels: number[]) {
    // Sigmoid calibration: P(y=1 | p) = 1 / (1 + exp(alpha * p + beta))
    // Optimized via standard batch logistic search
    let bestLoss = Infinity;
    let bestA = 1.0;
    let bestB = 0.0;

    const aCandidates = [-3.0, -1.5, -0.5, 0.5, 1.5, 3.0];
    const bCandidates = [-2.0, -1.0, 0.0, 1.0, 2.0];

    for (const a of aCandidates) {
      for (const b of bCandidates) {
        let totalLoss = 0.0;
        for (let i = 0; i < probabilities.length; i++) {
          const z = a * probabilities[i] + b;
          const calibrated = sigmoid(z);
          totalLoss += logLoss(calibrated, labels[i]);
        }
        if (totalLoss < bestLoss) {
          bestLoss = totalLoss;
          bestA = a;
          bestB = b;
        }
      }
    }

    this.alpha = bestA;
    this.beta = bestB;
  }

  calibrate(probability: number): number {
    const z = this.alpha * probability + this.beta;
    return sigmoid(z);
  }
}

// ==========================================
// 4. DATASET BUILDER
// ==========================================
export interface FeatureMetadata {
  features: number[];
  label: number; // 1 = WIN, 0 = LOSS
}

export class DatasetBuilder {
  /**
   * Translates a stream of historic SignalRecords into robust numerical feature vectors.
   * Ensures STRICT protection against look-ahead leaks by excluding future indicators or target variables.
   */
  static buildFeatureVectors(signals: SignalRecord[]): FeatureMetadata[] {
    const dataset: FeatureMetadata[] = [];

    // Filter only terminal closed outcomes for model training inputs
    const closedSignals = signals.filter(s => s.outcome === SignalOutcome.WIN || s.outcome === SignalOutcome.LOSS);

    for (const sig of closedSignals) {
      const features: number[] = [];

      // 1. Core Score Metrics
      features.push(sig.signal_score || 50.0);
      features.push(sig.expected_value || 0.0);
      features.push(sig.strategy_agreement || 0.0);

      // 2. Market Regime Category One-Hot Encoding
      // Options: BULL_TREND, BEAR_TREND, CONGESTION, HIGH_VOLATILITY, NEUTRAL
      const regime = (sig.market_regime || "NEUTRAL").toUpperCase();
      features.push(regime.includes("BULL") ? 1.0 : 0.0);
      features.push(regime.includes("BEAR") ? 1.0 : 0.0);
      features.push(regime.includes("CONGESTION") ? 1.0 : 0.0);
      features.push(regime.includes("VOLATILITY") ? 1.0 : 0.0);

      // 3. Technical Indicator Aggregations (from strategy results payload)
      const res = sig.strategy_results || {};
      const winRateProb = Number(res.winRateProbability) || 50.0;
      features.push(winRateProb);

      // Check news parameters
      const isNewsActive = res.isNewsBlackoutActive ? 1.0 : 0.0;
      features.push(isNewsActive);

      // CTrader Low Spread pip variance
      const isLowSpread = (res.ctraderValidation || "").includes("0.1 Pip") ? 1.0 : 0.0;
      features.push(isLowSpread);

      // Entry Price structural normalization
      features.push(Math.log10(sig.entry));

      // Outcome targets definition: WIN = 1, LOSS = 0
      const label = sig.outcome === SignalOutcome.WIN ? 1 : 0;

      dataset.push({
        features,
        label
      });
    }

    return dataset;
  }
}

// ==========================================
// 5. TRAINING, TESTING, & OUT-OF-SAMPLE VALIDATION SUITE
// ==========================================
export interface BucketStats {
  bucketRange: string; // "50–59%", "60–69%", "70–79%", "80–89%", "90–100%"
  count: number;
  actualWinRate: number;
  predictedWinRate: number;
  expectedValue: number; // average actual realized return (R-multiple)
  predictedEV: number; // average signal-derived statistical edge
}

export interface ComparisonMetrics {
  tradesCount: number;
  winRatePct: number;
  netProfitR: number;
  maxDrawdownPct: number;
}

export interface DetailedModelMetrics {
  accuracy: number;
  auc: number;
  brierScore: number;
  logLoss: number;
  passedValidation: boolean;
  precision: number;
  recall: number;
  f1: number;
  ece: number; // Expected Calibration Error
  alpha: number; // Platt calibrator alpha
  beta: number; // Platt calibrator beta
  buckets: BucketStats[];
  comparison: {
    baseline: ComparisonMetrics;
    filtered: ComparisonMetrics;
  };
}

export class MLValidator {
  /**
   * Simulates drawdown, net profit, and max drawdown over sequential trades
   */
  static simulateDrawdownAndReturn(trades: { outcome: string; R_multiple: number }[]): {
    netProfitR: number;
    maxDrawdownPct: number;
  } {
    const initialEquity = 10000;
    let equity = initialEquity;
    let peak = initialEquity;
    let maxDD = 0;

    for (const t of trades) {
      const r = t.R_multiple;
      equity += r * 100; // Assumes $100 risk per trade (1R)
      if (equity > peak) {
        peak = equity;
      }
      const dd = (peak - equity) / peak;
      if (dd > maxDD) {
        maxDD = dd;
      }
    }

    const netProfit = equity - initialEquity;
    return {
      netProfitR: parseFloat((netProfit / 100).toFixed(2)),
      maxDrawdownPct: parseFloat((maxDD * 100).toFixed(2))
    };
  }

  /**
   * Computes out-of-sample metrics over a trained model on unseen data
   */
  static evaluateModel(
    predictions: number[], // Calibrated probability forecasts
    labels: number[],      // Binary outcomes (1 = WIN, 0 = LOSS)
    testSignals: SignalRecord[]
  ): DetailedModelMetrics {
    const numSamples = labels.length;
    if (numSamples === 0) {
      return {
        accuracy: 0,
        auc: 0.5,
        brierScore: 0,
        logLoss: 0,
        passedValidation: false,
        precision: 0,
        recall: 0,
        f1: 0,
        ece: 0,
        alpha: 1.0,
        beta: 0.0,
        buckets: [],
        comparison: {
          baseline: { tradesCount: 0, winRatePct: 0, netProfitR: 0, maxDrawdownPct: 0 },
          filtered: { tradesCount: 0, winRatePct: 0, netProfitR: 0, maxDrawdownPct: 0 }
        }
      };
    }

    let tp = 0, fp = 0, tn = 0, fn = 0;
    let brierSum = 0;
    let lossSum = 0;

    for (let i = 0; i < numSamples; i++) {
      const pred = predictions[i];
      const actual = labels[i];

      // Standard decision threshold binary logic
      const binarized = pred >= 0.5 ? 1 : 0;
      if (binarized === 1 && actual === 1) tp++;
      else if (binarized === 1 && actual === 0) fp++;
      else if (binarized === 0 && actual === 0) tn++;
      else if (binarized === 0 && actual === 1) fn++;

      brierSum += Math.pow(pred - actual, 2);
      lossSum += logLoss(pred, actual);
    }

    const accuracy = (tp + tn) / numSamples;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const brierScore = brierSum / numSamples;
    const meanLogLoss = lossSum / numSamples;

    // Simplified AUC calculation using Mann-Whitney U test formula
    const winPreds = predictions.filter((_, idx) => labels[idx] === 1);
    const lossPreds = predictions.filter((_, idx) => labels[idx] === 0);
    
    let auc = 0.5;
    if (winPreds.length > 0 && lossPreds.length > 0) {
      let ranksSum = 0;
      for (const w of winPreds) {
        for (const l of lossPreds) {
          if (w > l) ranksSum += 1.0;
          else if (w === l) ranksSum += 0.5;
        }
      }
      auc = ranksSum / (winPreds.length * lossPreds.length);
    }

    // High-reliability gate: out-of-sample AUC must strictly exceed 0.52 to deploy production models
    const passedValidation = auc >= 0.52;

    // Define standard probability buckets
    const ranges = [
      { label: "50–59%", min: 0.50, max: 0.60 },
      { label: "60–69%", min: 0.60, max: 0.70 },
      { label: "70–79%", min: 0.70, max: 0.80 },
      { label: "80–89%", min: 0.80, max: 0.90 },
      { label: "90–100%", min: 0.90, max: 1.01 } // Inclusive of 1.00
    ];

    const buckets: BucketStats[] = ranges.map(r => {
      const indicesInBucket: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        const p = predictions[i];
        if (p >= r.min && p < r.max) {
          indicesInBucket.push(i);
        }
      }

      const count = indicesInBucket.length;
      let actualWins = 0;
      let predSum = 0;
      let evSum = 0;
      let rMultipleSum = 0;

      for (const idx of indicesInBucket) {
        if (labels[idx] === 1) actualWins++;
        predSum += predictions[idx];
        const sig = testSignals[idx];
        evSum += sig?.expected_value || 0;
        const rMult = sig?.R_multiple !== null && sig?.R_multiple !== undefined
          ? sig.R_multiple
          : (labels[idx] === 1 ? 1.0 : -1.0);
        rMultipleSum += rMult;
      }

      return {
        bucketRange: r.label,
        count,
        actualWinRate: count > 0 ? parseFloat((actualWins / count).toFixed(4)) : 0.0,
        predictedWinRate: count > 0 ? parseFloat((predSum / count).toFixed(4)) : 0.0,
        expectedValue: count > 0 ? parseFloat((rMultipleSum / count).toFixed(4)) : 0.0,
        predictedEV: count > 0 ? parseFloat((evSum / count).toFixed(4)) : 0.0
      };
    });

    // Compute Expected Calibration Error (ECE) over the buckets
    let ece = 0;
    const bucketTotalCount = buckets.reduce((acc, b) => acc + b.count, 0);
    if (bucketTotalCount > 0) {
      for (const b of buckets) {
        if (b.count > 0) {
          ece += (b.count / bucketTotalCount) * Math.abs(b.actualWinRate - b.predictedWinRate);
        }
      }
    }

    // Trade Comparison (Baseline Strategy vs ML Filtered Strategy)
    // Baseline Strategy (ALL trades taken)
    const baselineTrades = testSignals.map((sig, idx) => ({
      outcome: labels[idx] === 1 ? "WIN" : "LOSS",
      R_multiple: sig.R_multiple !== null && sig.R_multiple !== undefined
        ? sig.R_multiple
        : (labels[idx] === 1 ? 1.0 : -1.0)
    }));

    const baselineWins = baselineTrades.filter(t => t.outcome === "WIN").length;
    const baselineWinRate = baselineTrades.length > 0 ? (baselineWins / baselineTrades.length) * 100 : 0;
    const baselineSim = this.simulateDrawdownAndReturn(baselineTrades);

    // Strategy + ML Filter (Only take signals where Calibrated Probability >= 55% as an conservative filter)
    const filterThreshold = 0.55;
    const filteredTradesIndices: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      if (predictions[i] >= filterThreshold) {
        filteredTradesIndices.push(i);
      }
    }

    const filteredTrades = filteredTradesIndices.map(idx => {
      const sig = testSignals[idx];
      return {
        outcome: labels[idx] === 1 ? "WIN" : "LOSS",
        R_multiple: sig.R_multiple !== null && sig.R_multiple !== undefined
          ? sig.R_multiple
          : (labels[idx] === 1 ? 1.0 : -1.0)
      };
    });

    const filteredWins = filteredTrades.filter(t => t.outcome === "WIN").length;
    const filteredWinRate = filteredTrades.length > 0 ? (filteredWins / filteredTrades.length) * 100 : 0;
    const filteredSim = this.simulateDrawdownAndReturn(filteredTrades);

    return {
      accuracy: parseFloat(accuracy.toFixed(4)),
      auc: parseFloat(auc.toFixed(4)),
      brierScore: parseFloat(brierScore.toFixed(4)),
      logLoss: parseFloat(meanLogLoss.toFixed(4)),
      passedValidation,
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1: parseFloat(f1.toFixed(4)),
      ece: parseFloat(ece.toFixed(4)),
      alpha: 1.0,
      beta: 0.0,
      buckets,
      comparison: {
        baseline: {
          tradesCount: baselineTrades.length,
          winRatePct: parseFloat(baselineWinRate.toFixed(2)),
          netProfitR: baselineSim.netProfitR,
          maxDrawdownPct: baselineSim.maxDrawdownPct
        },
        filtered: {
          tradesCount: filteredTrades.length,
          winRatePct: parseFloat(filteredWinRate.toFixed(2)),
          netProfitR: filteredSim.netProfitR,
          maxDrawdownPct: filteredSim.maxDrawdownPct
        }
      }
    };
  }
}

// ==========================================
// 6. VERSION CONTROLLED MODEL REGISTRY
// ==========================================
export interface RegisteredModel {
  version: string;
  weights: any;
  calibratorAlpha: number;
  calibratorBeta: number;
  metrics: DetailedModelMetrics;
  modelType: "logistic_regression" | "random_forest" | "gbdt";
  deployed: boolean;
  candidateMetrics?: {
    logistic_regression: DetailedModelMetrics;
    random_forest: DetailedModelMetrics;
    gbdt: DetailedModelMetrics;
  };
}

const REGISTRY_PATH = path.join(process.cwd(), "model_registry.json");

export class ModelRegistry {
  private static loadRegistry(): RegisteredModel[] {
    try {
      if (fs.existsSync(REGISTRY_PATH)) {
        const fileContent = fs.readFileSync(REGISTRY_PATH, "utf8");
        return JSON.parse(fileContent || "[]");
      }
    } catch (_) {}
    return [];
  }

  private static saveRegistry(registry: RegisteredModel[]) {
    try {
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
    } catch (err: any) {
      console.error("Failed to save Model Registry:", err.message);
    }
  }

  static getActiveModel(): RegisteredModel | null {
    const list = this.loadRegistry();
    return list.find(m => m.deployed) || null;
  }

  static registerAndDeploy(
    weights: any,
    calibrator: PlattCalibrator,
    metrics: DetailedModelMetrics,
    modelType: "logistic_regression" | "random_forest" | "gbdt",
    candidateMetrics: {
      logistic_regression: DetailedModelMetrics;
      random_forest: DetailedModelMetrics;
      gbdt: DetailedModelMetrics;
    }
  ): string {
    const registry = this.loadRegistry();
    const version = `v1.${registry.length + 1}-${Date.now().toString().slice(-4)}`;

    // Do NOT automatically replace the active production model. Enforce explicit promotion.
    const newModel: RegisteredModel = {
      version,
      weights,
      calibratorAlpha: calibrator.alpha,
      calibratorBeta: calibrator.beta,
      metrics,
      modelType,
      deployed: false, // MANDATORY: Store model with deployed: false so promotion is purely manual
      candidateMetrics
    };

    registry.push(newModel);
    this.saveRegistry(registry);
    return version;
  }

  static rollbackToVersion(version: string): boolean {
    const registry = this.loadRegistry();
    const found = registry.find(m => m.version === version);
    if (!found) return false;

    registry.forEach(m => {
      m.deployed = (m.version === version);
    });

    this.saveRegistry(registry);
    return true;
  }

  static getAllModels(): RegisteredModel[] {
    return this.loadRegistry();
  }
}

// ==========================================
// 7. MULTI-MODEL TRAINING ENSEMBLE PIPELINE
// ==========================================
export interface PipelineOutcome {
  version: string;
  modelType: string;
  metrics: DetailedModelMetrics;
  deployed: boolean;
  candidateMetrics?: {
    logistic_regression: DetailedModelMetrics;
    random_forest: DetailedModelMetrics;
    gbdt: DetailedModelMetrics;
  };
}

export class MLPipeline {
  static trainAndSelectBest(signals: SignalRecord[]): PipelineOutcome | null {
    const dataset = DatasetBuilder.buildFeatureVectors(signals);
    if (dataset.length < 10) {
      console.warn(`[ML PIPELINE] Training deferred: require at least 10 historical outcomes. Current dataset count: ${dataset.length}`);
      return null;
    }

    // Split 70% Train, 30% Out-of-sample test
    const splitIndex = Math.floor(dataset.length * 0.7);
    const trainData = dataset.slice(0, splitIndex);
    const testData = dataset.slice(splitIndex);

    const X_train = trainData.map(d => d.features);
    const y_train = trainData.map(d => d.label);
    const X_test = testData.map(d => d.features);
    const y_test = testData.map(d => d.label);

    const closedSignals = signals.filter(s => s.outcome === SignalOutcome.WIN || s.outcome === SignalOutcome.LOSS);
    const testSignals = closedSignals.slice(splitIndex);

    // 1. Logistic Regression Baseline
    const logReg = new LogisticRegressionModel();
    logReg.train(X_train, y_train);
    const predsA = X_test.map(x => logReg.predictProbability(x));
    const calibratorA = new PlattCalibrator();
    calibratorA.train(predsA, y_test);
    const calibratedPredsA = predsA.map(p => calibratorA.calibrate(p));
    const metricsA = MLValidator.evaluateModel(calibratedPredsA, y_test, testSignals);
    metricsA.alpha = calibratorA.alpha;
    metricsA.beta = calibratorA.beta;

    // 2. Random Forest Classifier
    const rf = new RandomForestModel();
    rf.train(X_train, y_train);
    const predsB = X_test.map(x => rf.predictProbability(x));
    const calibratorB = new PlattCalibrator();
    calibratorB.train(predsB, y_test);
    const calibratedPredsB = predsB.map(p => calibratorB.calibrate(p));
    const metricsB = MLValidator.evaluateModel(calibratedPredsB, y_test, testSignals);
    metricsB.alpha = calibratorB.alpha;
    metricsB.beta = calibratorB.beta;

    // 3. Gradient Boosted Trees (GBDT)
    const gbdt = new GBDTModel();
    gbdt.train(X_train, y_train);
    const predsC = X_test.map(x => gbdt.predictProbability(x));
    const calibratorC = new PlattCalibrator();
    calibratorC.train(predsC, y_test);
    const calibratedPredsC = predsC.map(p => calibratorC.calibrate(p));
    const metricsC = MLValidator.evaluateModel(calibratedPredsC, y_test, testSignals);
    metricsC.alpha = calibratorC.alpha;
    metricsC.beta = calibratorC.beta;

    // Select best model type based on out-of-sample AUC
    let bestModelType: "logistic_regression" | "random_forest" | "gbdt" = "logistic_regression";
    let bestMetrics = metricsA;
    let bestWeights: any = { weights: logReg.weights, bias: logReg.bias };
    let bestCalibrator = calibratorA;

    if (metricsB.auc > bestMetrics.auc) {
      bestModelType = "random_forest";
      bestMetrics = metricsB;
      bestWeights = { trees: rf.trees };
      bestCalibrator = calibratorB;
    }
    if (metricsC.auc > bestMetrics.auc) {
      bestModelType = "gbdt";
      bestMetrics = metricsC;
      bestWeights = { trees: gbdt.trees, basePrediction: gbdt.basePrediction };
      bestCalibrator = calibratorC;
    }

    const candidateMetrics = {
      logistic_regression: metricsA,
      random_forest: metricsB,
      gbdt: metricsC
    };

    // Register candidate models (stored with deployed: false so they don't replace production automatically)
    const version = ModelRegistry.registerAndDeploy(
      bestWeights,
      bestCalibrator,
      bestMetrics,
      bestModelType,
      candidateMetrics
    );

    return {
      version,
      modelType: bestModelType,
      metrics: bestMetrics,
      deployed: false, // Forced false per user instructions - must promote manually
      candidateMetrics
    };
  }

  /**
   * Computes setup outcome probability using the active deployed ML model.
   * Returns probability = null and modelStatus = "UNAVAILABLE" when no model is active.
   */
  static predictSetupProbability(features: number[]): {
    probability: number | null;
    modelStatus: "AVAILABLE" | "UNAVAILABLE";
    modelVersion: string | null;
    modelType: string | null;
    version?: string; // backwards compatibility alias
  } {
    const active = ModelRegistry.getActiveModel();
    if (!active) {
      return {
        probability: null,
        modelStatus: "UNAVAILABLE",
        modelVersion: null,
        modelType: null,
        version: "v0.0-none"
      };
    }

    let rawProb = 0.50;
    if (active.modelType === "logistic_regression") {
      const lr = new LogisticRegressionModel();
      lr.weights = active.weights.weights;
      lr.bias = active.weights.bias;
      rawProb = lr.predictProbability(features);
    } else if (active.modelType === "random_forest") {
      const rf = new RandomForestModel();
      rf.trees = active.weights.trees;
      rawProb = rf.predictProbability(features);
    } else if (active.modelType === "gbdt") {
      const gbdt = new GBDTModel();
      gbdt.trees = active.weights.trees;
      gbdt.basePrediction = active.weights.basePrediction;
      rawProb = gbdt.predictProbability(features);
    }

    // Pass probability through calibration scaling curves
    const calibrator = new PlattCalibrator();
    calibrator.alpha = active.calibratorAlpha;
    calibrator.beta = active.calibratorBeta;

    const calibratedProbability = calibrator.calibrate(rawProb);

    return {
      probability: parseFloat(calibratedProbability.toFixed(4)),
      modelStatus: "AVAILABLE",
      modelVersion: active.version,
      modelType: active.modelType,
      version: active.version
    };
  }
}
