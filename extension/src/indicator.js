// Nimbus panel indicator.
//
// Task 02 skeleton: a static placeholder module in the panel, styled per
// DESIGN.md section 6.3 (system-UI face + mono numerals, muted colors, no
// module background). Real modules and the metrics coordinator replace the
// placeholder text in task 04.

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export const NimbusIndicator = GObject.registerClass(
    {
        GTypeName: 'NimbusIndicator',
    },
    class NimbusIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'Nimbus', false);

            this._label = new St.Label({
                text: 'nimbus',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'nimbus-panel-label',
                x_align: Clutter.ActorAlign.CENTER,
                reactive: false,
            });
            this.add_child(this._label);
        }

        setText(text) {
            this._label.text = text;
        }

        get label() {
            return this._label;
        }
    },
);
