const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/import TopNavbar from ".\/components\/TopNavbar";/g,
`import TopNavbar from "./components/TopNavbar";
import APIKeysModal from "./components/APIKeysModal";`
);

content = content.replace(
/      <Toaster position="bottom-right" theme="dark" \/>/g,
`      <Toaster position="bottom-right" theme="dark" />
      <APIKeysModal />`
);

fs.writeFileSync('src/App.tsx', content);
