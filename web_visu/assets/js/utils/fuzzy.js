// Fuzzy text matching for course search
//
// A query matches when every whitespace-separated token either appears as a
// substring of the text, or is within a small edit distance of the beginning
// of some word in the text. Case, umlauts and diacritics are ignored.

function normalizeSearchText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

// Allowed typos per token length (short tokens must match exactly)
function allowedEdits(tokenLength) {
    if (tokenLength <= 3) return 0;
    if (tokenLength <= 7) return 1;
    return 2;
}

// Smallest edit distance (with adjacent transpositions) between `token`
// and any prefix of `word`
function prefixEditDistance(token, word) {
    const m = token.length;
    const n = word.length;
    const rows = [];
    for (let i = 0; i <= m; i++) {
        rows.push(new Array(n + 1).fill(0));
        rows[i][0] = i;
    }
    for (let j = 0; j <= n; j++) rows[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = token[i - 1] === word[j - 1] ? 0 : 1;
            let best = Math.min(
                rows[i - 1][j] + 1,
                rows[i][j - 1] + 1,
                rows[i - 1][j - 1] + cost
            );
            if (i > 1 && j > 1 && token[i - 1] === word[j - 2] && token[i - 2] === word[j - 1]) {
                best = Math.min(best, rows[i - 2][j - 2] + 1);
            }
            rows[i][j] = best;
        }
    }
    return Math.min(...rows[m]);
}

function tokenMatches(token, text, words) {
    if (text.includes(token)) return true;
    const maxEdits = allowedEdits(token.length);
    if (maxEdits === 0) return false;
    return words.some(word => prefixEditDistance(token, word) <= maxEdits);
}

function fuzzyMatch(text, query) {
    const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const normalizedText = normalizeSearchText(text);
    const words = normalizedText.split(/[^a-z0-9]+/).filter(Boolean);
    return tokens.every(token => tokenMatches(token, normalizedText, words));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fuzzyMatch, normalizeSearchText };
}
