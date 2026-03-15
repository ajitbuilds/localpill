const fs = require('fs');
const path = require('path');

const files = [
    'app/(tabs)/explore.tsx',
    'app/(tabs)/index.tsx',
    'app/(tabs)/profile.tsx',
    'app/login.tsx',
    'app/chat.tsx',
    'app/notifications.tsx',
    'app/setup.tsx',
    'app/otp.tsx'
];

const basePath = '/Users/ajit/Desktop/localpill/localpill-mobile/pharmacy-app';
const importStatement = `import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';\n`;

files.forEach(file => {
    const fullPath = path.join(basePath, file);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');

    // Replace components
    content = content.replace(/<TouchableOpacity/g, '<AnimatedTouchable');
    content = content.replace(/<\/TouchableOpacity>/g, '</AnimatedTouchable>');

    // Add import if missing
    if (!content.includes('AnimatedTouchable')) {
        // Find the last react-native import or just insert after imports
        const lines = content.split('\n');
        let lastImportIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        lines.splice(lastImportIndex + 1, 0, importStatement);
        content = lines.join('\n');
    } else if (!content.includes('import { AnimatedTouchable }')) {
        const lines = content.split('\n');
        let lastImportIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        lines.splice(lastImportIndex + 1, 0, importStatement);
        content = lines.join('\n');
    }

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
});
