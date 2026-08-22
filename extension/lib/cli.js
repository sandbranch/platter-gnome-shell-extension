/* tools/platter-port, for people who would rather not click.
 *
 * The same conversion the preferences window runs, so there is nothing the
 * command line can do that the widget cannot and nothing that can rot apart
 * from it.
 */

import GLib from 'gi://GLib';

import * as Import from './import.js';
import * as Port from './port.js';
import * as Theme from './theme.js';

const USAGE = `platter-port - convert a CoverGloobus or NowPlaying theme for Platter

  platter-port THEME...              convert and install
  platter-port --out DIR THEME...    write somewhere else
  platter-port --list                what is installed
  platter-port --verify DIR          check that themes in DIR load

Each THEME is a folder holding skin.xml, or an archive containing one - the
file exactly as you downloaded it. A pack holding several themes installs all
of them.

  --out DIR      where to install (default ${Port.userThemeDir()})
  --replace      overwrite a theme of the same name instead of renaming
  --author NAME  record who made it, if the theme does not say
  --url URL      record where you got it
  --license X    record the terms it was published under
  --quiet        only say what went wrong
  --verify DIR   read every theme in DIR the way the widget does, and report
                 what it would refuse. Worth running on a theme you are making.
  --help

Converted themes are recorded as non-free: yours to use, not yours to pass on.
Say --license if you know better. Every conversion writes a port.json saying
what it repaired, measured, or could not carry across.`;

export function main(argv) {
    const options = {out: Port.userThemeDir(), replace: false, quiet: false};
    const source = {};
    const targets = [];

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const value = () => {
            const next = argv[++i];
            if (next === undefined)
                throw new Error(`${arg} needs a value`);
            return next;
        };
        switch (arg) {
        case '-h': case '--help': print(USAGE); return 0;
        case '--out': options.out = absolute(value()); break;
        case '--replace': options.replace = true; break;
        case '--quiet': case '-q': options.quiet = true; break;
        case '--author': source.author = value(); break;
        case '--url': source.source_url = value(); break;
        case '--license': source.license = value(); break;
        case '--list': return list(options.out);
        case '--verify': return verify(absolute(value()));
        default:
            if (arg.startsWith('-')) {
                printerr(`platter-port: unknown option ${arg}`);
                printerr('try --help');
                return 2;
            }
            targets.push(absolute(arg));
        }
    }

    if (!targets.length) {
        printerr(USAGE);
        return 2;
    }

    let failed = 0;
    for (const target of targets) {
        const result = Import.importFrom(target, {
            outBase: options.out, replace: options.replace, source,
        });
        for (const {id, path, report} of result.installed) {
            if (!options.quiet) {
                const flags = [
                    report.repairs.length && `${report.repairs.length} repaired`,
                    report.derived.length && `${report.derived.length} measured`,
                    report.lossy.length && `${report.lossy.length} lossy`,
                    report.inferred.length && `${report.inferred.length} inferred`,
                ].filter(Boolean);
                print(`ok    ${id.padEnd(28)} ${flags.join(', ') || 'clean'}`);
                print(`        ${path}`);
            }
        }
        for (const {at, reason} of result.failures) {
            printerr(`FAIL  ${at}`);
            printerr(`        ${reason}`);
            failed++;
        }
    }
    return failed ? 1 : 0;
}

/**
 * Load every theme in a directory exactly as the widget does.
 *
 * lib/theme.js treats a theme as hostile and drops what it cannot draw rather
 * than refusing the lot, so "loads" and "loads whole" are different questions.
 * This asks both, because a theme quietly missing three layers is the failure
 * a theme author most needs told about.
 */
function verify(base) {
    const themes = Theme.listThemes([base]);
    if (!themes.length) {
        printerr(`no themes load from ${base}`);
        return 1;
    }
    let short = 0;
    for (const {id, path} of themes) {
        const loaded = Theme.load(path);
        const declared = declaredLayers(path);
        const drawn = loaded.layers.length;
        if (declared !== null && drawn < declared) {
            print(`${id.padEnd(30)} ${drawn}/${declared} layers - ` +
                `${declared - drawn} dropped`);
            short++;
        } else {
            print(`${id.padEnd(30)} ${drawn} layers`);
        }
    }
    print(`\n${themes.length} themes load from ${base}` +
        (short ? `, ${short} with layers the widget will not draw` : ''));
    return short ? 1 : 0;
}

function declaredLayers(path) {
    try {
        const [, bytes] = GLib.file_get_contents(
            GLib.build_filenamev([path, 'theme.json']));
        const raw = JSON.parse(new TextDecoder().decode(bytes));
        return Array.isArray(raw.layers) ? raw.layers.length : null;
    } catch (e) {
        return null;
    }
}

function list(base) {
    const themes = [];
    let enumerator;
    try {
        const Gio = imports.gi.Gio;
        enumerator = Gio.File.new_for_path(base).enumerate_children(
            'standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = enumerator.next_file(null))) {
            const path = GLib.build_filenamev([base, info.get_name(), 'theme.json']);
            if (!GLib.file_test(path, GLib.FileTest.EXISTS))
                continue;
            const [, bytes] = GLib.file_get_contents(path);
            const theme = JSON.parse(new TextDecoder().decode(bytes));
            themes.push([info.get_name(), theme.name || '', theme.attribution?.author || '']);
        }
    } catch (e) {
        print(`no themes installed in ${base}`);
        return 0;
    }
    themes.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [id, name, author] of themes)
        print(`${id.padEnd(30)} ${name.padEnd(28)} ${author}`);
    print(`\n${themes.length} in ${base}`);
    return 0;
}

function absolute(path) {
    if (path.startsWith('/'))
        return path;
    if (path.startsWith('~/'))
        return GLib.build_filenamev([GLib.get_home_dir(), path.slice(2)]);
    return GLib.canonicalize_filename(path, null);
}
