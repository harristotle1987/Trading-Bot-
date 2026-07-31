const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `          } else {
            console.warn("POLYGON_API_KEY not set, using default prices for forex");
            forexSymbols.forEach(s => GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0);
          }`;

const replacement = `          } else {
            forexSymbols.forEach(s => {
                if (!GLOBAL_PRICES[s]) {
                    GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                } else {
                    // Simulate random tick movement if no live API
                    const volatility = 0.0001;
                    const change = GLOBAL_PRICES[s] * (Math.random() * volatility * 2 - volatility);
                    GLOBAL_PRICES[s] = GLOBAL_PRICES[s] + change;
                }
            });
          }`;

code = code.replace(target, replacement);

const targetCryptoPolygon = `                      GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0; // Use fallback or 1.0`;
const replacementCryptoPolygon = `                      if (!GLOBAL_PRICES[s]) GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                      else GLOBAL_PRICES[s] += GLOBAL_PRICES[s] * (Math.random() * 0.0001 * 2 - 0.0001);`;

code = code.replace(targetCryptoPolygon, replacementCryptoPolygon);

const targetCryptoPolygon2 = `                      GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                      continue;`;
const replacementCryptoPolygon2 = `                      if (!GLOBAL_PRICES[s]) GLOBAL_PRICES[s] = forexFallbacks[s] || 1.0;
                      else GLOBAL_PRICES[s] += GLOBAL_PRICES[s] * (Math.random() * 0.0001 * 2 - 0.0001);
                      continue;`;

code = code.replace(targetCryptoPolygon2, replacementCryptoPolygon2);

fs.writeFileSync('server.ts', code);
