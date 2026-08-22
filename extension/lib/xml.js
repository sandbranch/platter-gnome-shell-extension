/* A small XML reader, sized for skin.xml and nothing else.
 *
 * GJS has no general XML parser it can rely on: there is no Archive or GXml
 * typelib to count on, and GLib's markup parser cannot be driven from JS.
 * That would be a problem for arbitrary XML. It is not one here, because
 * skin.xml is a closed grammar - a <skin> element whose children carry all
 * their meaning in attributes - and every element, attribute and misspelling
 * that appears across the recovered corpus is already enumerated in port.js.
 *
 * What this must survive is not exotic XML but careless XML. These files were
 * hand-written in 2011 by people who were not thinking about parsers:
 * unquoted attributes, stray text, mismatched case, and one theme with a bare
 * "--" inside a comment, which XML forbids outright.
 */

const NAME_START = /[A-Za-z_:]/;
const NAME_CHAR = /[-A-Za-z0-9_:.]/;

const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

/** Expand the entities the corpus actually uses, and leave the rest alone. */
export function decode(text) {
    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X'
                ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
            return Number.isFinite(code) && code > 0
                ? String.fromCodePoint(code) : whole;
        }
        const named = ENTITIES[body.toLowerCase()];
        return named === undefined ? whole : named;
    });
}

class Reader {
    constructor(text) {
        this.text = text;
        this.at = 0;
    }

    get done() {
        return this.at >= this.text.length;
    }

    peek(what) {
        return this.text.startsWith(what, this.at);
    }

    skipSpace() {
        while (!this.done && /\s/.test(this.text[this.at]))
            this.at++;
    }

    /** Everything up to `close`, consuming it; the rest of the file if absent. */
    until(close) {
        const end = this.text.indexOf(close, this.at);
        if (end < 0) {
            const rest = this.text.slice(this.at);
            this.at = this.text.length;
            return rest;
        }
        const body = this.text.slice(this.at, end);
        this.at = end + close.length;
        return body;
    }

    name() {
        const start = this.at;
        if (this.done || !NAME_START.test(this.text[this.at]))
            return '';
        this.at++;
        while (!this.done && NAME_CHAR.test(this.text[this.at]))
            this.at++;
        return this.text.slice(start, this.at);
    }

    /** One attribute value: quoted if the author bothered, bare if not. */
    value() {
        const quote = this.text[this.at];
        if (quote === '"' || quote === "'") {
            this.at++;
            return decode(this.until(quote));
        }
        const start = this.at;
        while (!this.done && !/[\s/>]/.test(this.text[this.at]))
            this.at++;
        return decode(this.text.slice(start, this.at));
    }

    attributes() {
        const attrs = {};
        const order = [];
        for (;;) {
            this.skipSpace();
            if (this.done || this.peek('>') || this.peek('/>'))
                return {attrs, order};
            const name = this.name();
            if (!name) {
                this.at++;  // junk between attributes: step over it
                continue;
            }
            this.skipSpace();
            let value = '';
            if (this.peek('=')) {
                this.at++;
                this.skipSpace();
                value = this.value();
            }
            if (!(name in attrs))
                order.push(name);
            attrs[name] = value;
        }
    }
}

function node(name, attrs, order) {
    return {name, attrs, order, children: [], text: ''};
}

/**
 * Parse into a tree of {name, attrs, order, children, text}.
 *
 * Throws on the two failures that are not recoverable here - no root element,
 * and an unterminated comment - so the caller can try its repairs and say so.
 * Everything softer is absorbed: a stray closing tag, an unclosed element at
 * end of file, text where none belongs.
 */
export function parse(text) {
    const reader = new Reader(text);
    const stack = [];
    let root = null;

    while (!reader.done) {
        const next = reader.text.indexOf('<', reader.at);
        if (next < 0)
            break;
        if (next > reader.at && stack.length) {
            const body = reader.text.slice(reader.at, next);
            if (body.trim())
                stack[stack.length - 1].text += decode(body);
        }
        reader.at = next;

        if (reader.peek('<!--')) {
            reader.at += 4;
            const before = reader.at;
            reader.until('-->');
            if (reader.done && reader.at === before)
                throw new Error('a comment is never closed');
            continue;
        }
        if (reader.peek('<![CDATA[')) {
            reader.at += 9;
            const body = reader.until(']]>');
            if (stack.length)
                stack[stack.length - 1].text += body;
            continue;
        }
        if (reader.peek('<?') || reader.peek('<!')) {
            reader.at += 2;
            reader.until('>');
            continue;
        }
        if (reader.peek('</')) {
            reader.at += 2;
            const name = reader.name();
            reader.until('>');
            // Close the nearest matching element. A closing tag matching
            // nothing is ignored rather than fatal: it is the commonest
            // hand-editing slip in the corpus and never changes the layout.
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].name === name) {
                    stack.length = i;
                    break;
                }
            }
            continue;
        }

        reader.at++;  // past '<'
        const name = reader.name();
        if (!name) {
            reader.until('>');
            continue;
        }
        const {attrs, order} = reader.attributes();
        const element = node(name, attrs, order);
        const selfClosing = reader.peek('/>');
        reader.until('>');

        if (stack.length)
            stack[stack.length - 1].children.push(element);
        else if (root === null)
            root = element;
        else
            continue;  // a second root: XML forbids it, and 1.7 saw only the first

        if (!selfClosing)
            stack.push(element);
    }

    if (root === null)
        throw new Error('no element in the file at all');
    return root;
}

/** The first element with this name, depth-first, or null. */
export function firstByName(root, name) {
    if (root.name === name)
        return root;
    for (const child of root.children) {
        const found = firstByName(child, name);
        if (found)
            return found;
    }
    return null;
}
