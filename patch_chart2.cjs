const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

const oldInterval = `          const updateInterval = setInterval(async () => {
              if (!isMounted) return clearInterval(updateInterval);
              try {
                  const res = await fetch('/api/market/prices', { cache: 'no-store' });
                  if (!res.ok) return;
                  const data = await res.json();
                  if (data[selectedSymbol]) {
                      const newPrice = data[selectedSymbol];`;

const newInterval = `          const updateInterval = setInterval(async () => {
              if (!isMounted) return clearInterval(updateInterval);
              try {
                  const data = globalPricesForChart;
                  if (data[selectedSymbol]) {
                      const newPrice = data[selectedSymbol];`;

code = code.replace(oldInterval, newInterval);
code = code.replace('const { positions } = useRealtimeData();', 'const { positions, prices } = useRealtimeData();\n  globalPricesForChart = prices;');
code = code.replace('import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";', 'import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";\nlet globalPricesForChart: Record<string, number> = {};');

fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
