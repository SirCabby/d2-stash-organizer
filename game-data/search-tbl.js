const fs = require('fs');
const files = ['string.tbl', 'expansionstring.tbl', 'patchstring.tbl'];
const terms = ['Authority', 'Coven', 'Vigilance', 'Ritual'];

for (const file of files) {
    const buf = fs.readFileSync('game-data/txt-rotw/strings/' + file);
    for (const term of terms) {
        let pos = 0;
        while ((pos = buf.indexOf(term, pos)) >= 0) {
            let keyEnd = pos - 1;
            while (keyEnd > 0 && buf[keyEnd] !== 0) keyEnd--;
            let keyStart = keyEnd - 1;
            while (keyStart > 0 && buf[keyStart] !== 0) keyStart--;
            const key = buf.slice(keyStart + 1, keyEnd).toString('ascii');
            console.log(file + ': found "' + term + '" key: "' + key + '"');
            pos += term.length;
        }
    }
}
