/*
 *
 *  Gnome Connman - Gnome3 extension for connman
 *
 *  Copyright (C) 2012 Santiago Carot-Nemesio <sancane@gmail.com>
 *
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 */

const EXTENSION_DIR = "gnome_connman@extensions.com";

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const Applet = Extension.applet;

const Main = imports.ui.main;
const Panel = imports.ui.panel;

function removeNMApplet() {
    let len = Main.panel._rightBox.get_children().length;

    for (let i = 0; i < len; i++) {
        if (Main.panel._statusArea['network'] ==
                            Main.panel._rightBox.get_children()[i]._delegate) {
            Main.panel._rightBox.get_children()[i].destroy();
            break;
        }
    }

    Main.panel._statusArea['network'] = null;
}

function restaureNMApplet() {
        let ind = new Panel.STANDARD_STATUS_AREA_SHELL_IMPLEMENTATION['network'];
        Main.panel.addToStatusArea('network', ind,
                            Panel.STANDARD_STATUS_AREA_ORDER.indexOf('network'));
}

let connman = null;

function init(metadata) {
    global.log('Starting Connman extension - version: ' + metadata.version);
}

function enable() {
    removeNMApplet();
    connman = new Applet.Connman();
    Main.panel.addToStatusArea('network', connman);
}

function disable() {
    connman.destroy();
    connman = null;
    Main.panel._statusArea['network'] = null;

    restaureNMApplet();
}
