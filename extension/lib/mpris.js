/* Talking to whatever is playing.
 *
 * The original CoverGloobus carried a plugin per player - Amarok, Banshee,
 * Rhythmbox, Audacious, a dozen more - and every one of them rotted. MPRIS2
 * replaced that whole zoo with one D-Bus interface every current Linux player
 * speaks, so this file is the entire player-support story.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.';
const OBJECT_PATH = '/org/mpris/MediaPlayer2';
const PLAYER_IFACE = 'org.mpris.MediaPlayer2.Player';
const APP_IFACE = 'org.mpris.MediaPlayer2';

/** One track's worth of fields, in the vocabulary the theme format binds to. */
export const EMPTY_TRACK = {
    title: '', artist: '', album: '', genre: '', track: '', year: '',
    length: '', position: '', player: '', artUrl: '', status: 'Stopped',
    lengthUs: 0, positionUs: 0, rating: 0,
};

function formatTime(microseconds) {
    if (!microseconds || microseconds < 0)
        return '';
    const total = Math.floor(microseconds / 1000000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** xesam:* is loosely honoured in the wild, so every read is defensive. */
function readMetadata(variant) {
    const out = {...EMPTY_TRACK};
    if (!variant)
        return out;
    const meta = variant.deepUnpack();
    const str = key => {
        const value = meta[key];
        if (!value)
            return '';
        const unpacked = value.deepUnpack();
        return Array.isArray(unpacked) ? (unpacked[0] ?? '') : String(unpacked ?? '');
    };

    out.title = str('xesam:title');
    out.artist = str('xesam:artist');
    out.album = str('xesam:album');
    out.genre = str('xesam:genre');
    out.artUrl = str('mpris:artUrl');

    const number = key => {
        const value = meta[key];
        if (!value)
            return 0;
        const unpacked = value.deepUnpack();
        return typeof unpacked === 'number' ? unpacked : Number(unpacked) || 0;
    };
    const trackNumber = number('xesam:trackNumber');
    out.track = trackNumber ? String(trackNumber) : '';
    out.lengthUs = number('mpris:length');
    out.length = formatTime(out.lengthUs);

    // Players disagree wildly here: a bare year, a full ISO date, or nothing.
    const date = str('xesam:contentCreated');
    const match = date.match(/(\d{4})/);
    out.year = match ? match[1] : '';

    // userRating is 0..1; the themes draw five stars.
    out.rating = Math.round((number('xesam:userRating') || 0) * 5);
    return out;
}

/** Tracks every MPRIS player on the bus and reports the interesting one. */
export const PlayerWatcher = GObject.registerClass({
    Signals: {'changed': {}},
}, class PlayerWatcher extends GObject.Object {
    constructor() {
        super();
        this._players = new Map();   // busName -> {proxy, appProxy, track}
        this._preferred = '';
        this._current = null;
        this._pollId = 0;

        this._bus = Gio.DBus.session;
        this._watchId = this._bus.signal_subscribe(
            'org.freedesktop.DBus', 'org.freedesktop.DBus', 'NameOwnerChanged',
            '/org/freedesktop/DBus', MPRIS_PREFIX, Gio.DBusSignalFlags.MATCH_ARG0_NAMESPACE,
            (conn, sender, path, iface, signal, params) => {
                const [name, oldOwner, newOwner] = params.deepUnpack();
                if (newOwner && !oldOwner)
                    this._addPlayer(name);
                else if (!newOwner)
                    this._removePlayer(name);
            });

        this._discover();
    }

    /** Which player the widget should show. Empty follows whatever is playing. */
    setPreferred(busSuffix) {
        this._preferred = busSuffix || '';
        this._pick();
    }

    /** The chosen entry, looked up live rather than a point-in-time copy -
     * a copy went stale the moment anything replaced entry.track without
     * going through _pick() again. */
    _entry() {
        return this._current ? this._players.get(this._current) : null;
    }

    get track() {
        return this._entry()?.track ?? {...EMPTY_TRACK};
    }

    get players() {
        return [...this._players.keys()].map(n => n.slice(MPRIS_PREFIX.length));
    }

    _discover() {
        this._bus.call('org.freedesktop.DBus', '/org/freedesktop/DBus',
            'org.freedesktop.DBus', 'ListNames', null, null,
            Gio.DBusCallFlags.NONE, -1, null, (bus, res) => {
                try {
                    const [names] = bus.call_finish(res).deepUnpack();
                    names.filter(n => n.startsWith(MPRIS_PREFIX)).forEach(n => this._addPlayer(n));
                } catch (e) {
                    logError(e, 'Platter: could not list D-Bus names');
                }
            });
    }

    _addPlayer(busName) {
        if (this._players.has(busName))
            return;
        const entry = {proxy: null, appProxy: null, track: {...EMPTY_TRACK}, seen: 0};
        this._players.set(busName, entry);

        Gio.DBusProxy.new(this._bus, Gio.DBusProxyFlags.NONE, null, busName,
            OBJECT_PATH, PLAYER_IFACE, null, (src, res) => {
                try {
                    entry.proxy = Gio.DBusProxy.new_finish(res);
                } catch (e) {
                    // Unlike _removePlayer, nothing else re-picks after this, so
                    // a proxy that never resolves used to leave _current
                    // pointing at an entry no longer in _players.
                    this._players.delete(busName);
                    this._pick();
                    return;
                }
                entry.proxy.connect('g-properties-changed', () => this._refresh(busName));
                this._refresh(busName);
            });

        Gio.DBusProxy.new(this._bus, Gio.DBusProxyFlags.NONE, null, busName,
            OBJECT_PATH, APP_IFACE, null, (src, res) => {
                try {
                    entry.appProxy = Gio.DBusProxy.new_finish(res);
                    this._refresh(busName);
                } catch (e) {
                    // Identity is a nicety; a player without it still works.
                }
            });
    }

    _removePlayer(busName) {
        this._players.delete(busName);
        if (this._current === busName)
            this._current = null;
        this._pick();
    }

    _refresh(busName) {
        const entry = this._players.get(busName);
        if (!entry?.proxy)
            return;
        const track = readMetadata(entry.proxy.get_cached_property('Metadata'));
        track.status = entry.proxy.get_cached_property('PlaybackStatus')?.deepUnpack() ?? 'Stopped';
        track.player = entry.appProxy?.get_cached_property('Identity')?.deepUnpack() ??
            busName.slice(MPRIS_PREFIX.length);
        entry.track = track;
        if (track.status === 'Playing')
            entry.seen = GLib.get_monotonic_time();
        this._pick();
    }

    /** Preferred player wins; otherwise whatever played most recently. */
    _pick() {
        let chosen = null;
        if (this._preferred) {
            // Bus suffixes are the player's own capitalisation (Plexamp, VLC),
            // and what gets stored is whatever the prefs list showed. Matching
            // those case-sensitively made the setting quietly inert.
            const want = this._preferred.toLowerCase();
            for (const busName of this._players.keys()) {
                if (busName.slice(MPRIS_PREFIX.length).toLowerCase().startsWith(want))
                    chosen = busName;
            }
        }

        // Without a preferred player, stay on whoever is already chosen
        // unless it disappeared or something else actually started playing -
        // otherwise a player that pauses (rank frozen at its last "seen") can
        // still lose the pick to some other idle player that merely ranks
        // higher, flickering the widget between two things nobody is playing.
        if (!chosen && this._current && this._players.has(this._current)) {
            const anyPlaying = [...this._players.values()].some(e => e.track.status === 'Playing');
            if (this._entry().track.status === 'Playing' || !anyPlaying)
                chosen = this._current;
        }

        if (!chosen) {
            let best = -1;
            for (const [busName, entry] of this._players) {
                const rank = entry.track.status === 'Playing'
                    ? entry.seen + 1e15 : entry.seen;
                if (rank > best) {
                    best = rank;
                    chosen = busName;
                }
            }
        }
        this._current = chosen;
        this._schedulePolling();
        this.emit('changed');
    }

    /** Position is not signalled, so it has to be asked for while playing. */
    _schedulePolling() {
        const playing = this._entry()?.track.status === 'Playing';
        if (playing && !this._pollId) {
            this._pollId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                this._readPosition();
                return GLib.SOURCE_CONTINUE;
            });
        } else if (!playing && this._pollId) {
            GLib.source_remove(this._pollId);
            this._pollId = 0;
        }
    }

    /* Position is the one MPRIS property declared never to signal a change, so
     * GDBusProxy's cache holds whatever it read when the proxy was built and
     * holds it forever. Reading the cache here meant the seekbar froze at
     * wherever the track happened to be when the widget appeared. It has to be
     * asked for over the wire, every tick, which is what the poll is for. */
    _readPosition() {
        const busName = this._current;
        const entry = this._entry();
        if (!entry?.proxy)
            return;
        this._bus.call(busName, OBJECT_PATH,
            'org.freedesktop.DBus.Properties', 'Get',
            new GLib.Variant('(ss)', [PLAYER_IFACE, 'Position']),
            new GLib.VariantType('(v)'), Gio.DBusCallFlags.NONE, 1000, null,
            (bus, res) => {
                let us = 0;
                try {
                    const [value] = bus.call_finish(res).deepUnpack();
                    us = Number(value.deepUnpack()) || 0;
                } catch (e) {
                    return;   // withdrawn mid-poll; the next tick will retry
                }
                // The current pick may have moved on while this call was in
                // flight - write the position onto whichever entry it was
                // actually asked of, not whatever is chosen now.
                const track = this._players.get(busName)?.track;
                if (!track)
                    return;
                track.positionUs = us;
                track.position = formatTime(us);
                this.emit('changed');
            });
    }

    /** Fraction played, for the seekbar. */
    get progress() {
        const t = this.track;
        return t.lengthUs > 0 ? Math.min(1, Math.max(0, t.positionUs / t.lengthUs)) : 0;
    }

    invoke(method) {
        const proxy = this._entry()?.proxy;
        if (!proxy) {
            log(`Platter: nothing to send ${method} to`);
            return;
        }
        proxy.call(method, null, Gio.DBusCallFlags.NONE, -1, null, (p, res) => {
            try {
                p.call_finish(res);
            } catch (e) {
                // A player refusing Next is still its own business, but saying
                // nothing at all hid every reason a button could look alive and
                // do nothing.
                logError(e, `Platter: ${method} was refused`);
            }
        });
    }

    destroy() {
        if (this._pollId) {
            GLib.source_remove(this._pollId);
            this._pollId = 0;
        }
        if (this._watchId) {
            this._bus.signal_unsubscribe(this._watchId);
            this._watchId = 0;
        }
        this._players.clear();
        this._current = null;
    }
});
