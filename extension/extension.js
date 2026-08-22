/* Platter - the album art of whatever is playing, on your desktop. */

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {PlayerWatcher} from './lib/mpris.js';
import {PlatterWidget} from './lib/widget.js';
import * as Theme from './lib/theme.js';

export default class PlatterExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._watcher = new PlayerWatcher();
        this._watcher.connect('changed', () => this._update());

        this._settings.connectObject(
            'changed::theme', () => this._rebuild(),
            'changed::theme-path', () => this._rebuild(),
            'changed::placement', () => this._rebuild(),
            'changed::monitor', () => this._position(),
            'changed::position-x', () => this._position(),
            'changed::position-y', () => this._position(),
            'changed::anchor', () => this._position(),
            'changed::scale', () => this._applyScale(),
            'changed::opacity', () => this._applyOpacity(),
            'changed::preferred-player',
            () => this._watcher.setPreferred(this._settings.get_string('preferred-player')),
            this);

        Main.layoutManager.connectObject('monitors-changed', () => this._position(), this);

        // The overview transforms the workspaces in 3D, but chrome is never
        // transformed with them, so a floating widget hangs flat in front of
        // the animation and reads as a glitch. Main.overview is not a GObject
        // on every shell we support, so these are plain handler ids.
        this._overviewIds = ['showing', 'hidden'].map(
            signal => Main.overview.connect(signal, () => this._update()));

        this._watcher.setPreferred(this._settings.get_string('preferred-player'));
        this._rebuild();
    }

    disable() {
        this._settings?.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
        this._overviewIds?.forEach(id => Main.overview.disconnect(id));
        this._overviewIds = null;
        this._teardown();
        this._watcher?.destroy();
        this._watcher = null;
        this._settings = null;
    }

    _teardown() {
        if (!this._widget)
            return;
        const parent = this._widget.get_parent();
        if (parent === Main.layoutManager.uiGroup) {
            Main.layoutManager.removeChrome(this._widget);
        } else {
            Main.layoutManager.untrackChrome(this._widget);
            parent?.remove_child(this._widget);
        }
        this._widget.destroy();
        this._widget = null;
    }

    /** Load the configured theme and put a widget on screen. */
    _rebuild() {
        this._teardown();

        const paths = Theme.searchPaths(this.path, this._settings.get_string('theme-path'));
        const id = this._settings.get_string('theme');
        const dir = Theme.find(id, paths);
        if (!dir) {
            log(`Platter: theme "${id}" not found in ${paths.join(', ')}`);
            return;
        }
        const theme = Theme.load(dir);
        if (!theme)
            return;   // load() has already said why

        this._widget = new PlatterWidget(theme);
        this._widget.connect('action', (widget, action) => this._act(action));
        this._addDragging();

        // desktop sits behind windows, the way the original did; floating rides
        // above everything. Chrome is tracked so it survives overview and hot
        // corners without being treated as a window.
        if (this._settings.get_string('placement') === 'floating') {
            Main.layoutManager.addTopChrome(this._widget, {trackFullscreen: true});
        } else {
            Main.layoutManager._backgroundGroup.add_child(this._widget);
            // Tracked as chrome so the widget is treated as part of the shell
            // rather than as a window - it hides for fullscreen and survives the
            // overview. Shell 50 has no stage input region left to ask about:
            // affectsInputRegion was dropped from the tracking parameters, and
            // passing it throws out of here before the widget is ever positioned.
            Main.layoutManager.trackChrome(this._widget);
        }

        this._applyScale();
        this._applyOpacity();
        this._position();
        this._update();
    }

    _act(action) {
        const method = {
            play_pause: 'PlayPause', next: 'Next', previous: 'Previous',
        }[action];
        if (method)
            this._watcher.invoke(method);
        else if (action === 'quit')
            this._settings.set_boolean('hide-when-stopped', true);
        else
            log(`Platter: a button declared an action nothing handles: ${action}`);
    }

    _update() {
        if (!this._widget)
            return;
        const track = this._watcher.track;
        this._widget.update(track, this._watcher.progress);

        const noPlayer = this._watcher.players.length === 0;
        const stopped = track.status !== 'Playing';
        const hide = Main.overview.visibleTarget ||
            (noPlayer && !this._settings.get_boolean('show-when-no-player')) ||
            (stopped && this._settings.get_boolean('hide-when-stopped'));
        this._widget.visible = !hide;
    }

    _applyScale() {
        const scale = this._settings.get_double('scale');
        this._widget?.set_scale(scale, scale);
        this._position();   // scaling moves an anchored widget's far edge
    }

    _applyOpacity() {
        if (this._widget)
            this._widget.opacity = Math.round(this._settings.get_double('opacity') * 255);
    }

    _monitor() {
        const index = this._settings.get_int('monitor');
        return Main.layoutManager.monitors[index] ?? Main.layoutManager.primaryMonitor;
    }

    /* Offsets are measured from a corner rather than from the origin, so a
     * widget parked at the bottom right stays parked there when the resolution
     * changes or a monitor is unplugged - which is the whole reason a desktop
     * widget gets moved and never moved back. */
    _position() {
        if (!this._widget)
            return;
        const monitor = this._monitor();
        if (!monitor)
            return;

        const anchor = this._settings.get_string('anchor');
        const scale = this._settings.get_double('scale');
        const [width, height] = [this._widget.width * scale, this._widget.height * scale];
        const dx = this._settings.get_int('position-x');
        const dy = this._settings.get_int('position-y');

        const x = anchor.endsWith('right')
            ? monitor.x + monitor.width - width - dx : monitor.x + dx;
        const y = anchor.startsWith('bottom')
            ? monitor.y + monitor.height - height - dy : monitor.y + dy;
        this._widget.set_position(Math.round(x), Math.round(y));
    }

    /** Drag to move, unless locked. Where it lands is where it stays. */
    _addDragging() {
        const widget = this._widget;
        let grab = null, startX = 0, startY = 0, originX = 0, originY = 0;

        widget.connect('button-press-event', (actor, event) => {
            if (this._settings.get_boolean('locked'))
                return Clutter.EVENT_PROPAGATE;
            // A press that landed on a control belongs to that control. St.Button
            // holds an implicit grab between press and release, and taking a
            // stage grab here cancels it, so the button un-presses a millisecond
            // after it is pressed and never emits clicked - every button hovered
            // correctly and did nothing. Only bare canvas starts a drag. The
            // press has no usable source actor in Clutter 16, so ask the stage
            // what is under the pointer instead.
            const [pressX, pressY] = event.get_coords();
            if (global.stage.get_actor_at_pos(
                Clutter.PickMode.REACTIVE, pressX, pressY) !== widget)
                return Clutter.EVENT_PROPAGATE;
            [startX, startY] = event.get_coords();
            [originX, originY] = widget.get_position();
            grab = global.stage.grab(widget);
            return Clutter.EVENT_STOP;
        });

        widget.connect('motion-event', (actor, event) => {
            if (!grab)
                return Clutter.EVENT_PROPAGATE;
            const [x, y] = event.get_coords();
            widget.set_position(originX + (x - startX), originY + (y - startY));
            return Clutter.EVENT_STOP;
        });

        widget.connect('button-release-event', () => {
            if (!grab)
                return Clutter.EVENT_PROPAGATE;
            grab.dismiss();
            grab = null;
            const monitor = this._monitor();
            if (!monitor)
                return Clutter.EVENT_STOP;

            // Store where it landed as a distance from its anchor corner, so
            // dropping it near an edge keeps it near that edge for good.
            const anchor = this._settings.get_string('anchor');
            const scale = this._settings.get_double('scale');
            const [width, height] = [widget.width * scale, widget.height * scale];
            const [x, y] = widget.get_position();
            this._settings.set_int('position-x', Math.round(anchor.endsWith('right')
                ? monitor.x + monitor.width - width - x : x - monitor.x));
            this._settings.set_int('position-y', Math.round(anchor.startsWith('bottom')
                ? monitor.y + monitor.height - height - y : y - monitor.y));
            return Clutter.EVENT_STOP;
        });
    }
}
