/* Getting a theme out of whatever its author uploaded.
 *
 * Themes arrive as zip, 7z, tarball, and occasionally a .tar.tar - sometimes
 * nested, sometimes several themes to one file. GJS cannot read any of those:
 * there is no Archive typelib to depend on and Gio has no archive support.
 *
 * So this asks the system, which always has an extractor. Nothing is bundled
 * and nothing is downloaded; an ordinary command-line tool that is already
 * installed is run on a file the user chose, into a temporary directory.
 * When no extractor is present at all, the caller is told to unpack it by
 * hand - the widget can still import a plain folder, which is what a
 * double-click on the archive produces anyway.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async', 'communicate_utf8_finish');

/* bsdtar first: one binary reads zip, 7z, tar and everything else here, and it
 * is what GNOME's own archive handling is built on. */
const EXTRACTORS = [
    {binary: 'bsdtar', args: (archive, out) => ['bsdtar', '-x', '-f', archive, '-C', out]},
    {binary: 'unzip', args: (archive, out) => ['unzip', '-q', '-o', archive, '-d', out],
        suffixes: ['.zip']},
    {binary: '7z', args: (archive, out) => ['7z', 'x', '-y', `-o${out}`, archive]},
    {binary: '7za', args: (archive, out) => ['7za', 'x', '-y', `-o${out}`, archive]},
    {binary: 'tar', args: (archive, out) => ['tar', '-x', '-f', archive, '-C', out],
        suffixes: ['.tar', '.tar.gz', '.tgz', '.tar.bz2', '.tar.xz']},
];

const ARCHIVE_SUFFIXES = ['.zip', '.7z', '.tar', '.tgz', '.tar.gz', '.tar.bz2',
    '.tar.xz', '.rar'];

export function isArchive(path) {
    const name = path.toLowerCase();
    return ARCHIVE_SUFFIXES.some(s => name.endsWith(s));
}

/** Whether anything on this machine can unpack archives at all. */
export function haveExtractor() {
    return EXTRACTORS.some(e => GLib.find_program_in_path(e.binary));
}

function extractorsFor(path) {
    const name = path.toLowerCase();
    return EXTRACTORS.filter(e =>
        GLib.find_program_in_path(e.binary) &&
        (!e.suffixes || e.suffixes.some(s => name.endsWith(s))));
}

/**
 * Unpack `archive` into a new temporary directory and return its path.
 *
 * The caller owns the directory and should hand it to `discard` when done.
 * Throws with a readable reason if nothing here can open the file.
 */
export async function unpack(archive) {
    const candidates = extractorsFor(archive);
    if (!candidates.length) {
        throw new Error(haveExtractor()
            ? `nothing installed here can unpack ${archive.split('/').pop()}`
            : 'no archive tool is installed, so unpack it yourself first and ' +
              'import the folder');
    }

    const out = GLib.Dir.make_tmp('platter-import-XXXXXX');
    const failures = [];
    for (const extractor of candidates) {
        try {
            await run(extractor.args(archive, out));
            await descend(out);
            return out;
        } catch (e) {
            failures.push(`${extractor.binary}: ${e.message}`);
            // What a failed tool got out before giving up must not be
            // mistaken for the next tool's work.
            empty(out);
        }
    }
    discard(out);
    throw new Error(failures.join('; '));
}

/* An archive inside an archive is normal here rather than exotic: Box Of
 * Tricks is a tarball of two tarballs, and authors routinely published a pack
 * as one download. Unpack those in place, so what the caller sees is a plain
 * tree of files however deeply it was wrapped. */
const MAX_DEPTH = 3;

async function descend(directory, depth = 0) {
    if (depth >= MAX_DEPTH)
        return;
    for (const child of listFiles(directory)) {
        if (!isArchive(child) || !extractorsFor(child).length)
            continue;
        const into = `${child}.unpacked`;
        try {
            GLib.mkdir_with_parents(into, 0o700);
            for (const extractor of extractorsFor(child)) {
                try {
                    await run(extractor.args(child, into));
                    await descend(into, depth + 1);
                    break;
                } catch (e) {
                    // try the next tool that claims to read this
                    empty(into);
                }
            }
        } catch (e) {
            // a nested archive we cannot open is not fatal: the outer one may
            // still hold the theme, and the caller will say so if it does not
        }
    }
}

function listFiles(directory, prefix = '', out = []) {
    let enumerator;
    try {
        enumerator = Gio.File.new_for_path(
            prefix ? GLib.build_filenamev([directory, prefix]) : directory)
            .enumerate_children('standard::name,standard::type',
                Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    } catch (e) {
        return out;
    }
    let info;
    while ((info = enumerator.next_file(null))) {
        const relative = prefix ? `${prefix}/${info.get_name()}` : info.get_name();
        if (info.get_file_type() === Gio.FileType.DIRECTORY)
            listFiles(directory, relative, out);
        else
            out.push(GLib.build_filenamev([directory, relative]));
    }
    return out;
}

/**
 * Unpack every archive sitting inside `directory` into one temporary tree.
 *
 * Pointing Platter at a folder should do what the user means, and a folder
 * with theme archives in it is what a download directory actually looks like.
 * Returns the temporary path, or null when there was nothing to unpack.
 */
export async function unpackInside(directory) {
    const archives = listFiles(directory).filter(f =>
        isArchive(f) && extractorsFor(f).length);
    if (!archives.length)
        return null;

    const out = GLib.Dir.make_tmp('platter-import-XXXXXX');
    let unpacked = 0;
    for (const [n, archive] of archives.entries()) {
        const into = GLib.build_filenamev([out,
            `${String(n).padStart(3, '0')}-${archive.split('/').pop()}`]);
        GLib.mkdir_with_parents(into, 0o700);
        for (const extractor of extractorsFor(archive)) {
            try {
                await run(extractor.args(archive, into));
                await descend(into, 1);
                unpacked++;
                break;
            } catch (e) {
                // a corrupt archive should not stop the others
                empty(into);
            }
        }
    }

    if (!unpacked) {
        discard(out);
        return null;
    }
    return out;
}

/* Asynchronous, so the preferences window keeps painting (and shows that it
 * is converting) while a big pack unpacks, rather than freezing until it is
 * done. */
async function run(argv) {
    const process = Gio.Subprocess.new(argv,
        Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_PIPE);
    const [, , stderr] = await process.communicate_utf8_async(null, null);
    if (!process.get_successful()) {
        const said = (stderr || '').trim().split('\n')[0];
        throw new Error(said || `exited ${process.get_exit_status()}`);
    }
}

/** Remove a directory this module made. Failure here is never worth raising. */
export function discard(path) {
    if (!path || !path.includes('platter-import-'))
        return;
    try {
        remove(Gio.File.new_for_path(path));
    } catch (e) {
        // a temporary directory left behind is the operating system's problem
    }
}

/* Best effort, entry by entry: one entry that will not go must not leave the
 * rest behind. tar keeps an archive's folder modes, so a folder packed
 * read-only (0555) has to be made writable before what is in it can go. */
function remove(file) {
    empty(file);
    deleteQuietly(file);
}

/** Remove what is inside a directory this module made, keeping the directory. */
function empty(dir) {
    let enumerator;
    try {
        enumerator = dir.enumerate_children('standard::name,standard::type',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    } catch (e) {
        return;   // not a directory, or already gone
    }
    try {
        dir.set_attribute_uint32('unix::mode', 0o700,
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    } catch (e) {
        // the deletes below will say whether it mattered
    }
    let info;
    while ((info = enumerator.next_file(null))) {
        const child = dir.get_child(info.get_name());
        if (info.get_file_type() === Gio.FileType.DIRECTORY)
            remove(child);
        else
            deleteQuietly(child);
    }
}

function deleteQuietly(file) {
    try {
        file.delete(null);
    } catch (e) {
        // keep going; the rest can still be removed
    }
}
