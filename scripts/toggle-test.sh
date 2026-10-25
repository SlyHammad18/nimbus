#!/usr/bin/env bash
# Toggle-hygiene smoke test for the Nimbus extension (task 02, AGENTS.md §5).
# Needs a live GNOME session (Wayland or X11). Exits 2 with a message when
# the extension or a running session is missing.

set -u

UUID="nimbus@SlyHammad18.github.com"

if ! command -v gnome-extensions >/dev/null 2>&1; then
    echo "gnome-extensions not found (no live GNOME session?)" >&2
    exit 2
fi

if ! gnome-extensions info "$UUID" >/dev/null 2>&1; then
    echo "extension '$UUID' not installed (run: unzip -o build/extension/nimbus.zip -d ~/.local/share/gnome-shell/extensions/$UUID)" >&2
    exit 2
fi

errors=0
for cycle in 1 2 3; do
    gnome-extensions enable "$UUID" || errors=$((errors + 1))
    sleep 1
    enabled_state="$(gnome-extensions info "$UUID" | awk '/State:/ {print $2}')"

    gnome-extensions disable "$UUID" || errors=$((errors + 1))
    sleep 1
    disabled_state="$(gnome-extensions info "$UUID" | awk '/State:/ {print $2}')"

    echo "cycle $cycle: enabled->$enabled_state  disabled->$disabled_state"
    [ "$enabled_state" = "ACTIVE" ] && [ "$disabled_state" = "INITIALIZED" ] || errors=$((errors + 1))
done

echo "--- last 40 journal lines mentioning nimbus / JS errors ---"
journalctl --since="-2 min" 2>/dev/null | grep -Ei 'nimbus|Js ERROR|gblocked' | tail -n 40

if [ "$errors" -gt 0 ]; then
    echo "FAIL: $errors problem(s) during toggling" >&2
    exit 1
fi

echo "OK: 3 enable/disable cycles clean"
