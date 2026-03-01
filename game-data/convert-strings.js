const fs = require('fs');
const path = require('path');

const rotwStringsDir = path.join(__dirname, 'txt-rotw', 'strings');
const outputDir = path.join(__dirname, 'txt', 'strings');

const jsonFiles = [
    'item-gems.json',
    'item-modifiers.json',
    'item-names.json',
    'item-runes.json',
    'item-nameaffixes.json',
    'skills.json',
    'ui.json',
    'mercenaries.json',
    'levels.json',
    'monsters.json',
    'npcs.json',
    'objects.json',
    'quests.json',
    'shrines.json',
    'vo.json',
    'd2r-item-runes.json',
    'd2r-item-names.json',
    'd2r-item-modifiers.json',
    'd2r-skills.json',
    'd2r-ui.json',
];

const allStrings = new Map();

for (const file of jsonFiles) {
    const filePath = path.join(rotwStringsDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping missing file: ${file}`);
        continue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    const data = JSON.parse(raw);
    let count = 0;
    for (const entry of data) {
        if (entry.Key && entry.enUS) {
            const value = entry.enUS.replace(/\r?\n/g, '\\n').replace(/\t/g, ' ');
            allStrings.set(entry.Key, value);
            count++;
        }
    }
    console.log(`${file}: ${count} strings`);
}

// Also scan data files for items where namestr == code (inline names not in string table)
const txtDir = path.join(__dirname, 'txt');
const dataFiles = [
    { file: 'Armor.txt', nameCol: 0, codeCol: 19, namestrCol: 20 },
    { file: 'Weapons.txt', nameCol: 0, codeCol: 3, namestrCol: 5 },
    { file: 'Misc.txt', nameCol: 0, codeCol: 15, namestrCol: 17 },
];
for (const { file, nameCol, codeCol, namestrCol } of dataFiles) {
    const filePath = path.join(txtDir, file);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n').slice(1);
    let addedCount = 0;
    for (const line of lines) {
        const cols = line.split('\t');
        const name = cols[nameCol]?.trim();
        const code = cols[codeCol]?.trim();
        const namestr = cols[namestrCol]?.trim();
        if (name && namestr && namestr === code && !allStrings.has(namestr)) {
            allStrings.set(namestr, name);
            addedCount++;
        }
    }
    if (addedCount > 0) console.log(`${file}: added ${addedCount} inline names`);
}

console.log(`Total unique strings: ${allStrings.size}`);

const entries = Array.from(allStrings.entries());
const chunkSize = Math.ceil(entries.length / 4);

for (let i = 0; i < 4; i++) {
    const chunk = entries.slice(i * chunkSize, (i + 1) * chunkSize);
    const lines = ['String Index\tText'];
    for (const [key, value] of chunk) {
        lines.push(`${key}\t${value}`);
    }
    const outputFile = path.join(outputDir, `strings${i + 1}.txt`);
    fs.writeFileSync(outputFile, lines.join('\n') + '\n', 'utf-8');
    console.log(`Wrote ${chunk.length} strings to strings${i + 1}.txt`);
}

console.log('Done converting strings.');
