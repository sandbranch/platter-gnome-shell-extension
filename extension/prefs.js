/* Platter preferences. */

import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import * as Theme from './lib/theme.js';
import * as Import from './lib/import.js';
import * as Port from './lib/port.js';
import * as Unpack from './lib/unpack.js';

export default class PlatterPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.add(this._themePage(window, settings));
        window.add(this._placementPage(settings));
    }

    _themePage(window, settings) {
        const page = new Adw.PreferencesPage({
            title: _('Theme'), icon_name: 'applications-graphics-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Theme'),
            description: _('Themes are read from the extension, from ' +
                '~/.local/share/platter/themes, and from an extra directory if ' +
                'you name one.'),
        });
        page.add(group);

        const row = new Adw.ComboRow({title: _('Theme')});
        group.add(row);

        // Twenty-six names in a dropdown tell you nothing about what you are
        // choosing. Every theme ships a small preview for exactly this.
        this._preview = new Gtk.Picture({
            content_fit: Gtk.ContentFit.CONTAIN,
            height_request: 190,
            can_shrink: true,
            margin_top: 12,
            margin_bottom: 6,
        });
        group.add(this._preview);

        this._fillThemes(row, settings);
        row.connect('notify::selected', () => {
            const chosen = this._themes[row.get_selected()];
            if (!chosen)
                return;
            if (chosen.id !== settings.get_string('theme'))
                settings.set_string('theme', chosen.id);
            this._showPreview(chosen);
        });

        const extra = new Adw.EntryRow({title: _('Extra theme directory')});
        extra.set_text(settings.get_string('theme-path'));
        extra.connect('changed', () => {
            settings.set_string('theme-path', extra.get_text());
            this._fillThemes(row, settings);
        });
        group.add(extra);

        page.add(this._importGroup(window, row, settings));

        const look = new Adw.PreferencesGroup({title: _('Appearance')});
        page.add(look);
        look.add(this._spin(settings, 'scale', _('Scale'), 0.25, 4, 0.05));
        look.add(this._spin(settings, 'opacity', _('Opacity'), 0.1, 1, 0.05));
        return page;
    }

    /* ---- importing ------------------------------------------------------ */

    _importGroup(window, themeRow, settings) {
        const group = new Adw.PreferencesGroup({
            title: _('Add a theme'),
            description: _('Platter converts themes made for CoverGloobus and ' +
                'NowPlaying. Point it at the folder or the archive exactly as ' +
                'you downloaded it.'),
        });

        const status = new Adw.ActionRow({title: _('Import a theme')});
        const folder = new Gtk.Button({
            label: _('Folder…'), valign: Gtk.Align.CENTER,
        });
        const archive = new Gtk.Button({
            label: _('Archive…'), valign: Gtk.Align.CENTER,
        });
        status.add_suffix(folder);
        status.add_suffix(archive);
        group.add(status);

        folder.connect('clicked', () => {
            const dialog = new Gtk.FileDialog({title: _('Choose a theme folder')});
            dialog.select_folder(window, null, (self, result) => {
                let chosen;
                try {
                    chosen = self.select_folder_finish(result);
                } catch (e) {
                    return;  // the user changed their mind, which is not an error
                }
                this._runImport(chosen.get_path(), status, themeRow, settings);
            });
        });

        archive.connect('clicked', () => {
            if (!Unpack.haveExtractor()) {
                status.set_subtitle(_('No archive tool is installed here. ' +
                    'Unpack the theme yourself and import the folder.'));
                return;
            }
            const filter = new Gtk.FileFilter({name: _('Theme archives')});
            for (const pattern of ['*.zip', '*.7z', '*.tar', '*.tar.gz', '*.tgz',
                '*.tar.bz2', '*.tar.xz', '*.rar'])
                filter.add_pattern(pattern);
            const filters = new Gio.ListStore({item_type: Gtk.FileFilter});
            filters.append(filter);

            const dialog = new Gtk.FileDialog({
                title: _('Choose a theme archive'), filters, default_filter: filter,
            });
            dialog.open(window, null, (self, result) => {
                let chosen;
                try {
                    chosen = self.open_finish(result);
                } catch (e) {
                    return;
                }
                this._runImport(chosen.get_path(), status, themeRow, settings);
            });
        });

        const where = new Adw.ActionRow({
            title: _('Converted themes are kept in'),
            subtitle: Port.userThemeDir(),
        });
        const open = new Gtk.Button({
            icon_name: 'folder-open-symbolic', valign: Gtk.Align.CENTER,
            tooltip_text: _('Open this folder'),
        });
        open.connect('clicked', () => {
            const path = Port.userThemeDir();
            GLib.mkdir_with_parents(path, 0o755);
            Gio.AppInfo.launch_default_for_uri(
                Gio.File.new_for_path(path).get_uri(), null);
        });
        where.add_suffix(open);
        group.add(where);
        return group;
    }

    _runImport(path, status, themeRow, settings) {
        if (!path)
            return;
        // Conversion is quick but not instant, and a window that does nothing
        // for a second looks broken. Say what is happening before starting.
        status.set_subtitle(_('Converting…'));
        const result = Import.importFrom(path);
        status.set_subtitle(Import.summarise(result));

        if (!result.installed.length)
            return;
        this._fillThemes(themeRow, settings);
        // Switch to what was just imported: it is what the user came here for,
        // and a theme they cannot see the effect of is a theme they will assume
        // failed to import.
        const last = result.installed[result.installed.length - 1];
        settings.set_string('theme', last.id);
        const index = this._themes.findIndex(t => t.id === last.id);
        if (index >= 0)
            themeRow.set_selected(index);
    }

    /* ---- the theme list ------------------------------------------------- */

    /** The shipped preview for a theme, or nothing if it has none. */
    _showPreview(theme) {
        if (!this._preview)
            return;
        // thumbnail.jpg is what the bundle carries; a checkout also still has
        // the author's full-size screenshot, which is better to look at when
        // it is there.
        for (const name of ['screenshot.png', 'screenshot.jpg', 'thumbnail.jpg',
            'preview.png']) {
            const path = GLib.build_filenamev([theme.path, name]);
            if (!GLib.file_test(path, GLib.FileTest.EXISTS))
                continue;
            this._preview.set_filename(path);
            this._preview.set_visible(true);
            return;
        }
        this._preview.set_visible(false);
    }

    _fillThemes(row, settings) {
        const paths = Theme.searchPaths(this.path, settings.get_string('theme-path'));
        this._themes = Theme.listThemes(paths);

        const model = new Gtk.StringList();
        for (const theme of this._themes)
            model.append(`${theme.name}  (${theme.id})`);
        row.set_model(model);
        row.set_subtitle(this._themes.length
            ? '' : _('No themes found'));

        const current = this._themes.findIndex(
            t => t.id === settings.get_string('theme'));
        if (current >= 0) {
            row.set_selected(current);
            this._showPreview(this._themes[current]);
        } else if (this._preview) {
            this._preview.set_visible(false);
        }
    }

    /* ---- placement ------------------------------------------------------ */

    _placementPage(settings) {
        const page = new Adw.PreferencesPage({
            title: _('Placement'), icon_name: 'video-display-symbolic',
        });

        const where = new Adw.PreferencesGroup({
            title: _('Where it sits'),
            description: _('On the desktop it lives behind your windows, the ' +
                'way CoverGloobus did. Floating keeps it above everything.'),
        });
        page.add(where);

        const placement = new Adw.ComboRow({
            title: _('Placement'),
            model: new Gtk.StringList({
                strings: [_('On the desktop'), _('Floating above windows')],
            }),
        });
        placement.set_selected(settings.get_string('placement') === 'floating' ? 1 : 0);
        placement.connect('notify::selected', () =>
            settings.set_string('placement',
                placement.get_selected() === 1 ? 'floating' : 'desktop'));
        where.add(placement);

        where.add(this._int(settings, 'monitor', _('Monitor'), -1, 8,
            _('minus one follows the primary monitor')));
        where.add(this._int(settings, 'position-x', _('Left offset'), 0, 10000, ''));
        where.add(this._int(settings, 'position-y', _('Top offset'), 0, 10000, ''));

        const locked = new Adw.SwitchRow({
            title: _('Lock in place'), subtitle: _('Stop the widget being dragged'),
        });
        settings.bind('locked', locked, 'active', Gio.SettingsBindFlags.DEFAULT);
        where.add(locked);

        const player = new Adw.PreferencesGroup({title: _('Player')});
        page.add(player);

        const preferred = new Adw.EntryRow({title: _('Preferred player')});
        preferred.set_text(settings.get_string('preferred-player'));
        preferred.connect('changed', () =>
            settings.set_string('preferred-player', preferred.get_text()));
        player.add(preferred);

        const hideStopped = new Adw.SwitchRow({
            title: _('Hide when nothing is playing'),
        });
        settings.bind('hide-when-stopped', hideStopped, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        player.add(hideStopped);

        const showNoPlayer = new Adw.SwitchRow({
            title: _('Stay visible with no player running'),
            subtitle: _('Useful while designing a theme'),
        });
        settings.bind('show-when-no-player', showNoPlayer, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        player.add(showNoPlayer);

        return page;
    }

    _spin(settings, key, title, lower, upper, step) {
        const row = new Adw.SpinRow({
            title,
            adjustment: new Gtk.Adjustment({lower, upper, step_increment: step}),
            digits: 2,
        });
        settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _int(settings, key, title, lower, upper, subtitle) {
        const row = new Adw.SpinRow({
            title, subtitle,
            adjustment: new Gtk.Adjustment({lower, upper, step_increment: 1}),
        });
        settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
}
