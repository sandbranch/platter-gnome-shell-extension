# Platter

A GNOME Shell extension that puts the album art and track info of whatever is
playing back on your desktop.

Platter revives **CoverGloobus**, a Linux desktop now-playing widget from
2009–2012 by the Gloobus Developers. It sits on the desktop behind your windows
the way the original did, follows any MPRIS2 player, and draws itself from a
theme rather than a fixed design. Every maintained alternative today is a
top-bar controller with one look; the themeable desktop widget is the thing
that went missing.

The name is the turntable platter — the thing the record spins on.

## Installing

From extensions.gnome.org, or from a checkout:

```
make install
```

Then log out and back in. GNOME Shell caches extension modules for the life of
the session, so disabling and re-enabling will keep running the old code — this
catches everyone once.

Requires GNOME Shell 48, 49 or 50.

## Themes

Platter ships **43 restored themes**, each with a preview in the picker —
a list of names tells you nothing about what you are choosing. They are
credited in [Themes and credits](#themes-and-credits) below.

Hundreds more were made for CoverGloobus at its peak, scattered across
DeviantArt, gnome-look and file hosts that no longer exist. Sixty more are
catalogued below with a link to where each still lives. They are not
redistributed here — their authors either allowed less or never said anything —
but nothing stops **you** downloading one and converting it yourself.

**Preferences → Theme → Add a theme → Folder… or Archive…**

Point it at the theme exactly as you downloaded it. Platter reads CoverGloobus
and NowPlaying `skin.xml` themes, unpacks archives, handles packs containing
several themes at once, and installs the result to
`~/.local/share/platter/themes`. There is a command-line equivalent if you
prefer:

```
extension/tools/platter-port ~/Downloads/some-theme.zip
extension/tools/platter-port --list
extension/tools/platter-port --verify ~/.local/share/platter/themes
```

Both run the same converter. If you keep a collection of themes somewhere else
— a synced folder, an external disk — name it as the **extra theme directory**
in preferences and Platter will read them where they sit, without copying
anything.

### What conversion actually does

The converter follows what CoverGloobus 1.7's parser *did*, not what its theme
documentation claimed; the two disagree, and the parser is what themes were
tested against. It repairs the misspellings the corpus really contains, takes a
missing width or height from the asset's own pixel size the way 1.7 does, and
writes a `port.json` beside every theme saying what it repaired, what it
measured, what it had to infer, and what it could not carry across at all.

A conversion that loses something says so. If a theme looks wrong, `port.json`
is the first place to look.

Bundled fonts are never copied, whatever a theme's licence says — a font
shipping inside a theme is not evidence its author had the right to ship it.
`theme.json` names the families a theme wants so you can install them yourself;
[docs/fonts.md](docs/fonts.md) sets out the reasoning and lists where to get
each one that's actually free to install.

## Themes and credits

**103 themes by 33 people**, recovered from DeviantArt, gnome-look, the
original source tarballs and personal archives. **43 ship with Platter**, marked ✔
below. Every theme is credited with a link to where it still lives, shipped or not.

The ones that don't ship are held back on permission, not quality. A theme is
only redistributed here if its author allowed both redistribution *and*
modification, because converting a `skin.xml` is modification. Where somebody
said less, or never said anything, it stays out — silence is not permission.

That limits this repository, not you. Download an unmarked theme from its link
and convert it on your own machine and nothing has been redistributed by
anyone: **Preferences → Theme → Add a theme**.

These were made between roughly 2009 and 2012, mostly by people posting skins
for fun. Some of those pages have not had a visitor in years. Where a theme is
good — and many are very good — the link beside it is the only credit this
project can give its author.

### The people who made them

[73ll0](https://www.deviantart.com/www) (1) · [Aaron (awhite92)](https://www.deviantart.com/www) (1) · [aaron-a-arts](https://www.deviantart.com/www) (3) · [Alex Almeida (arcanamoon)](https://www.deviantart.com/www) (7) · [alezzacreative (MUSTAPHA ASBBAR)](https://www.deviantart.com/www) (5) · [Algalord-Gnome](https://www.deviantart.com/www) (1) · [artbhatta](https://www.deviantart.com/www) (1) · [arturoilhuitemoc (Ihuitemoc)](https://www.deviantart.com/www) (1) · cowanh00 (modification); NowPlaying screenlet by magicrobomonkey, extended by vrunner (1) · [d0od](https://www.deviantart.com/www) (1) · [d0od + Kshegyaj](https://www.deviantart.com/www) (4) · DJD (DJDP) (1) · [gabriela2400](https://www.deviantart.com/www) (7) · [jivebs](https://www.deviantart.com/www) (4) · Jordi Puigdellivol Hernandez (BadChoice) (3) · [larryni](https://www.deviantart.com/www) (3) · Laurent Baumann (1) · [leonardomdq](https://www.deviantart.com/www) (10) · [liliumcruentus](https://www.deviantart.com/www) (2) · [Nerten](https://www.deviantart.com/www) (1) · NowPlaying screenlet (magicrobomonkey, vrunner) (14) · [orsobasso](https://www.deviantart.com/www) (1) · Platter (1) · [rabra](https://www.deviantart.com/www) (1) · [rikarud0](https://www.deviantart.com/www) (1) · [scherezada](https://www.deviantart.com/www) (1) · [speedracker (uploader)](https://www.deviantart.com/www) (1) · [taylantatli](https://www.deviantart.com/www) (1) · [theconso](https://www.deviantart.com/www) (3) · Theconso (1) · [Twentyeight-Ten](https://www.deviantart.com/www) (2) · [xegi90](https://www.deviantart.com/www) (3) · Author unrecorded (15)

<details>
<summary><b>All 103 themes</b> — ✔ marks the 43 that ship with Platter</summary>

| | Theme | Author | For | Stated terms | Where it lives |
| --- | --- | --- | --- | --- | --- |
|  | Maverido 2 | 73ll0 | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/73ll0/art/Maverido-2-for-CoverGloobus-187186982) |
|  | Suave | Aaron (awhite92) | CoverGloobus | not stated | [link](https://www.deviantart.com/awhite92/art/Suave-189835073) |
|  | eDark | aaron-a-arts | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/aaron-a-arts/art/eDark-Covergloobus-187966117) |
|  | eDark | aaron-a-arts | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/aaron-a-arts/art/eDark-Covergloobus-187966117) |
|  | eDark | aaron-a-arts | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/aaron-a-arts/art/eDark-Covergloobus-187966117) |
|  | Black Sundays | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/art/Black-Sundays-for-CoverGlobus-194227432) |
|  | Teac extra small | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/gallery) |
|  | Teac mini | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/gallery) |
|  | Teac X-2000R black | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/gallery) |
|  | Teac X-2000R silver | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/gallery) |
|  | Titanium | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/art/Titanium-skin-for-Covergloobus-205578482) |
|  | Tungsten | Alex Almeida (arcanamoon) | CoverGloobus | not stated | [link](https://www.deviantart.com/arcanamoon/art/Tungsten-skin-for-Covergloobus-207356214) |
| ✔ | DRK | alezzacreative (MUSTAPHA ASBBAR) | CoverGloobus | attribution-required | [link](https://www.deviantart.com/alezzacreative/art/DRK-CoverGloobus-skin-311869412) |
| ✔ | Glassy | alezzacreative (MUSTAPHA ASBBAR) | CoverGloobus | attribution-required | [link](https://www.deviantart.com/alezzacreative/art/Glassy-CoverGloobus-skin-310790223) |
| ✔ | Holo | alezzacreative (MUSTAPHA ASBBAR) | CoverGloobus | attribution-required | [link](https://www.deviantart.com/alezzacreative/art/Holo-CoverGloobus-skin-313902523) |
| ✔ | ICS 1 | alezzacreative (MUSTAPHA ASBBAR) | CoverGloobus | attribution-required | [link](https://www.deviantart.com/alezzacreative/art/ANDROID-ICE-CREAM-SANDWICH-CoverGloobus-skin-319457843) |
| ✔ | ICS 2 | alezzacreative (MUSTAPHA ASBBAR) | CoverGloobus | attribution-required | [link](https://www.deviantart.com/alezzacreative/art/ANDROID-ICE-CREAM-SANDWICH-CoverGloobus-skin-319457843) |
|  | dirty-compact | Algalord-Gnome | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/algalord-gnome/art/Dirty-compact-for-covergloobus-161054544) |
|  | bhattaGloobus | artbhatta | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/artbhatta/art/bhattaGloobus-covergloobus-theme-405044212) |
| ✔ | Faenza Alternate | arturoilhuitemoc (Ihuitemoc) | CoverGloobus | CC BY-SA 3.0 | [link](https://www.deviantart.com/arturoilhuitemoc/art/Faenza-Alternate-CoverGloobus-197373411) |
| ✔ | simpleOne_v2 | cowanh00 (modification); NowPlaying screenlet by magicrobomonkey, extended by vrunner | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2015/http://www.gnome-look.org/CONTENT/content-files/77435-NowPlaying.tar.gz) |
|  | Faenzoobus pointoo | d0od | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/d0od/art/Faenza-CoverGloobus-Theme-2-176871146) |
| ✔ | Box Of Tricks by d0od | d0od + Kshegyaj | CoverGloobus | attribution-required | [link](https://launchpad.net/covergloobus) |
| ✔ | Box Of Tricks Mod By d0od | d0od + Kshegyaj | CoverGloobus | attribution-required | [link](https://launchpad.net/covergloobus) |
| ✔ | Box Of Tricks Mod By d0od | d0od + Kshegyaj | CoverGloobus | attribution-required | [link](https://web.archive.org/web/2015/http://www.gnome-look.org/CONTENT/content-files/113049-Box%20Of%20Tricks%20&%20Mod.tar.gz) |
| ✔ | Shiki CD Case 1.2 | d0od + Kshegyaj | CoverGloobus | attribution-required | [link](https://www.deviantart.com/vicing/art/Shiki-CD-Case-for-covergloobus-155864031) |
|  | iSticky | DJD (DJDP) | NowPlaying | no-derivatives, credit required | [link](https://launchpad.net/covergloobus) |
|  | Blue Star | gabriela2400 | CoverGloobus | not stated | — |
|  | Florence | gabriela2400 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/gabriela2400/art/Florence-for-covergloobus-166227140) |
|  | GAIA 10 Rdio | gabriela2400 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/gabriela2400/art/Gaia-Rdio-for-Covergloobus-183425403) |
| ✔ | Lunatic | gabriela2400 | CoverGloobus | attribution-required | [link](https://www.deviantart.com/gabriela2400/art/Lunatic-for-Covergloobus-158037835) |
|  | mardy bum | gabriela2400 | CoverGloobus | not stated | [link](https://www.deviantart.com/gabriela2400/art/Mardy-Bum-for-Covergloobus-156752105) |
|  | PaintOnTheWall | gabriela2400 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/gabriela2400/art/Kingdom-of-Rust-for-CGloobus-156453171) |
|  | WildHorses | gabriela2400 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/gabriela2400/art/Wild-Horses-for-Covergloobus-156650766) |
|  | ecg | jivebs | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/jivebs/art/covergloobus-theme-v-1-389883131) |
|  | ecg small | jivebs | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/jivebs/art/covergloobus-theme-v-1-389883131) |
|  | ecg small | jivebs | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/jivebs/art/covergloobus-theme-v-1-389883131) |
|  | ecg with slider | jivebs | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/jivebs/art/covergloobus-theme-v-1-389883131) |
| ✔ | BadChoice | Jordi Puigdellivol Hernandez (BadChoice) | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | BadChoice | Jordi Puigdellivol Hernandez (BadChoice) | CoverGloobus | GPL-3.0 | [link](https://github.com/deepin-espanol/covergloobus) |
| ✔ | BadChoice | Jordi Puigdellivol Hernandez (BadChoice) | CoverGloobus | GPL-3.0 | [link](https://github.com/deepin-espanol/covergloobus) |
|  | Big Button | larryni | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/larryni/art/Big-Button-for-CoverGloobus-186687880) |
|  | Big Button (plain) | larryni | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/larryni/art/Big-Button-for-CoverGloobus-186687880) |
|  | Monocle | larryni | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/larryni/art/Monocle-for-CoverGloobus-188309629) |
|  | Vinyl | Laurent Baumann | NowPlaying | CC BY-NC-SA 3.0 | [link](https://launchpad.net/covergloobus) |
|  | Bad Romance | leonardomdq | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/leonardomdq/art/Bad-Romance-for-Covergloobus-158164088) |
|  | Elegante | leonardomdq | NowPlaying | all rights reserved | [link](https://www.deviantart.com/leonardomdq/art/Elegante-Skin-for-Covergloobus-157735702) |
|  | Jet LP port by leonardomdq | leonardomdq | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/leonardomdq/art/Jet-LP-for-Covergloobus-162591457) |
|  | Lighting | leonardomdq | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/leonardomdq/art/Lighting-Skin-for-Covergloobus-157599685) |
|  | Long Play | leonardomdq | CoverGloobus | CC BY-NC 3.0 | [link](https://www.deviantart.com/leonardomdq/art/Long-Play-for-Covergloobus-161473582) |
|  | Maebow port by leonardomdq | leonardomdq | CoverGloobus | CC BY-NC-ND 3.0 | [link](https://www.deviantart.com/leonardomdq/art/Maebow-for-Covergloobus-162082420) |
|  | Micro | leonardomdq | CoverGloobus | not stated | [link](https://www.deviantart.com/leonardomdq/art/Micro-for-Covergloobus-161281834) |
|  | Plastico port by leonardomdq | leonardomdq | CoverGloobus | not stated | [link](https://www.deviantart.com/leonardomdq/art/Plastico-for-Covergloobus-161905982) |
|  | SnowCover Pro | leonardomdq | CoverGloobus | not stated | [link](https://www.deviantart.com/leonardomdq/art/SnowCover-Pro-for-Covergloobus-162264528) |
|  | twquet port by leonardomdq | leonardomdq | CoverGloobus | CC BY-NC-ND 3.0 | [link](https://www.deviantart.com/leonardomdq/art/Twquet-for-Covergloobus-162053013) |
|  | HeadCD | liliumcruentus | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/liliumcruentus/art/HeadCD-for-Covergloobus-172919353) |
|  | Optic | liliumcruentus | CoverGloobus | CC BY-NC-ND 3.0 | [link](https://www.deviantart.com/liliumcruentus/art/Optic-for-Covergloobus-172289315) |
|  | Old Vinyl | Nerten | CoverGloobus | not stated | [link](https://www.deviantart.com/nerten/art/Old-Vinyl-148222493) |
| ✔ | aeroplay | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | GSM DP | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | GSM DP | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2015/http://www.gnome-look.org/CONTENT/content-files/77435-NowPlaying.tar.gz) |
| ✔ | H-K-nowplaying | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | iPod DP | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | Lucid-dark | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | Lucid-light | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | NowPlaying Default | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | Orbital | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | Reflective Black | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | simpleOne-dark | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | simpleOne_v2 | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | simpleOne_v2 | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
| ✔ | Sweeth_Bleu | NowPlaying screenlet (magicrobomonkey, vrunner) | NowPlaying | GPL-2.0-or-later | [link](https://web.archive.org/web/2011/http://www.gnome-look.org/CONTENT/content-files/69988-NowPlaying.tar.bz2) |
|  | covergloobus | orsobasso | CoverGloobus | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/orsobasso/art/Elementary-Covergloobus-1-0-not-supported-177128308) |
| ✔ | Anno | Platter | Platter | CC0-1.0 | — |
|  | BowtieGloobus Classic | rabra | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/rabra/art/BowtieGloobus-Classic-162570370) |
|  | Light | rikarud0 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/rikarud0/art/RadiantLight-Covergloobus-158629423) |
|  | Run Transparent | scherezada | CoverGloobus | not stated | [link](https://www.deviantart.com/scherezada/art/Run-Transparent-158104440) |
| ✔ | Jesse | speedracker (uploader) | CoverGloobus | attribution-required | [link](https://www.deviantart.com/speedracker/art/Rustycage-New-Covergloobus-Theme-525980027) |
|  | Path | taylantatli | rainmeter | CC BY-NC-SA 3.0 | [link](https://www.deviantart.com/taylantatli/art/Path-Covergloobus-Theme-Rainmeter-Port-472383561) |
|  | Clips porting for Covergloobus by Theconso | theconso | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/theconso/art/Clips-for-Covergloobus-187899434) |
|  | last.fm porting for Covergloobus by Theconso | theconso | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/theconso/art/Last-fm2-for-Covegloobus-184787605) |
|  | Round for Coovergloobus by Theconso [theconso.deviantart.com]  | theconso | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/theconso/art/Round-for-Covergloobus-187042320) |
|  | GrooveUp porting for Covergloobus by Theconso | Theconso | CoverGloobus | all rights reserved (author forbids reuse of the artwork without asking) | — |
|  | bitmap | Twentyeight-Ten | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/twentyeight-ten/art/Bitmap-for-Covergloobus-163135772) |
|  | NEON | Twentyeight-Ten | CoverGloobus | not stated | [link](https://www.deviantart.com/twentyeight-ten/art/NEON-for-Covergloobus-159703837) |
|  | Bent Edge | xegi90 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/xegi90/art/Bent-Edge-for-CoverGloobus-179655537) |
|  | Bent Edge Tape | xegi90 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/xegi90/art/Bent-Edge-for-CoverGloobus-179655537) |
|  | Slick | xegi90 | CoverGloobus | all rights reserved | [link](https://www.deviantart.com/xegi90/art/SLICK-for-CoverGloobus-178428865) |
| ✔ | 45 Controls | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | Corner | *unrecorded* | NowPlaying | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | Coversutra | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | dirty | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | intrepid-ibex-mockup by d0od | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | Lucid-dark | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
|  | Panel | *unrecorded* | CoverGloobus | Pling licensetype-1 (unconfirmed) | [link](https://www.gnome-look.org/p/1111078/) |
| ✔ | Photo | *unrecorded* | CoverGloobus | attribution-required | [link](https://www.xfce-look.org/p/1110988/) |
| ✔ | polaroid | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | Postcard | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | Postcard | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
| ✔ | simple | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://launchpad.net/covergloobus) |
|  | simple | *unrecorded* | CoverGloobus | Pling licensetype-1 (unconfirmed) | [link](https://www.gnome-look.org/p/1110965/) |
|  | Sphere | *unrecorded* | CoverGloobus | Pling licensetype-1 (unconfirmed) | [link](https://www.gnome-look.org/p/1111161/) |
| ✔ | T-tip | *unrecorded* | CoverGloobus | GPL-3.0 | [link](https://github.com/deepin-espanol/covergloobus) |

</details>

### Where the permissions came from

Most shipped themes came from the CoverGloobus and NowPlaying source packages,
released as GPL works — CoverGloobus ships a GPL-3.0 `COPYING` and builds each
theme as its own `Makefile.am` target, and NowPlaying's screenlet carries a full
GPL-2-or-later header. Neither states separate terms for the themes it bundles.

Every `skin.xml` was then read for terms its author wrote into the file itself,
which is where most of the remaining grants turned out to live — several of them
stated nowhere else on the web.

Two themes inside those GPL packages are deliberately **not** shipped, because
their authors stated their own terms in their own files and bundling does not
override a third party: DJD's **iSticky** ("do not modify or redistribute
without written permission") and Laurent Baumann's **Vinyl** (CC BY-NC-SA).

Bundled fonts are stripped from every theme whatever its licence says — a font
shipping inside a theme is not evidence its author had the right to ship it.
See [docs/fonts.md](docs/fonts.md).

### If one of these is yours

- **Say it can be shipped** and it moves into the release, credited to you.
- **Say it should not be here at all** and it goes, no argument, no delay.

The same applies if the credit is wrong. Much of this was pieced together from
`skin.xml` headers and readmes written fifteen years ago, and some is certainly
mistaken.

## Making a theme

A theme is a folder with a `theme.json` and some images in it. There is no
build step and no packaging — drop it in `~/.local/share/platter/themes/` and
it shows up.

**[docs/making-themes.md](docs/making-themes.md)** is the guide: a worked
example, every layer type, how to test as you go, and an honest list of what
the format describes but the renderer does not paint yet.

For the reasoning behind the format rather than how to use it, see
[docs/theme-format-v0.md](docs/theme-format-v0.md), with an enforceable schema
in [docs/platter-theme-v0.schema.json](docs/platter-theme-v0.schema.json). It is
grounded in 93 distinct real themes and in CoverGloobus 1.7's own parser rather
than designed top-down.

`platter-anno` is a theme written directly in the format rather than converted,
so it is a reasonable thing to copy and edit.

## Building from a checkout

```
make            build the bundle
make install    build and install for this user
make check      convert the bundled themes and confirm they still load
make prefs      open the preferences window
make lint       run eslint, if installed
make help       everything else
```

`tools/make-thumbnails` regenerates the previews in the theme picker after
adding a theme. They are committed rather than built at pack time, so everyone
sees the same ones.

Themes keep their author's full-size screenshot in the repository, but the
bundle carries only the 320px preview: extensions.gnome.org will not accept a
bundle over 5MB, and the full-size images were more than half of it. `make
pack` stages that copy for you.

The extension itself is `extension/`, and that whole directory is what gets
packed — `metadata.json` ends up at the root of the bundle, which is all
extensions.gnome.org requires. Everything outside it is repository furniture.

## Licence

The code is **GPL-2.0-or-later** — see [LICENSE](LICENSE) — which is the licence
GNOME Shell itself uses and the one CoverGloobus was published under.

The themes are not. Each is its author's work under its author's terms; see
[Themes and credits](#themes-and-credits). If you are an author there and want
your theme removed, open an issue and it will be done.
