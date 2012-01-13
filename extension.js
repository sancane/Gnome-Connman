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

const DBus = imports.dbus;
const Lang = imports.lang;
const St = imports.gi.St;

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const ConnmanDbus = Extension.connmanDbus;
const Main = imports.ui.main;

let connMan = null;

function ConnManager() {
    this._init();
};

ConnManager.prototype = {
    _init: function() {
        this._button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
        this._icon = new St.Icon({ icon_name: 'network-offline',
                             icon_type: St.IconType.SYMBOLIC,
                             style_class: 'system-status-icon' });

        this._button.set_child(this._icon);
        this._button.connect('button-press-event', this._buttonPressed);
        this._managerProxy = new ConnmanDbus.ManagerProxy(DBus.system,
                                              ConnmanDbus.MANAGER_SERVICE,
                                              ConnmanDbus.MANAGER_OBJECT_PATH);
        this._managerProxy.connect('PropertyChanged',
                          Lang.bind(this, this._propertyChanged));
    },

    _buttonPressed: function() {
        global.log('Button Pressed');
    },

    _propertyChanged: function(properties) {
        global.log('These are the properties: ' + properties);
    },

    enable: function() {
        Main.panel._rightBox.insert_actor(this._button, 0);
    },

    disable: function() {
        Main.panel._rightBox.remove_actor(this._button);
    }
};

function init() {
    connMan = new ConnManager();
}

function enable() {
    connMan.enable();
}

function disable() {
    connMan.disable();
}
