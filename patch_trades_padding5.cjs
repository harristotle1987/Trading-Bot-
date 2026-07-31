const fs = require('fs');
let content = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

content = content.replace(
/<div className="bg-\[#0B0C10\] text-\[#E0E0E0\] p-3 md:p-8 font-sans rounded-lg border-2 border-\[#1F2833\] shadow-2xl h-full flex flex-col">/g,
'<div className="trades-management-container bg-[#0B0C10] text-[#E0E0E0] p-3 md:p-6 lg:p-0 font-sans rounded-lg lg:rounded-none border-2 lg:border-none border-[#1F2833] shadow-2xl h-full flex flex-col">'
);

// We need to add padding to the Header Bar if we remove it from the container so it doesn't touch the edge.
content = content.replace(
/{(\/\* Header Bar \*\/)}\s+<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b-2 border-\[#1F2833\] pb-4">/g,
'{$1}\n      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b-2 border-[#1F2833] pb-4 lg:px-8 lg:pt-8">'
);

// We also might want to add padding to the empty states and table wrapper so they aren't touching edges if we removed padding on lg:p-0
content = content.replace(
/className="flex-1 overflow-auto min-h-0"/g,
'className="flex-1 overflow-auto min-h-0 lg:px-8 lg:pb-8"'
);

fs.writeFileSync('src/components/TradesManagementPage.tsx', content);
