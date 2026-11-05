# Platter

<p align="center"><img src="docs/assets/screenshots/desktop.png" width="720" alt="Platter on the desktop, showing the album art, title, artist, album and rating of the song playing in Plexamp"></p>

**A GNOME Shell extension that puts the album art of whatever you're playing
right there on your desktop, like an old-school desklet, not a floating app
window.**

Ten-odd years ago there was a little Linux app called **CoverGloobus**, and it
was wonderful: your desktop wallpaper, quietly decorated with whatever song
was playing, dressed up in one of hundreds of skins people made just because
they felt like it. Then it vanished. Platter brings it back for GNOME Shell:
same idea, same spirit, a whole shelf of those old skins restored and ready to
wear.

Worth saying plainly: this is **GNOME Shell only**. No KDE, no Xfce, no
standalone version: it lives inside GNOME the way the original lived inside
whatever desktop you had in 2010.

**[→ Come look at the themes](https://sandbranch.github.io/platter-gnome-shell-extension/#themes)**

## Get it

Platter has been submitted to
[extensions.gnome.org](https://extensions.gnome.org/extension/10763/platter/)
and is waiting for review. Once it's approved, installing will be one click
there. Until then, it takes a couple of minutes by hand.

### The easy way: the release zip

1. Download the `.shell-extension.zip` file from the [latest
   release](https://github.com/sandbranch/platter-gnome-shell-extension/releases/latest).
   Leave it zipped.
2. Open a terminal in the folder you saved it to (usually **Downloads**:
   right-click inside it in Files and pick **Open in Terminal**), and run:

   ```
   gnome-extensions install --force platter-*.shell-extension.zip
   ```

3. **Log out and back in.** GNOME Shell only notices new extensions in a
   fresh session, and everyone forgets this exactly one time.
4. Turn Platter on, either in the **Extensions** app or with:

   ```
   gnome-extensions enable platter@sandbranch.github.io
   ```

5. Pick a theme in Platter's preferences (the gear next to it in
   **Extensions**, or `gnome-extensions prefs platter@sandbranch.github.io`)
   and start some music.

Updating to a newer release is the same steps 1 to 3; your settings and
imported themes stay where they are.

### From source

If you'd rather build it yourself, or want what's on `main` before it's
released, you need `git` and `make` (on Ubuntu or Debian:
`sudo apt install git make`). Then:

```
git clone https://github.com/sandbranch/platter-gnome-shell-extension.git
cd platter-gnome-shell-extension
make install
```

and carry on from step 3 above. To update later, `git pull` and
`make install` again, then log out and back in.

Needs GNOME Shell 48, 49, or 50.

## Pick a look

Open **Preferences**, pick a theme, and it's on your desktop. That's the whole
interaction: no config files, no restart.

Got an old CoverGloobus or NowPlaying skin sitting around from way back? Feed
it to Platter and it just works: **Preferences → Theme → Add a theme**, point
it at the file, done. Whatever it looked like then is what it looks like now.

<p align="center">
<img src="extension/themes/cross-the-line/screenshot.png" width="260" alt="Cross The Line theme">
&nbsp;
<img src="extension/themes/coversutra/screenshot.png" width="260" alt="Coversutra theme">
&nbsp;
<img src="extension/themes/jesse/screenshot.png" width="260" alt="Jesse theme">
</p>

Platter ships with **82 themes**, and the [full gallery is on the
website](https://sandbranch.github.io/platter-gnome-shell-extension/#themes).
Go look before you go hunting for more, there's a good chance your favourite
one from a decade ago is already sitting in there. Everything else this
project has tracked down (181 more skins, most of them still alive on the
DeviantArt pages people posted them to years ago) is credited in
[docs/credits.md](docs/credits.md), along with the honest explanation of why
not every last one of them made it into the box.

## Make your own

A theme is nothing more than a folder: a `theme.json` describing where things
go, and a handful of pictures. No build tools, no compiling, nothing to
install: drop the folder in `~/.local/share/platter/themes/` and it shows up.

[docs/making-themes.md](docs/making-themes.md) walks through building one from
nothing, with a worked example. `gloobus-plain-simple` and `platter-anno` are
both real shipped themes built entirely by hand, so either is a fine one to
copy and start messing with.

## Licence

The extension itself is **GPL-2.0-or-later**. See [LICENSE](LICENSE).

The themes are each their own author's work, under whatever terms that person
actually set. The full, honest accounting is in
[docs/credits.md](docs/credits.md). If one of them is yours and you'd rather
it weren't here, open an issue and it's gone that day.
