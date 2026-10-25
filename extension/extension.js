// Nimbus / nimbus — GNOME Shell extension entry point.
//
// GNOME 45+ ESM lifecycle. Toggle hygiene is the contract here (AGENTS.md):
// enable may run many times in a session, disable must fully restore state.

import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {NimbusIndicator} from './src/indicator.js';

export default class NimbusExtension extends Extension {
    enable() {
        this._loadStylesheet();

        if (!this._indicator) {
            this._indicator = new NimbusIndicator();
        }
        Main.panel.addToStatusArea('nimbus', this._indicator, 0, 'right');
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;

        this._unloadStylesheet();
    }

    _loadStylesheet() {
        if (this._stylesheet)
            return;

        this._stylesheet = this.dir.get_child('data/stylesheet.css');

        const theme = St.ThemeContext.get_for_stage(global.stage);
        theme.get_theme().load_stylesheet(this._stylesheet);
    }

    _unloadStylesheet() {
        if (!this._stylesheet)
            return;

        const theme = St.ThemeContext.get_for_stage(global.stage);
        theme.get_theme().unload_stylesheet(this._stylesheet);
        this._stylesheet = null;
    }
}
