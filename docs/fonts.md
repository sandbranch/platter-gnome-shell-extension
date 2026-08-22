# Fonts

22 themes in the corpus bundle a font file. None of them travel with the ported
bundle, and this is why — recorded once, with evidence, so it does not have to
be argued again per theme.

## The rule

The porter declares every font family a theme names, in `fonts[]`, with
`bundled: false` and a reason. It never copies the file. `port.json` names what
was left behind.

A font shipping inside a theme is not evidence its author had the right to ship
it. It is usually evidence of the opposite: the corpus contains Calibri, Segoe
UI, Lucida Grande and Helvetica — Microsoft's and Apple's, bundled by hobbyist
skin authors in 2011 who were not thinking about it.

## The case that proves it

arcanamoon's Titanium and Tungsten bundle **Rexlia** by Ray Larabie (Typodermic
Fonts), and Titanium's readme instructs the user to copy it into
`/usr/share/fonts`. Rexlia is free to download, which sounds like it settles the
question. It does the opposite. Typodermic's free desktop licence, shipped in
the download as *Typodermic Desktop EULA 2026.pdf* with a plain-language guide,
says:

> Do not give, sell, upload, sublicense, or otherwise share the font software.

> **Do not include the font in open-source or publicly available software where
> the font could be redistributed.**

> One person, one license. The included license is for one natural person... Do
> not place the working font on a shared server, shared network folder,
> cloud-font library, or digital asset system.

The second clause is exactly this repository, the moment it is public. So a
"free font" is free to *download and install*, and specifically not free to
*ship inside a theme*. The distinction is the whole point, and it is the reason
the rule is blanket rather than case-by-case: the licence that matters is never
the one in the filename. The file in those two themes is even called
`rexlia free.ttf`.

Note also what this makes of the readme. Telling users to install the bundled
font is the theme author redistributing it, not a licence for anyone to.

## What the user does instead

Install the fonts. That is the licensed use — "install and use the font on
computers under that person's control" — and it is how a theme is meant to look.
Drop the file in `~/.local/share/fonts` and run `fc-cache -f`.

Every theme names its fonts in `theme.json` under `fonts[]`, so what to go and
find is always written down:

    python3 -c "import json,glob,collections; \
      c=collections.Counter(f['family'] for p in glob.glob('themes/*/theme.json') \
      for f in json.load(open(p)).get('fonts',[])); \
      [print(f'{n:3}  {k}') for k,n in c.most_common()]"

## For the harness

`tools/nested-shell.sh` gives the throwaway shell a scratch `XDG_DATA_HOME`,
and fontconfig reads `$XDG_DATA_HOME/fonts` — so without help the harness hides
every font the user has installed and renders fallback type while looking
perfectly convincing. It links the real font directory in. If a screenshot from
it ever shows the wrong typeface, check that link before blaming the theme.
