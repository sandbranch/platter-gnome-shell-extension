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
export function unpack(archive) {
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
            run(extractor.args(archive, out));
            descend(out);
            return out;
        } catch (e) {
            failures.push(`${extractor.binary}: ${e.message}`);
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

function descend(directory, depth = 0) {
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
                    run(extractor.args(child, into));
                    descend(into, depth + 1);
                    break;
                } catch (e) {
                    // try the next tool that claims to read this
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
export function unpackInside(directory) {
    const archives = listFiles(directory).filter(f =>
        isArchive(f) && extractorsFor(f).length);
    if (!archives.length)
        return null;

    const out = GLib.Dir.make_tmp('platter-import-XXXXXX');
    let unpacked = 0;
    archives.forEach((archive, n) => {
        const into = GLib.build_filenamev([out,
            `${String(n).padStart(3, '0')}-${archive.split('/').pop()}`]);
        GLib.mkdir_with_parents(into, 0o700);
        for (const extractor of extractorsFor(archive)) {
            try {
                run(extractor.args(archive, into));
                descend(into, 1);
                unpacked++;
                break;
            } catch (e) {
                // a corrupt archive should not stop the others
            }
        }
    });

    if (!unpacked) {
        discard(out);
        return null;
    }
    return out;
}

function run(argv) {
    const process = Gio.Subprocess.new(argv,
        Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_PIPE);
    const [, , stderr] = process.communicate_utf8(null, null);
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

function remove(file) {
    let enumerator;
    try {
        enumerator = file.enumerate_children('standard::name,standard::type',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    } catch (e) {
        file.delete(null);
        return;
    }
    let info;
    while ((info = enumerator.next_file(null)))
        remove(file.get_child(info.get_name()));
    file.delete(null);
}
