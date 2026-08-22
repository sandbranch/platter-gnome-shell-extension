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
 * border-radius to a background image - but reflect and mask have no St
 * equivalent and are still unimplemented. If they turn out to matter, those
 * layers, and only those, can become St.DrawingArea children. Everything the
 * format knows how to say stays behind this one file, so that swap does not
 * spread.
 */

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Theme from './theme.js';

function cssColour(hex) {
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{8}$/.test(hex))
        return 'rgba(255,255,255,1)';
    const [r, g, b, a] = [1, 3, 5, 7].map(i => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

function fontStyle(font) {
    if (!font)
        return '';
    const parts = [];
    if (font.family)
        parts.push(`font-family: "${font.family}";`);
    if (font.size)
        parts.push(`font-size: ${font.size}pt;`);
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

export const PlatterWidget = GObject.registerClass({
    Signals: {'action': {param_types: [GObject.TYPE_STRING]}},
}, class PlatterWidget extends St.Widget {
    constructor(theme) {
        super({
            layout_manager: new Clutter.FixedLayout(),
            width: theme.canvas.width,
            height: theme.canvas.height,
            reactive: true,
            style_class: 'platter-widget',
        });
        this._theme = theme;
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
        actor.set_position(layer.x, layer.y);
        if (layer.width)
            actor.set_width(layer.width);
        if (layer.height)
            actor.set_height(layer.height);
        actor._visibleWhen = layer.visible || 'always';
        this.add_child(actor);
        return actor;
    }

    _build(layer) {
        switch (layer.type) {
        case 'image': {
            const path = Theme.asset(this._theme, layer.src);
            const bin = new St.Bin({
                style: `${backgroundStyle(path)} ${roundStyle(layer.round)}`,
            });
            if (typeof layer.opacity === 'number')
                bin.opacity = Math.round(layer.opacity * 255);
            this._place(bin, layer);
            break;
        }
        case 'artwork': {
            const bin = new St.Bin({
                style_class: 'platter-artwork',
                style: roundStyle(layer.round),
            });
            bin._round = layer.round;
            this._place(bin, layer);
            this._artwork.push(bin);
            break;
        }
        case 'text': {
            const label = new St.Label({
                style: `${fontStyle(layer.font)} color: ${cssColour(layer.color)};`,
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
            label._maxchars = layer.overflow?.maxchars ?? 0;
            this._texts.push(label);
            break;
        }
        case 'seekbar': {
            const group = new St.Widget({layout_manager: new Clutter.FixedLayout()});
            const back = new St.Bin({
                style: backgroundStyle(Theme.asset(this._theme, layer.back)),
                width: layer.width, height: layer.height,
            });
            const fill = new St.Bin({
                style: backgroundStyle(Theme.asset(this._theme, layer.fill)),
                height: layer.height,
            });
            // The fill asset must not squash as it grows, so it keeps the full
            // width and the group clips it - which is what "progress" looks like.
            fill.set_width(layer.width);
            const clip = new St.Widget({
                layout_manager: new Clutter.FixedLayout(),
                width: 0, height: layer.height, clip_to_allocation: true,
            });
            clip.add_child(fill);
            group.add_child(back);
            group.add_child(clip);
            this._place(group, layer);
            this._seekbars.push({clip, full: layer.width});
            break;
        }
        case 'button': {
            const states = layer.states || {};
            const button = new St.Button({
                style: backgroundStyle(Theme.asset(this._theme,
                    states.default?.normal)),
                reactive: true, can_focus: true, track_hover: true,
            });
            button._states = states;
            button._action = layer.action;
            button.connect('notify::hover', () => this._paintButton(button));
            button.connect('clicked', () => this.emit('action', layer.action));
            this._place(button, layer);
            this._buttons.push(button);
            break;
        }
        case 'rating': {
            const group = new St.BoxLayout({style_class: 'platter-rating'});
            group._layer = layer;
            this._place(group, layer);
            this._rating = group;
            break;
        }
        }
    }

    _paintButton(button) {
        const set = (button._action === 'play_pause' && this._playing && button._states.playing)
            ? button._states.playing : button._states.default;
        if (!set)
            return;
        const name = (button.hover && set.hover) ? set.hover : set.normal;
        button.set_style(backgroundStyle(Theme.asset(this._theme, name)));
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
            let value = track[label._bind] ?? '';
            if (label._maxchars && value.length > label._maxchars)
                value = `${value.slice(0, label._maxchars)}…`;
            label.set_text(value);
        }

        for (const bin of this._artwork) {
            const art = track.artUrl
                ? `background-image: url("${track.artUrl}"); background-size: cover;`
                : '';
            bin.set_style(`${art} ${roundStyle(bin._round)}`);
        }

        for (const {clip, full} of this._seekbars)
            clip.set_width(Math.round(full * (progress || 0)));

        for (const button of this._buttons)
            this._paintButton(button);
    }
});
