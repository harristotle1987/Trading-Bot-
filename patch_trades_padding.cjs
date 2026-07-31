const fs = require('fs');
let content = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

// Replace the inner padding
content = content.replace(
/<div className="bg-\[#12161D\] border-2 border-\[#1F2833\] rounded-lg p-4 md:p-6 w-full">/g,
'<div className="bg-[#12161D] border-x-0 border-y-2 lg:border-2 lg:rounded-none xl:rounded-lg border-[#1F2833] p-4 lg:p-8 w-full trades-management-container">'
);

fs.writeFileSync('src/components/TradesManagementPage.tsx', content);
