const fs = require('fs');

let content = fs.readFileSync('src/components/ClosedTrades.tsx', 'utf8');
content = content.replace(
    /} catch \(err\) {\n      console\.error\("Error fetching closed trades:", err\);\n      toast\.error\("Failed to fetch closed trades"\);\n    }/g,
    `} catch (err) {
      console.warn("Silent catch for network error during fetchClosedTrades:", err);
    }`
);
fs.writeFileSync('src/components/ClosedTrades.tsx', content);
