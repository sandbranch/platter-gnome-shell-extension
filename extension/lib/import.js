/* One entry point for "here is a theme, put it where Platter can see it".
 *
 * Both the preferences window and tools/platter-port come through here, so
 * there is one implementation of what importing means rather than two that
 * drift apart.
 */

import GLib from 'gi://GLib';

import * as Port from './port.js';
import * as Unpack from './unpack.js';

/**
 * Import every theme found at `path`, which may be a folder or an archive.
 *
 * A pack holding several themes installs all of them - authors published them
 * that way and splitting the pack up by hand is work the user should not have
 * to do. Returns {installed, failures, source}; neither list throws.
 */
export async function importFrom(path, {outBase = Port.userThemeDir(),
    replace = false, source = {}} = {}) {
    const installed = [];
    const failures = [];
    const temporary = [];
    const bases = [];

    try {
        if (!GLib.file_test(path, GLib.FileTest.EXISTS))
            throw new Error('there is nothing at that path');

        if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
            bases.push(path);
            // A folder may hold themes outright, archives of them, or both.
            const inside = await Unpack.unpackInside(path);
            if (inside) {
                temporary.push(inside);
                bases.push(inside);
            }
        } else {
            if (!Unpack.isArchive(path)) {
                throw new Error('that is a file, not a theme folder or an ' +
                    'archive Platter recognises');
            }
            const out = await Unpack.unpack(path);
            temporary.push(out);
            bases.push(out);
        }

        const roots = bases.flatMap(b => Port.findThemeRoots(b));
        const ported = bases.flatMap(b => Port.findPortedRoots(b))
            .filter(r => !roots.includes(r));
        if (!roots.length && !ported.length) {
            throw new Error('no skin.xml and no theme.json anywhere inside, ' +
                'so there is no theme here');
        }

        for (const root of roots) {
            await yieldToMainLoop();
            try {
                installed.push(Port.install(root, outBase, {source, replace}));
            } catch (e) {
                failures.push({at: shortName(root, bases), reason: e.message});
            }
        }
        // Themes somebody already converted are copied rather than ported, so
        // a shared folder of them imports as readily as an original download.
        for (const root of ported) {
            await yieldToMainLoop();
            try {
                installed.push(Port.copyPorted(root, outBase, {replace}));
            } catch (e) {
                failures.push({at: shortName(root, bases), reason: e.message});
            }
        }
    } catch (e) {
        failures.push({at: path.split('/').pop(), reason: e.message});
    } finally {
        temporary.forEach(Unpack.discard);
    }

    return {installed, failures, source: path};
}

/* Porting one theme is quick, but a pack can hold dozens. Let the window
 * that asked paint between them rather than freeze for the whole pack. */
function yieldToMainLoop() {
    return new Promise(resolve => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        resolve();
        return GLib.SOURCE_REMOVE;
    }));
}

function shortName(path, bases) {
    for (const base of bases) {
        if (path === base)
            return path.split('/').pop();
        if (path.startsWith(`${base}/`))
            return path.slice(base.length + 1);
    }
    return path.split('/').pop();
}

/** A one-line account of an import, for a status label or a terminal. */
export function summarise({installed, failures}) {
    const parts = [];
    if (installed.length === 1)
        parts.push(`Installed ${installed[0].theme.name}`);
    else if (installed.length)
        parts.push(`Installed ${installed.length} themes`);

    const lossy = installed.filter(r => !r.report.clean).length;
    if (lossy)
        parts.push(`${lossy} converted with losses - see port.json`);
    if (failures.length)
        parts.push(`${failures.length} could not be converted`);
    return parts.join('. ') || 'Nothing to import';
}
