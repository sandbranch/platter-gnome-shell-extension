/* Convert a CoverGloobus or NowPlaying theme into the Platter format.
 *
 * This is a port of the archive project's porter, which was written against
 * CoverGloobus 1.7's own parser rather than against its theme documentation -
 * the two disagree, and the parser is what themes were actually tested on.
 * The mapping is therefore deliberate in places it looks arbitrary, and those
 * places carry the reason.
 *
 * Fidelity is the point, so a conversion that loses something says so. The
 * report it returns is written out beside the theme as port.json, because the
 * person best placed to judge a bad conversion is the one looking at it.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import * as XML from './xml.js';

export const FORMAT = 'platter-theme/0';

/* 1.7 dispatches text elements by node name. The last four are ours only
 * because the format has somewhere for them to land. */
const TEXT_BIND = {
    titlename: 'title', artistname: 'artist', albumname: 'album',
    genre: 'genre', tracknumber: 'track', year: 'year',
    length: 'length', time: 'position', playername: 'player',
};

const BUTTON_ACTION = {
    prev: 'previous', play: 'play_pause', play_pause: 'play_pause',
    next: 'next', mute: 'mute', quit: 'quit',
};

/* Every misspelling the corpus actually contains. Speculative repairs are not
 * repairs, so this list stays as short as the evidence: `widht` in 11 themes,
 * `pause_hove` in upstream's own BadChoice 2 and 3, `maxchqars` once. */
const TYPOS = {widht: 'width', maxchqars: 'maxchars', pause_hove: 'pause_hover'};

/* NowPlaying's controls carry no src: the filenames are a convention. */
const NOWPLAYING_FILES = {
    previous: ['prev', null], next: ['next', null], play_pause: ['play', 'pause'],
};

/* Pango knows nine weights; the format knows two, so anything from semibold up
 * becomes bold and the flattening is reported. */
const PANGO_STYLES = {italic: 'italic', oblique: 'oblique', normal: 'normal'};
const PANGO_BOLD = new Set(['semibold', 'demibold', 'bold', 'ultrabold',
    'extrabold', 'heavy', 'black', 'ultraheavy', 'ultrablack', 'extrablack']);
const PANGO_LIGHT = new Set(['thin', 'ultralight', 'extralight', 'light',
    'semilight', 'demilight', 'book', 'medium', 'normal', 'regular']);
const PANGO_OTHER = new Set(['small-caps', 'all-small-caps', 'condensed',
    'expanded', 'semi-condensed', 'semi-expanded', 'ultra-condensed',
    'ultra-expanded', 'extra-condensed', 'extra-expanded']);

const FONT_SUFFIXES = ['.ttf', '.otf', '.ttc', '.pfb', '.woff', '.woff2'];
const IMAGE_SUFFIXES = ['.png', '.svg', '.jpg', '.jpeg', '.gif', '.bmp', '.xpm'];

export function slug(text) {
    const s = String(text || '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'theme';
}

/** An asset's own pixel size, the way 1.7 asks gdk-pixbuf for it. */
export function measure(path) {
    try {
        if (path.toLowerCase().endsWith('.svg')) {
            const Rsvg = imports.gi.Rsvg;
            const handle = Rsvg.Handle.new_from_file(path);
            const [ok, width, height] = handle.get_intrinsic_size_in_pixels();
            return ok ? [Math.round(width), Math.round(height)] : null;
        }
        const GdkPixbuf = imports.gi.GdkPixbuf;
        const [format, width, height] = GdkPixbuf.Pixbuf.get_file_info(path);
        return format ? [width, height] : null;
    } catch (e) {
        return null;  // an unreadable asset is a lossy port, never a crash
    }
}

/** What the port did, said out loud. */
class Report {
    constructor() {
        this.repairs = [];
        this.derived = [];
        this.lossy = [];
        this.inferred = [];
        this.notes = [];
    }

    repair(where, was, now, why = '') {
        this.repairs.push({at: where, from: was, to: now, why});
    }

    /** Not a repair: 1.7 reads unset sizes off the asset, and so do we. */
    derive(where, what) {
        this.derived.push({at: where, taken: what});
    }

    lose(where, what) {
        this.lossy.push({at: where, dropped: what});
    }

    infer(where, what) {
        this.inferred.push({at: where, inferred: what});
    }

    note(text) {
        if (!this.notes.includes(text))
            this.notes.push(text);
    }

    get clean() {
        return !this.lossy.length && !this.inferred.length;
    }
}

/* ---- the theme directory on disk ---------------------------------------- */

function isFile(path) {
    return GLib.file_test(path, GLib.FileTest.IS_REGULAR);
}

function join(...parts) {
    return GLib.build_filenamev(parts);
}

function suffix(name) {
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

/** Every file under `root`, as paths relative to it, depth first. */
function walk(root, prefix = '', out = []) {
    let enumerator;
    try {
        enumerator = Gio.File.new_for_path(join(root, prefix)).enumerate_children(
            'standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    } catch (e) {
        return out;
    }
    const entries = [];
    let info;
    while ((info = enumerator.next_file(null)))
        entries.push([info.get_name(), info.get_file_type()]);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, type] of entries) {
        const relative = prefix ? `${prefix}/${name}` : name;
        if (type === Gio.FileType.DIRECTORY)
            walk(root, relative, out);
        else
            out.push(relative);
    }
    return out;
}

/* ---- the porter ---------------------------------------------------------- */

class Porter {
    /**
     * @param {string} root  directory holding skin.xml
     * @param {object} source  what is known about where the theme came from
     */
    constructor(root, source = {}) {
        this.root = root;
        this.source = source;
        this.report = new Report();
        this.assets = new Map();   // emitted name -> real path
        this.fonts = new Set();
        this.files = walk(root);
        this.xml = readText(join(root, 'skin.xml'));
    }

    /* ---- reading attributes --------------------------------------------- */

    /** A node's attributes, with the corpus's misspellings repaired. */
    attrs(node, where) {
        const out = {};
        for (const name of node.order) {
            const fixed = TYPOS[name];
            if (fixed) {
                this.report.repair(where, name, fixed, 'known misspelling');
                out[fixed] = node.attrs[name];
            } else {
                out[name] = node.attrs[name];
            }
        }
        return out;
    }

    integer(value, where, field, fallback = 0) {
        if (value === undefined || value === null || value === '')
            return fallback;
        const number = Number.parseFloat(String(value).trim());
        if (!Number.isFinite(number)) {
            this.report.lose(where, `${field}="${value}" is not a number`);
            return fallback;
        }
        return Math.trunc(number);
    }

    /** #RRGGBBAA, as 1.7's get_rgba slices it. */
    colour(value, where, field) {
        const v = String(value).trim().replace(/^#/, '');
        let full = v;
        if (/^[0-9a-fA-F]{6}$/.test(v)) {
            full = `${v}ff`;
            this.report.repair(where, `${field}=#${v}`, `${field}=#${full}`,
                'six digits: 1.7 needs eight and would crash');
        }
        if (!/^[0-9a-fA-F]{8}$/.test(full)) {
            this.report.lose(where, `${field}="${value}" is not a colour`);
            return null;
        }
        return `#${full.toLowerCase()}`;
    }

    /** Split a Pango description ("newPushkin Bold 18") into its parts. */
    font(description, where) {
        let tokens = String(description).split(/\s+/).filter(Boolean);
        const out = {family: '', size: null, weight: 'normal', style: 'normal'};

        if (tokens.length) {
            const size = Number.parseFloat(tokens[tokens.length - 1]);
            if (Number.isFinite(size) && /^[\d.]+$/.test(tokens[tokens.length - 1])) {
                out.size = Number.isInteger(size) ? size : size;
                tokens = tokens.slice(0, -1);
            }
        }
        while (tokens.length) {
            const last = tokens[tokens.length - 1];
            const word = last.toLowerCase();
            if (word in PANGO_STYLES) {
                if (word !== 'normal')
                    out.style = PANGO_STYLES[word];
            } else if (PANGO_BOLD.has(word)) {
                out.weight = 'bold';
                if (word !== 'bold')
                    this.report.lose(where, `font weight "${last}" flattened to bold`);
            } else if (PANGO_LIGHT.has(word)) {
                if (word !== 'normal' && word !== 'regular')
                    this.report.lose(where, `font weight "${last}" flattened to normal`);
            } else if (PANGO_OTHER.has(word)) {
                this.report.lose(where, `font trait "${last}" has no field in the format`);
            } else {
                break;
            }
            tokens = tokens.slice(0, -1);
        }

        out.family = tokens.join(' ');
        if (!out.family) {
            this.report.lose(where, `font="${description}" names no family`);
            out.family = 'Sans';
        }
        if (out.size === null)
            delete out.size;
        this.fonts.add(out.family);
        return out;
    }

    /* ---- assets ---------------------------------------------------------- */

    /** Resolve a theme-relative path, register it, and return its name. */
    asset(value, where) {
        const raw = String(value).trim().replace(/\\/g, '/').replace(/^\/+/, '');
        if (!raw)
            return null;
        const parts = raw.split('/').filter(p => p && p !== '.' && p !== '..');
        if (!parts.length)
            return null;

        let name = parts.join('/');
        let path = join(this.root, ...parts);
        if (!isFile(path)) {
            const wanted = parts[parts.length - 1].toLowerCase();
            const match = this.files.find(f =>
                f.split('/').pop().toLowerCase() === wanted);
            if (match === undefined) {
                this.report.lose(where, `asset "${raw}" is not in the theme`);
                return name;
            }
            this.report.repair(where, raw, match,
                'filename differs only by case or folder');
            name = match;
            path = join(this.root, ...match.split('/'));
        }
        this.assets.set(name, path);
        return name;
    }

    /** Fill a missing width/height from the asset, as 1.7's Image does. */
    sized(layer, name, where) {
        if (layer.width && layer.height)
            return;
        const path = name ? this.assets.get(name) : null;
        const size = path ? measure(path) : null;
        if (!size) {
            for (const key of ['width', 'height']) {
                if (!layer[key]) {
                    delete layer[key];
                    this.report.lose(where, `no ${key}, and none to measure`);
                }
            }
            return;
        }
        ['width', 'height'].forEach((key, i) => {
            if (!layer[key]) {
                layer[key] = size[i];
                this.report.derive(where, `${key}=${size[i]} from the asset`);
            }
        });
    }

    /** 1.7's "gap-height-alpha-resize": two pixel values, two percentages. */
    reflect(value, where) {
        const bits = String(value).split('-');
        const gap = Number.parseInt(bits[0], 10);
        const height = Number.parseInt(bits[1], 10);
        if (!Number.isFinite(gap) || !Number.isFinite(height)) {
            this.report.lose(where, `reflect="${value}" is unreadable`);
            return null;
        }
        const percent = (bit, fallback) => {
            const n = Number.parseInt(bit, 10);
            return Number.isFinite(n) ? n / 100 : fallback;
        };
        return {
            gap, height,
            alpha: bits.length > 2 ? percent(bits[2], 0.5) : 0.5,
            resize: bits.length > 3 ? percent(bits[3], 1.0) : 1.0,
        };
    }

    common(a, where, kind) {
        const layer = {
            type: kind,
            x: this.integer(a.x, where, 'x'),
            y: this.integer(a.y, where, 'y'),
        };
        for (const key of ['width', 'height']) {
            const value = this.integer(a[key], where, key);
            if (value)
                layer[key] = value;
        }
        if (a.display) {
            const mapped = {'on-playing': 'playing', 'on-stopped': 'stopped'}[a.display];
            if (mapped) {
                layer.visible = mapped;
                this.report.note('display= is honoured: NowPlaying defined it, ' +
                    '1.6 parsed it without drawing it, and 1.7 dropped it, so ' +
                    'these themes have never once shown what their author wrote');
            } else {
                this.report.lose(where, `display="${a.display}" is not a known mode`);
            }
        }
        if (a.reflect) {
            const reflection = this.reflect(a.reflect, where);
            if (reflection)
                layer.reflect = reflection;
        }
        return layer;
    }

    /* ---- elements -------------------------------------------------------- */

    image(node, where, cover) {
        const a = this.attrs(node, where);
        const layer = this.common(a, where, cover ? 'artwork' : 'image');
        let name = null;

        if (!cover) {
            if (!a.src) {
                this.report.lose(where, 'image has no src, so 1.7 skips it too');
                return null;
            }
            name = this.asset(a.src, where);
            layer.src = name;
        }
        if (a.round)
            layer.round = this.integer(a.round, where, 'round');
        if (a.opacity) {
            const opacity = Number.parseFloat(a.opacity);
            if (Number.isFinite(opacity))
                layer.opacity = opacity;
            else
                this.report.lose(where, `opacity="${a.opacity}" is not a number`);
        }
        if (a.mask)
            layer.mask = this.asset(a.mask, where);

        if (cover) {
            if (!(layer.width && layer.height)) {
                this.report.lose(where, 'album cover has no size, so 1.7 skips it');
                return null;
            }
        } else {
            this.sized(layer, name, where);
        }
        return layer;
    }

    text(node, where, bind) {
        const a = this.attrs(node, where);
        const layer = this.common(a, where, 'text');
        layer.bind = bind;

        if (a.font)
            layer.font = this.font(a.font, where);
        if (a.color) {
            const colour = this.colour(a.color, where, 'color');
            if (colour)
                layer.color = colour;
        }
        if (a.shadowcolor) {
            const shadow = this.colour(a.shadowcolor, where, 'shadowcolor');
            if (shadow) {
                layer.shadow = {
                    color: shadow,
                    dx: this.integer(a.shadow_x, where, 'shadow_x', 1),
                    dy: this.integer(a.shadow_y, where, 'shadow_y', 1),
                };
            }
        }
        if (['left', 'center', 'right'].includes(a.align))
            layer.align = a.align;
        else if (a.align)
            this.report.lose(where, `align="${a.align}" is not a known value`);
        if (['top', 'middle', 'bottom'].includes(a.valign))
            layer.valign = a.valign;
        layer.wrap = a.wrap === 'true';

        // 1.7 lets a user setting override all of this; "theme" means obey the
        // theme, and then scroll wins over ellipsize, which wins over maxchars.
        const overflow = {};
        if (a.scroll === 'true')
            overflow.mode = 'scroll';
        else if (a.ellipsize === 'word' || a.ellipsize === 'char')
            overflow.mode = `ellipsize-${a.ellipsize}`;
        else if (a.maxchars)
            overflow.mode = 'clip';
        const maxchars = this.integer(a.maxchars, where, 'maxchars', 0);
        if (maxchars)
            overflow.maxchars = maxchars;
        if (Object.keys(overflow).length)
            layer.overflow = overflow;
        return layer;
    }

    rating(node, where) {
        const a = this.attrs(node, where);
        const layer = this.common(a, where, 'rating');
        if (!a.star || !a.nostar) {
            this.report.lose(where, 'rating has no star/nostar artwork');
            return null;
        }
        layer.star = this.asset(a.star, where);
        layer.empty = this.asset(a.nostar, where);
        if (a.hover)
            layer.hover = this.asset(a.hover, where);
        if (a.pressed)
            this.report.lose(where, 'rating pressed artwork: the format has no field for it');
        layer.spacing = this.integer(a.spacing, where, 'spacing');
        layer.direction = a.direction === 'vertical' ? 'vertical' : 'horizontal';
        this.sized(layer, layer.star, where);
        return layer;
    }

    seekbar(node, where) {
        const a = this.attrs(node, where);
        const layer = this.common(a, where, 'seekbar');
        layer.back = a.back ? this.asset(a.back, where) : null;
        layer.fill = a.top ? this.asset(a.top, where) : null;
        // 1.7 picks the widget by shape, not by an attribute: wider than tall
        // is horizontal, anything else vertical.
        layer.orientation = (layer.width || 0) > (layer.height || 0)
            ? 'horizontal' : 'vertical';

        for (const child of node.children) {
            if (child.name !== 'thumb')
                continue;
            const at = `${where}/thumb`;
            const t = this.attrs(child, at);
            if (!t.src) {
                this.report.lose(at, 'thumb has no src');
                break;
            }
            const thumb = {src: this.asset(t.src, at)};
            for (const key of ['width', 'height']) {
                const value = this.integer(t[key], at, key);
                if (value)
                    thumb[key] = value;
            }
            this.sized(thumb, thumb.src, at);
            const slice = {};
            let any = false;
            for (const side of ['top', 'right', 'bottom', 'left']) {
                slice[side] = this.integer(t[side], at, side);
                any = any || Boolean(slice[side]);
            }
            if (any)
                thumb.slice = slice;
            layer.thumb = thumb;
            break;  // 1.7 takes the first thumb and stops
        }
        return layer;
    }

    button(node, where, row = null) {
        const action = BUTTON_ACTION[node.name];
        if (action === undefined) {
            this.report.lose(where, `<${node.name}> is not a control 1.7 knows`);
            return null;
        }
        const a = this.attrs(node, where);
        const layer = this.common(a, where, 'button');
        layer.action = action;

        const state = (srcKey, hoverKey, pressedKey, convention) => {
            const got = {};
            const keys = [['normal', srcKey], ['hover', hoverKey], ['pressed', pressedKey]];
            const endings = {normal: '', hover: '-hover', pressed: '-pressed'};
            for (const [field, key] of keys) {
                if (a[key]) {
                    got[field] = this.asset(a[key], where);
                    continue;
                }
                if (!convention) {
                    got[field] = null;
                    continue;
                }
                // NowPlaying writes no src: prev.png, prev-hover.png, ...
                const guess = convention + endings[field];
                const found = this.files.find(f => {
                    if (f.includes('/'))
                        return false;
                    const base = f.slice(0, f.length - suffix(f).length);
                    return base.toLowerCase() === guess &&
                        IMAGE_SUFFIXES.includes(suffix(f));
                });
                if (found) {
                    got[field] = this.asset(found, where);
                    this.report.infer(where,
                        `${field} artwork "${found}" from NowPlaying's naming`);
                } else {
                    got[field] = null;
                }
            }
            return got;
        };

        const convention = a.src ? null : NOWPLAYING_FILES[action];
        layer.states = {
            default: state('src', 'hover', 'pressed', convention ? convention[0] : null),
        };
        if (action === 'play_pause') {
            layer.states.playing = state('pause', 'pause_hover', 'pause_pressed',
                convention ? convention[1] : null);
        }
        if (row !== null)
            this.placeInRow(layer, a, row, where);
        this.sized(layer, layer.states.default.normal, where);
        return layer;
    }

    /** NowPlaying positions controls as a row; CoverGloobus never does. */
    placeInRow(layer, a, row, where) {
        if ('x' in a && 'y' in a)
            return;
        row.members.push([layer, where]);
        this.report.infer(where, 'position computed from <playercontrols> ' +
            'x/y/spacing, which NowPlaying centres the row on');
    }

    controls(node, where) {
        const a = this.attrs(node, where);
        const row = {
            x: this.integer(a.x, where, 'x'),
            y: this.integer(a.y, where, 'y'),
            spacing: this.integer(a.spacing, where, 'spacing'),
            members: [],
        };
        const layers = [];
        node.children.forEach((child, n) => {
            const layer = this.button(child, `${where}/${child.name}[${n}]`, row);
            if (layer)
                layers.push(layer);
        });

        if (row.members.length) {
            this.layOutRow(row);
        } else if (row.x || row.y) {
            this.report.note(`<playercontrols> at ${row.x},${row.y} is ignored, ` +
                'exactly as 1.7 ignores it: its children carry absolute positions');
        }
        return layers;
    }

    /* Not pixels: NowPlaying's Theme.py divides x/y by the skin's own
     * width/height and hands the result to gtk.Alignment(xalign, yalign) as
     * the row's position within the whole window. gtk.Alignment places its
     * child by scaling those fractions against the leftover space (window
     * size minus child size), not by centring or bottom-anchoring in pixels -
     * verified against NowPlaying/UI/Theme.py's parseSkinXML and
     * PlayerControls, not the skin format's own (misleading) comment. */
    layOutRow(row) {
        for (const [layer, where] of row.members)
            this.sized(layer, layer.states.default.normal, where);
        const widths = row.members.map(([layer]) => layer.width || 0);
        const heights = row.members.map(([layer]) => layer.height || 0);
        const total = widths.reduce((sum, w) => sum + w, 0) +
            row.spacing * (row.members.length - 1);
        const rowHeight = Math.max(0, ...heights);
        const xd = this.canvasWidth ? row.x / this.canvasWidth : 0;
        const yd = this.canvasHeight ? row.y / this.canvasHeight : 0;
        let x = Math.round(xd * (this.canvasWidth - total));
        const y = Math.round(yd * (this.canvasHeight - rowHeight));
        row.members.forEach(([layer], i) => {
            layer.x = x;
            layer.y = y;
            x += widths[i] + row.spacing;
        });
    }

    /* ---- the whole theme ------------------------------------------------- */

    /**
     * Parse, and then whatever it takes.
     *
     * Themes are hand-written XML from people who were not thinking about XML,
     * and one of them is not well-formed at all: GAIA 10 Rdio puts a bare "--"
     * inside a comment as a horizontal rule, which XML forbids. 1.7 parsed with
     * minidom, so that theme has never once loaded - it was broken the day it
     * was uploaded and nobody ever said. Repairing it is the only way it renders
     * at all, and each repair is recorded.
     */
    parse() {
        try {
            return XML.parse(this.xml);
        } catch (first) {
            const comments = /<!--([\s\S]*?)-->/g;
            const patched = this.xml.replace(comments,
                (whole, body) => `<!--${body.replace(/--/g, '-')}-->`);
            if (patched !== this.xml) {
                try {
                    const root = XML.parse(patched);
                    this.report.repair('skin.xml', '-- inside a comment', '-',
                        'XML forbids it, so this never parsed anywhere');
                    return root;
                } catch (e) {
                    // fall through to stripping them entirely
                }
            }
            const stripped = this.xml.replace(comments, '');
            try {
                const root = XML.parse(stripped);
                this.report.repair('skin.xml', 'comments', '(removed)',
                    `the file will not parse with them: ${first.message}`);
                return root;
            } catch (e) {
                throw first;
            }
        }
    }

    build() {
        const root = this.parse();
        const skin = XML.firstByName(root, 'skin');
        if (!skin)
            throw new Error('there is no <skin> element in skin.xml');

        const a = this.attrs(skin, 'skin');
        const width = this.integer(a.width, 'skin', 'width', 0);
        const height = this.integer(a.height, 'skin', 'height', 0);
        if (width < 1 || height < 1) {
            throw new Error('the skin has no usable width/height, and 1.7 exits ' +
                'on that rather than guessing');
        }
        this.canvasWidth = width;
        this.canvasHeight = height;

        const layers = [];
        skin.children.forEach((node, n) => {
            const name = node.name;
            const where = `${name}[${n}]`;
            if (name === 'image') {
                const layer = this.image(node, where, false);
                if (layer)
                    layers.push(layer);
            } else if (name === 'albumcover') {
                const layer = this.image(node, where, true);
                if (layer)
                    layers.push(layer);
            } else if (name in TEXT_BIND) {
                if (name === 'playername')
                    this.report.note("playername is NowPlaying's; CoverGloobus never read it");
                layers.push(this.text(node, where, TEXT_BIND[name]));
            } else if (name === 'rating') {
                const layer = this.rating(node, where);
                if (layer)
                    layers.push(layer);
            } else if (name === 'seekbar') {
                layers.push(this.seekbar(node, where));
            } else if (name === 'quit' || name === 'mute') {
                const layer = this.button(node, where);
                if (layer)
                    layers.push(layer);
            } else if (name === 'playercontrols') {
                layers.push(...this.controls(node, where));
            } else {
                this.report.lose(where, `<${name}> is not in the grammar`);
            }
        });

        const name = a.name || this.source.theme || this.root.split('/').pop();
        const theme = {
            format: FORMAT,
            id: slug(name),
            name,
            canvas: {width, height},
            attribution: {
                author: this.source.author || 'unknown',
                source_url: this.source.source_url || '',
                license: this.source.license || 'unknown',
                original_app: this.source.original_app || 'covergloobus',
                upstream_author: this.source.upstream_author ?? null,
                // A theme converted on this machine, from a file its author
                // published elsewhere, is exactly the case the project calls
                // non-free: it may sit in your own themes directory and go no
                // further. Silence is not permission.
                distribution: this.source.distribution || 'non-free',
            },
            fonts: this.fontList(),
            layers,
        };
        if (this.source.license_note)
            theme.attribution.license_note = this.source.license_note;
        return theme;
    }

    /**
     * Every family the theme asks for, declared and never assumed.
     *
     * Nothing is marked bundled. A font file shipping inside a theme is not
     * evidence its author had the right to ship it - Optic bundles Microsoft's
     * Segoe UI - so the file is reported for a human to rule on rather than
     * copied along.
     */
    fontList() {
        const available = new Map();
        for (const file of this.files) {
            if (!FONT_SUFFIXES.includes(suffix(file)))
                continue;
            const base = file.split('/').pop();
            const stem = base.slice(0, base.length - suffix(base).length);
            available.set(stem.toLowerCase(), base);
        }

        return [...this.fonts].sort().map(family => {
            const key = family.toLowerCase().replace(/\s+/g, '');
            let match = available.get(key);
            if (match === undefined) {
                for (const [stem, name] of available) {
                    if (key.startsWith(stem) || stem.startsWith(key)) {
                        match = name;
                        break;
                    }
                }
            }
            if (match) {
                this.report.lose('fonts',
                    `${match} left behind: a bundled font is not a licensed font`);
                return {
                    family, bundled: false,
                    reason: `${match} ships with the theme, but whether it may be ` +
                        'redistributed is unresolved',
                };
            }
            return {
                family, bundled: false,
                reason: 'named by the theme, never bundled with it',
            };
        });
    }
}

/* ---- files in and out ---------------------------------------------------- */

function readText(path) {
    const [ok, bytes] = GLib.file_get_contents(path);
    if (!ok)
        throw new Error(`cannot read ${path}`);
    return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Every directory holding a theme.json, nearest first.
 *
 * A theme somebody already converted needs no porter, only moving. This is
 * how a shared collection of ported themes imports, and why a folder full of
 * them is as good an import target as an original archive.
 */
export function findPortedRoots(base) {
    const roots = [];
    if (isFile(join(base, 'theme.json')))
        roots.push(base);
    for (const relative of walk(base)) {
        if (relative.split('/').pop() !== 'theme.json')
            continue;
        const parts = relative.split('/').slice(0, -1);
        if (parts.length)
            roots.push(join(base, ...parts));
    }
    return [...new Set(roots)];
}

/** Every directory holding a skin.xml, nearest first. */
export function findThemeRoots(base) {
    const roots = [];
    if (isFile(join(base, 'skin.xml')))
        roots.push(base);
    for (const relative of walk(base)) {
        if (relative.split('/').pop().toLowerCase() !== 'skin.xml')
            continue;
        const parts = relative.split('/').slice(0, -1);
        if (parts.length)
            roots.push(join(base, ...parts));
    }
    return [...new Set(roots)];
}

/**
 * Convert the theme rooted at `root` and write it into `outBase`/<id>.
 *
 * Returns {id, path, theme, report}. An id already taken is suffixed rather
 * than overwritten unless `replace` is set: losing a theme you had installed
 * because a new one happened to share a name is not a trade anyone agreed to.
 */
export function install(root, outBase, {source = {}, replace = false} = {}) {
    const porter = new Porter(root, source);
    const theme = porter.build();

    let id = theme.id;
    if (!replace) {
        let n = 2;
        while (GLib.file_test(join(outBase, id), GLib.FileTest.IS_DIR))
            id = `${theme.id}-${n++}`;
    }
    theme.id = id;

    const out = join(outBase, id);
    GLib.mkdir_with_parents(out, 0o755);

    const copied = [];
    const missing = [];
    for (const [name, path] of [...porter.assets].sort()) {
        const target = join(out, ...name.split('/'));
        const parent = Gio.File.new_for_path(target).get_parent();
        try {
            parent.make_directory_with_parents(null);
        } catch (e) {
            // already there, which is the common case
        }
        if (!isFile(path)) {
            missing.push(name);
            continue;
        }
        try {
            Gio.File.new_for_path(path).copy(Gio.File.new_for_path(target),
                Gio.FileCopyFlags.OVERWRITE, null, null);
            copied.push(name);
        } catch (e) {
            missing.push(name);
            porter.report.lose(name, `could not be copied: ${e.message}`);
        }
    }

    for (const shot of ['screenshot.png', 'screenshot.jpg', 'preview.png']) {
        const found = join(root, shot);
        if (!isFile(found))
            continue;
        try {
            Gio.File.new_for_path(found).copy(
                Gio.File.new_for_path(join(out, `screenshot${suffix(shot)}`)),
                Gio.FileCopyFlags.OVERWRITE, null, null);
        } catch (e) {
            // a missing screenshot costs the preview, nothing else
        }
        break;
    }

    write(join(out, 'theme.json'), `${JSON.stringify(theme, null, 2)}\n`);
    write(join(out, 'port.json'), `${JSON.stringify({
        ported: GLib.DateTime.new_now_local().format('%Y-%m-%d'),
        porter: 'platter/lib/port.js',
        source: {from: root, app: theme.attribution.original_app},
        assets: {copied, not_shipped: missing},
        repairs: porter.report.repairs,
        derived: porter.report.derived,
        lossy: porter.report.lossy,
        inferred: porter.report.inferred,
        notes: porter.report.notes,
    }, null, 2)}\n`);

    return {id, path: out, theme, report: porter.report};
}

/**
 * Install a theme that is already in Platter's format, by copying it.
 *
 * Validated first, and only lightly: enough to be sure this is a theme and not
 * a directory that happens to contain a theme.json. A theme that is wrong in
 * some subtler way produces a widget that looks wrong, which lib/theme.js is
 * built to survive, and which the user can see and judge for themselves.
 */
export function copyPorted(root, outBase, {replace = false} = {}) {
    const theme = JSON.parse(readText(join(root, 'theme.json')));
    if (theme.format !== FORMAT)
        throw new Error(`declares format ${theme.format}, expected ${FORMAT}`);
    if (!(theme.canvas?.width > 0 && theme.canvas?.height > 0))
        throw new Error('has no usable canvas');
    if (!Array.isArray(theme.layers))
        throw new Error('has no layers');

    let id = slug(theme.id || theme.name || root.split('/').pop());
    if (!replace) {
        const wanted = id;
        let n = 2;
        while (GLib.file_test(join(outBase, id), GLib.FileTest.IS_DIR))
            id = `${wanted}-${n++}`;
    }

    const out = join(outBase, id);
    GLib.mkdir_with_parents(out, 0o755);
    const copied = [];
    for (const relative of walk(root)) {
        const target = join(out, ...relative.split('/'));
        const parent = Gio.File.new_for_path(target).get_parent();
        try {
            parent.make_directory_with_parents(null);
        } catch (e) {
            // already there, which is the common case
        }
        Gio.File.new_for_path(join(root, ...relative.split('/'))).copy(
            Gio.File.new_for_path(target), Gio.FileCopyFlags.OVERWRITE,
            null, null);
        copied.push(relative);
    }

    if (id !== theme.id) {
        theme.id = id;
        write(join(out, 'theme.json'), `${JSON.stringify(theme, null, 2)}\n`);
    }

    const report = new Report();
    report.note(`copied as it was: already in ${FORMAT}, so nothing was converted`);
    return {id, path: out, theme, report, copied};
}

function write(path, text) {
    const file = Gio.File.new_for_path(path);
    file.replace_contents(new TextEncoder().encode(text), null, false,
        Gio.FileCreateFlags.REPLACE_DESTINATION, null);
}

/** Where converted themes go: the extension reads this without being told. */
export function userThemeDir() {
    return join(GLib.get_user_data_dir(), 'platter', 'themes');
}
