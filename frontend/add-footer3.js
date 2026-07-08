import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

let modifiedCount = 0;

for (const file of files) {
    if (['AdminDashboard.tsx', 'LoginPage.tsx', 'Router.tsx'].includes(file)) continue;

    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    let originalContent = content;

    // Check if it's a "standard page"
    if (!content.includes('import Navbar from "./components/Navbar"')) continue;

    // Insert Footer at the bottom if not present
    if (!content.includes('<Footer />')) {
        // Match the very end of a typical React component, optionally with export default
        const regex = /(<\/(?:Box|div|)>)\s*\);\s*};?\s*(?:export default \w+;?\s*)?$/;
        if (regex.test(content)) {
            content = content.replace(regex, 
                `    <div className="md:ml-52">\n     <Footer />\n    </div>\n   $1\n  );\n};\n\n${content.match(/export default \w+;?/)?.[0] || ''}\n`
            );
        } else {
            console.log(`Could not find the footer insertion point in ${file}`);
        }
    }

    if (content !== originalContent) {
        // Clean up double exports if they exist
        content = content.replace(/(export default \w+;?\n)+$/, '$1');
        
        fs.writeFileSync(filePath, content);
        modifiedCount++;
        console.log(`Updated ${file}`);
    }
}
console.log(`Total files modified: ${modifiedCount}`);
