import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Add Footer import
    if (!content.includes('import Footer from "./components/Footer"')) {
        content = content.replace(
            /import Navbar from "\.\/components\/Navbar";?\r?\n/,
            'import Navbar from "./components/Navbar";\nimport Footer from "./components/Footer";\n'
        );
    }

    // Insert Footer at the bottom
    if (!content.includes('<Footer />')) {
        const regex = /(<\/Box>\s*\);\s*}\s*)$/;
        if (regex.test(content)) {
            content = content.replace(regex, 
                `    <div className="md:ml-52">\n     <Footer />\n    </div>\n   </Box>\n  );\n}\n`
            );
        } else {
            console.log(`Could not find the footer insertion point in ${file}`);
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        modifiedCount++;
        console.log(`Updated ${file}`);
    }
}
console.log(`Total files modified: ${modifiedCount}`);
