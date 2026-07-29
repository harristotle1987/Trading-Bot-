import React from "react";
import RiskDashboard from "./RiskDashboard";

export default function OverviewDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Market Overview</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDashboard />
      </div>
    </div>
  );
}
