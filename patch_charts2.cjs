const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveChartsWorkspace.tsx', 'utf8');

const regex = /\{TRADABLE_PAIRS\.filter\(\(p: any\) => p\.category === 'forex'\)\.map\(\(p: any\) => \([\s\S]*?\)\)\}              <\/optgroup>/;
const replacement = `{TRADABLE_PAIRS.filter((p: any) => p.category === 'forex').map((p: any) => (
                  <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                ))}
              </optgroup>
              <optgroup label="Stocks">
                {TRADABLE_PAIRS.filter((p: any) => p.category === 'stocks').map((p: any) => (
                  <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                ))}
              </optgroup>`;

code = code.replace(/\{TRADABLE_PAIRS\.filter\(\(p: any\) => p\.category === 'forex'\)\.map\(\(p: any\) => \([\s\S]*?\)\)\}              <\/optgroup>/, replacement);

fs.writeFileSync('src/components/InteractiveChartsWorkspace.tsx', code);
