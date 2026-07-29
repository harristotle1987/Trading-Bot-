const fs = require('fs');
let content = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

content = content.replace(
/className="bg-\[#12161D\] border-y-2 lg:border-x-0 lg:border-y-2 lg:rounded-none border-\[#1F2833\] p-4 lg:px-8 lg:py-6 w-full trades-management-container"/g,
'className="bg-[#12161D] border-y-2 lg:border-none lg:rounded-none border-[#1F2833] p-4 lg:px-2 lg:py-4 xl:px-6 w-full trades-management-container"'
);

fs.writeFileSync('src/components/TradesManagementPage.tsx', content);
