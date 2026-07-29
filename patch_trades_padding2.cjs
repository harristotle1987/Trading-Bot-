const fs = require('fs');
let content = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

content = content.replace(
/<div className="bg-\[#12161D\] border-x-0 border-y-2 lg:border-2 lg:rounded-none xl:rounded-lg border-\[#1F2833\] p-4 lg:p-8 w-full trades-management-container">/g,
'<div className="bg-[#12161D] border-y-2 lg:border-x-0 lg:border-y-2 lg:rounded-none border-[#1F2833] p-4 lg:px-8 lg:py-6 w-full trades-management-container">'
);

fs.writeFileSync('src/components/TradesManagementPage.tsx', content);
