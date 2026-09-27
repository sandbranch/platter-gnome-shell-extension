/* Drawing a theme as St actors.
 *
 * ARCHITECTURE NOTE. A theme is absolutely-positioned pixel layers, which maps
 * onto either a single cairo surface (as tools/preview.py does) or a tree of St
 * actors. This takes the actor tree, because St.Button brings hover and press
 * states and input handling for free - which themes declare and would otherwise
 * need hand-rolled hit testing - and because an exception in a cairo repaint
 * handler fires every frame, where a bad actor is inert.
 *
 * The cost is the effects. round turned out to be free - St applies CSS
 * border-radius to a background image - and mask turned out not to need St at
 * all: the cut is done to the pixels before St ever sees them, in Theme.masked.
 * reflect has no St equivalent and is still unimplemented. If it turns out to
 * matter, those layers, and only those, can become St.DrawingArea children.
 * Everything the format knows how to say stays behind this one file, so that
 * swap does not spread.
 */

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Theme from './theme.js';

function cssColour(hex) {
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{8}$/.test(hex))
        return 'rgba(255,255,255,1)';
    const [r, g, b, a] = [1, 3, 5, 7].map(i => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

function fontStyle(font, scale) {
    if (!font)
        return '';
    const parts = [];
    if (font.family)
        parts.push(`font-family: "${font.family}";`);
    if (font.size)
        parts.push(`font-size: ${font.size * scale}pt;`);
    if (font.weight === 'bold')
        parts.push('font-weight: bold;');
    if (font.style && font.style !== 'normal')
        parts.push('font-style: italic;');
    return parts.join(' ');
}

function backgroundStyle(path) {
    return path ? `background-image: url("file://${path}"); background-size: contain;` : '';
}

/* round= is how a theme makes a square cover circular - Monocle sets 73 on a
 * 146px cover to fill its lens - and St applies border-radius to the background
 * image, so the format's most-used effect costs one declaration rather than the
 * St.DrawingArea this file's header budgeted for. */
function roundStyle(radius) {
    return radius ? `border-radius: ${radius}px;` : '';
}

/* format= puts several fields in one text layer, "%artist - %title", which
 * coverz skins do and a single bind cannot. Unknown %names are left as
 * written, and a line whose every field is empty is empty, so a stopped
 * player shows nothing rather than a stray " - ". A format naming no field
 * at all is a fixed caption ("now playing") and is shown as written. coverz
 * spells the track number %number. */
const FORMAT_FIELDS = new Set(['title', 'artist', 'album', 'genre', 'track',
    'year', 'length', 'position', 'player']);

function fillFormat(format, track) {
    let named = false, filled = false;
    const text = format.replace(/%(\w+)/g, (whole, name) => {
        const field = name === 'number' ? 'track' : name;
        if (!FORMAT_FIELDS.has(field))
            return whole;
        const value = track[field] ?? '';
        named = true;
        filled ||= value !== '';
        return value;
    });
    return filled || !named ? text : '';
}

export const PlatterWidget = GObject.registerClass({
    Signals: {'action': {param_types: [GObject.TYPE_STRING]}},
}, class PlatterWidget extends St.Widget {
    constructor(theme, scale = 1) {
        super({
            layout_manager: new Clutter.FixedLayout(),
            width: theme.canvas.width * scale,
            height: theme.canvas.height * scale,
            reactive: true,
            style_class: 'platter-widget',
        });
        this._theme = theme;
        this._scale = scale;
        this._texts = [];
        this._artwork = [];
        this._seekbars = [];
        this._buttons = [];
        this._playing = false;

        for (const layer of theme.layers) {
            try {
                this._build(layer);
            } catch (e) {
                logError(e, `Platter: could not build a ${layer.type} layer`);
            }
        }
    }

    _place(actor, layer) {
        actor.set_position(layer.x * this._scale, layer.y * this._scale);
        if (layer.width)
            actor.set_width(layer.width * this._scale);
        if (layer.height)
            actor.set_height(layer.height * this._scale);
        actor._visibleWhen = layer.visible || 'always';
        // rotate= is degrees clockwise about the layer's centre, as coverz
        // turned a cover to lie on a tilted record or under a taped frame.
        if (layer.rotate) {
            actor.set_pivot_point(0.5, 0.5);
            actor.rotation_angle_z = layer.rotate;
        }
        this.add_child(actor);
        return actor;
    }

    _build(layer) {
        switch (layer.type) {
        case 'image': {
            let path = Theme.assetAtScale(this._theme, layer.src, this._scale);
            if (layer.mask)
                path = Theme.masked(this._theme, path, layer.mask,
                    layer.width * this._scale, layer.height * this._scale);
            const bin = new St.Bin({
                style: `${backgroundStyle(path)} ${roundStyle((layer.round || 0) * this._scale)}`,
            });
            if (typeof layer.opacity === 'number')
                bin.opacity = Math.round(layer.opacity * 255);
            this._place(bin, layer);
            break;
        }
        case 'artwork': {
            const bin = new St.Bin({
                style_class: 'platter-artwork',
                style: roundStyle((layer.round || 0) * this._scale),
            });
            bin._round = (layer.round || 0) * this._scale;
            bin._mask = layer.mask || null;
            bin._cutSize = [layer.width * this._scale, layer.height * this._scale];
            this._place(bin, layer);
            this._artwork.push(bin);
            break;
        }
        case 'text': {
            const shadow = layer.shadow
                ? `text-shadow: ${(layer.shadow.dx || 0) * this._scale}px ` +
                    `${(layer.shadow.dy || 0) * this._scale}px 0px ${cssColour(layer.shadow.color)};`
                : '';
            const label = new St.Label({
                style: `${fontStyle(layer.font, this._scale)} color: ${cssColour(layer.color)}; ${shadow}`,
            });
            label.clutter_text.set_line_wrap(!!layer.wrap);
            label.clutter_text.set_ellipsize(
                layer.overflow?.mode?.startsWith('ellipsize') ? 3 /* END */ : 0 /* NONE */);
            if (layer.align)
                label.clutter_text.set_x_align({
                    left: Clutter.ActorAlign.START,
                    center: Clutter.ActorAlign.CENTER,
                    right: Clutter.ActorAlign.END,
                }[layer.align] ?? Clutter.ActorAlign.START);
            label.set_x_align(Clutter.ActorAlign.FILL);
            this._place(label, layer);
            label._bind = layer.bind;
            label._format = typeof layer.format === 'string' ? layer.format : null;
            label._maxchars = layer.overflow?.maxchars ?? 0;
            this._texts.push(label);
            break;
        }
        case 'seekbar': {
            const width = layer.width * this._scale, height = layer.height * this._scale;
            const group = new St.Widget({layout_manager: new Clutter.FixedLayout()});
            const back = new St.Bin({
                style: backgroundStyle(Theme.assetAtScale(this._theme, layer.back, this._scale)),
                width, height,
            });
            const fill = new St.Bin({
                style: backgroundStyle(Theme.assetAtScale(this._theme, layer.fill, this._scale)),
                height,
            });
            // The fill asset must not squash as it grows, so it keeps the full
            // width and the group clips it - which is what "progress" looks like.
            fill.set_width(width);
            const clip = new St.Widget({
                layout_manager: new Clutter.FixedLayout(),
                width: 0, height, clip_to_allocation: true,
            });
            clip.add_child(fill);
            group.add_child(back);
            group.add_child(clip);
            this._place(group, layer);
            this._seekbars.push({clip, full: width});
            break;
        }
        case 'button': {
            const states = layer.states || {};
            const button = new St.Button({
                style: backgroundStyle(Theme.assetAtScale(this._theme,
                    states.default?.normal, this._scale)),
                reactive: true, can_focus: true, track_hover: true,
            });
            button._states = states;
            button._action = layer.action;
            button.connect('notify::hover', () => this._paintButton(button));
            button.connect('notify::pressed', () => this._paintButton(button));
            button.connect('clicked', () => this.emit('action', layer.action));
            this._place(button, layer);
            this._buttons.push(button);
            break;
        }
        case 'rating': {
            // width/height/spacing are per-star, not the group's own box, so
            // this bypasses _place() rather than have it squash the row to
            // one star's width.
            const box = new Clutter.BoxLayout({
                orientation: layer.direction === 'vertical'
                    ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
                spacing: Math.round((layer.spacing || 0) * this._scale),
            });
            const group = new St.Widget({layout_manager: box, style_class: 'platter-rating'});
            group.set_position(layer.x * this._scale, layer.y * this._scale);
            group._visibleWhen = layer.visible || 'always';
            this.add_child(group);

            const stars = [];
            for (let i = 0; i < 5; i++) {
                const star = new St.Bin({
                    width: layer.width * this._scale, height: layer.height * this._scale,
                });
                group.add_child(star);
                stars.push(star);
            }
            this._rating = {
                stars,
                full: Theme.assetAtScale(this._theme, layer.star, this._scale),
                empty: Theme.assetAtScale(this._theme, layer.empty, this._scale),
            };
            break;
        }
        }
    }

    _paintButton(button) {
        const def = button._states.default || {};
        // A theme's "playing" state is a per-field override of "default", not a
        // replacement - many ported themes declare it as {normal: null, ...} to
        // mean "no distinct look while playing, keep showing the default icon",
        // and picking the object wholesale painted that null as no icon at all.
        const playing = button._action === 'play_pause' && this._playing
            ? button._states.playing : null;
        const pick = field => (playing && playing[field]) || def[field];
        const name = (button.pressed && pick('pressed')) ? pick('pressed')
            : (button.hover && pick('hover')) ? pick('hover') : pick('normal');
        button.set_style(backgroundStyle(Theme.assetAtScale(this._theme, name, this._scale)));
    }

    /* The cover cut to an artwork layer's mask, or null to draw it uncut: a
     * cover Platter cannot reach as a file (a player that hands out an http
     * URL) or a cut that failed. Called once a second, since update() is, but
     * the cut itself only happens when Theme.masked has nothing cached - and
     * asking it every time is what keeps a player that rewrites one cover file
     * for every track from showing the cut it made for the last one. */
    _cutToMask(bin, artUrl) {
        let path = null;
        if (artUrl.startsWith('/')) {
            path = artUrl;
        } else {
            try {
                [path] = GLib.filename_from_uri(artUrl);
            } catch (e) {
                return null;   // not a local file, so there is nothing to cut
            }
        }

        const [w, h] = bin._cutSize;
        const cut = Theme.masked(this._theme, path, bin._mask, w, h);
        return cut === path ? null : cut;
    }

    /** Point the widget at a track. Called on every MPRIS change. */
    update(track, progress) {
        this._playing = track.status === 'Playing';

        for (const actor of this.get_children()) {
            const when = actor._visibleWhen ?? 'always';
            actor.visible = when === 'always' ||
                (when === 'playing' && this._playing) ||
                (when === 'stopped' && !this._playing);
        }

        for (const label of this._texts) {
            let value = label._format ? fillFormat(label._format, track)
                : track[label._bind] ?? '';
            if (label._maxchars && value.length > label._maxchars)
                value = `${value.slice(0, label._maxchars)}…`;
            label.set_text(value);
        }

        for (const bin of this._artwork) {
            const cut = bin._mask && track.artUrl ? this._cutToMask(bin, track.artUrl) : null;
            const art = cut ? backgroundStyle(cut)
                : track.artUrl ? `background-image: url("${track.artUrl}"); background-size: cover;`
                : '';
            // The stylesheet's faint tint marks where a missing cover goes. A
            // real cover hides it only while the cover is square: one cut to
            // a mask leaves it showing in the corners, so it goes with the art.
            const tint = art ? 'background-color: transparent;' : '';
            bin.set_style(`${art} ${tint} ${roundStyle(bin._round)}`);
        }

        for (const {clip, full} of this._seekbars)
            clip.set_width(Math.round(full * (progress || 0)));

        for (const button of this._buttons)
            this._paintButton(button);

        if (this._rating) {
            const {stars, full, empty} = this._rating;
            const filled = Math.max(0, Math.min(5, track.rating || 0));
            stars.forEach((bin, i) => bin.set_style(backgroundStyle(i < filled ? full : empty)));
        }
    }
});
