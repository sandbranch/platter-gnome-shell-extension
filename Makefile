# Platter - build, install, and run from a checkout.
#
# The extension itself lives in extension/, and that whole directory is what
# gets packed: `gnome-extensions pack` puts metadata.json at the root of the
# bundle, which is the one thing extensions.gnome.org requires. Everything
# outside extension/ - docs, translations, this file - stays out of it.

UUID     := platter@sandbranch.github.io
SOURCE   := extension
BUILD    := build
BUNDLE   := $(BUILD)/$(UUID).shell-extension.zip
INSTALLED := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SCHEMA   := schemas/org.gnome.shell.extensions.platter.gschema.xml

# Directories that gnome-extensions pack does not know about on its own.
# tools/ (the platter-port CLI and lib/cli.js it runs) stays out of the
# bundle: extensions.gnome.org's review only reaches files imported from
# extension.js or prefs.js, and a file nothing in the shipped extension can
# reach reads as unnecessary weight even though it is real, working code.
EXTRA    := --extra-source=lib --extra-source=themes

SOURCES  := $(shell find $(SOURCE) -type f -not -name '*.compiled')

.PHONY: all pack install uninstall enable disable prefs schemas pot mo lint check clean help

all: pack

help:
	@echo 'make pack       build $(BUNDLE)'
	@echo 'make install    build and install for this user'
	@echo 'make enable     enable the installed extension'
	@echo 'make prefs      open the preferences window'
	@echo 'make check      convert the bundled themes and verify they load'
	@echo 'make lint       run eslint, if it is installed'
	@echo 'make pot        regenerate po/platter.pot from the sources'
	@echo 'make clean      remove build output'

pack: $(BUNDLE)

# Packed from a staged copy rather than from extension/ directly, so that the
# full-size pictures stay in the repository - the author's own screenshot where
# there is one, a render from tools/preview.py where there is not - without
# riding along in the bundle. Only the 320px thumbnail ships. The widget never
# reads any of them, they are most of the weight, and extensions.gnome.org will
# not take a bundle over 5MB.
$(BUNDLE): $(SOURCES) | $(BUILD)
	rm -rf $(BUILD)/$(SOURCE)
	mkdir -p $(BUILD)
	cp -a $(SOURCE) $(BUILD)/$(SOURCE)
	find $(BUILD)/$(SOURCE)/themes \( -name 'screenshot.*' -o -name 'preview.png' \) -delete
	rm -rf $(BUILD)/$(SOURCE)/tools
	rm -f $(BUILD)/$(SOURCE)/lib/cli.js
	find $(BUILD)/$(SOURCE) -name 'gschemas.compiled' -delete
	gnome-extensions pack $(BUILD)/$(SOURCE) --schema=$(SCHEMA) $(EXTRA) \
		--podir=$(CURDIR)/po --gettext-domain=platter \
		--out-dir=$(BUILD) --force
	@echo
	@printf 'bundle: %s  (extensions.gnome.org allows 5M)\n' \
		"$$(du -h $(BUNDLE) | cut -f1)"

$(BUILD):
	mkdir -p $(BUILD)

install: pack
	gnome-extensions install $(BUNDLE) --force
	@echo
	@echo 'Installed to $(INSTALLED)'
	@echo 'GNOME Shell caches extension modules, so on Wayland log out and'
	@echo 'back in rather than disabling and re-enabling: a reload will keep'
	@echo 'running the code you just replaced.'

uninstall:
	gnome-extensions uninstall $(UUID) || true

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

prefs:
	gnome-extensions prefs $(UUID)

# Compiling the schema in place lets prefs.js and the widget run from the
# checkout without installing anything.
schemas:
	glib-compile-schemas $(SOURCE)/schemas

# Convert every bundled theme afresh and confirm the result still parses as the
# format the extension reads. Catches a porter change that quietly breaks the
# themes we ship.
check: schemas
	@$(SOURCE)/tools/platter-port --quiet --out $(BUILD)/check-themes \
		--replace $(SOURCE)/themes
	@$(SOURCE)/tools/platter-port --verify $(BUILD)/check-themes
	@$(SOURCE)/tools/platter-port --verify $(SOURCE)/themes

pot:
	mkdir -p po
	xgettext --from-code=UTF-8 --package-name=platter \
		--output=po/platter.pot \
		$(SOURCE)/*.js $(SOURCE)/lib/*.js
	@echo 'po/platter.pot regenerated'

mo:
	@for f in po/*.po; do \
		[ -e "$$f" ] || continue; \
		lang=$$(basename $$f .po); \
		mkdir -p $(SOURCE)/locale/$$lang/LC_MESSAGES; \
		msgfmt $$f -o $(SOURCE)/locale/$$lang/LC_MESSAGES/platter.mo; \
	done

lint:
	@command -v eslint >/dev/null 2>&1 \
		&& eslint $(SOURCE) \
		|| echo 'eslint is not installed; skipping'

clean:
	rm -rf $(BUILD)
	rm -f $(SOURCE)/schemas/gschemas.compiled
