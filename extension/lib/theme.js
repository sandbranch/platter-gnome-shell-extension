/* Finding and reading a theme in the canonical format.
 *
 * Everything here assumes the theme is hostile. A malformed theme must produce
 * a widget that looks wrong, never an exception that reaches the Shell - a
 * crash here takes the user's whole session with it.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Rsvg from 'gi://Rsvg';

const cairo = imports.cairo;

export const FORMAT = 'platter-theme/0';

const RASTER_CACHE_ROOT = GLib.build_filenamev([GLib.get_user_cache_dir(), 'platter', 'raster']);

const LAYER_TYPES = new Set(['image', 'artwork', 'text', 'rating', 'button', 'seekbar']);

/** Where themes are looked for, nearest first. */
export function searchPaths(extensionPath, extraPath) {
    const paths = [];
    if (extraPath)
        paths.push(extraPath);
    paths.push(GLib.build_filenamev([GLib.get_user_data_dir(), 'platter', 'themes']));
    paths.push(GLib.build_filenamev([extensionPath, 'themes']));
    return paths;
}

export function listThemes(paths) {
    const found = new Map();  // id -> {id, name, path}
    for (const base of paths) {
        const dir = Gio.File.new_for_path(base);
        let enumerator;
        try {
            enumerator = dir.enumerate_children('standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE, null);
        } catch (e) {
            continue;  // a search path that does not exist is normal
        }
        let info;
        while ((info = enumerator.next_file(null))) {
            const id = info.get_name();
            if (found.has(id))
                continue;  // nearer path already won
            const path = GLib.build_filenamev([base, id]);
            const theme = load(path);
            if (theme)
                found.set(id, {id, name: theme.name || id, path});
        }
    }
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function find(id, paths) {
    for (const base of paths) {
        const path = GLib.build_filenamev([base, id]);
        if (GLib.file_test(GLib.build_filenamev([path, 'theme.json']), GLib.FileTest.EXISTS))
            return path;
    }
    return null;
}

/** Read a theme directory, or null with a logged reason. */
export function load(path) {
    const file = Gio.File.new_for_path(GLib.build_filenamev([path, 'theme.json']));
    let text;
    try {
        const [ok, bytes] = file.load_contents(null);
        if (!ok)
            return null;
        text = new TextDecoder().decode(bytes);
    } catch (e) {
        return null;
    }

    let theme;
    try {
        theme = JSON.parse(text);
    } catch (e) {
        log(`Platter: ${path}/theme.json is not valid JSON: ${e.message}`);
        return null;
    }

    if (theme.format !== FORMAT) {
        log(`Platter: ${path} declares format ${theme.format}, expected ${FORMAT}`);
        return null;
    }
    const width = theme.canvas?.width, height = theme.canvas?.height;
    if (!(width > 0 && height > 0)) {
        log(`Platter: ${path} has no usable canvas`);
        return null;
    }
    if (!Array.isArray(theme.layers)) {
        log(`Platter: ${path} has no layers`);
        return null;
    }

    // Drop layers we cannot draw rather than refusing the whole theme: a theme
    // missing one element is still worth looking at.
    theme.layers = theme.layers.filter(layer => {
        if (!LAYER_TYPES.has(layer?.type)) {
            log(`Platter: ${path} has an unknown layer type ${layer?.type}, skipped`);
            return false;
        }
        return Number.isFinite(layer.x) && Number.isFinite(layer.y);
    });
    theme.path = path;
    return theme;
}

/** Absolute path for an asset a layer names, or null if it is not there. */
export function asset(theme, name) {
    if (!name)
        return null;
    const path = GLib.build_filenamev([theme.path, name]);
    return GLib.file_test(path, GLib.FileTest.EXISTS) ? path : null;
}

/* scale is a Clutter actor transform by default: the widget is drawn at its
 * native size and the result stretched, so a scaled theme is a resampled
 * bitmap - twice, for raster assets, since background-size: contain already
 * resampled once. This renders each asset directly at the size it will
 * actually be shown at instead: SVGs go through Rsvg/cairo at the target
 * pixel size rather than being upscaled from a native-size raster, and PNGs
 * are resampled once instead of twice. Renders are cached on disk keyed by
 * theme path, asset name and scale, since a theme's assets do not change
 * between tracks. */
export function assetAtScale(theme, name, scale) {
    const path = asset(theme, name);
    if (!path || !scale || Math.abs(scale - 1) < 0.01)
        return path;

    const cacheDir = GLib.build_filenamev(
        [RASTER_CACHE_ROOT, GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, theme.path, -1).slice(0, 16)]);
    const cachePath = GLib.build_filenamev([cacheDir, `${name.replace(/[/\\]/g, '_')}@${scale}x.png`]);

    if (isFresh(cachePath, path))
        return cachePath;

    try {
        GLib.mkdir_with_parents(cacheDir, 0o755);
        if (path.toLowerCase().endsWith('.svg'))
            rasterizeSvg(path, cachePath, scale);
        else
            rasterizeRaster(path, cachePath, scale);
        return cachePath;
    } catch (e) {
        logError(e, `Platter: could not rasterize ${path} at ${scale}x`);
        return path;   // native size beats no image at all
    }
}

function isFresh(cachePath, sourcePath) {
    try {
        const mtime = f => Gio.File.new_for_path(f)
            .query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null)
            .get_modification_date_time();
        return mtime(cachePath).compare(mtime(sourcePath)) >= 0;
    } catch (e) {
        return false;   // no cache yet, or it was removed from under us
    }
}

function rasterizeSvg(path, outPath, scale) {
    const handle = Rsvg.Handle.new_from_file(path);
    const dim = handle.get_dimensions();
    const w = Math.max(1, Math.round(dim.width * scale));
    const h = Math.max(1, Math.round(dim.height * scale));
    const surface = new cairo.ImageSurface(cairo.Format.ARGB32, w, h);
    const cr = new cairo.Context(surface);
    cr.scale(w / dim.width, h / dim.height);
    handle.render_cairo(cr);
    surface.writeToPNG(outPath);
}

function rasterizeRaster(path, outPath, scale) {
    const [, width, height] = GdkPixbuf.Pixbuf.get_file_info(path);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    GdkPixbuf.Pixbuf.new_from_file_at_scale(path, w, h, false).savev(outPath, 'png', [], []);
}
