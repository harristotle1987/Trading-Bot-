const fs = require('fs');
let content = fs.readFileSync('src/components/TradesManagementPage.tsx', 'utf8');

content = content.replace(
/<div className="hidden md:block overflow-x-auto bg-\[#12161D\] border-2 border-\[#1F2833\] rounded-lg w-full">/g,
'<div className="hidden md:block overflow-x-auto bg-[#12161D] border-2 lg:border-x-0 lg:border-y-2 lg:rounded-none border-[#1F2833] rounded-lg w-full">'
);

fs.writeFileSync('src/components/TradesManagementPage.tsx', content);
