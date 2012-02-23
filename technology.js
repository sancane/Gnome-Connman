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
const Signals = imports.signals;

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const ConnmanDbus = Extension.connmanDbus;

function Technology() {
    this._init.apply(this, arguments);
};

Technology.prototype = {
    _init: function(path, properties) {
        this.proxy = new ConnmanDbus.ServiceProxy(DBus.system,
                                        ConnmanDbus.MANAGER_SERVICE, path);
        this._propChangeId = this._proxy.connect('PropertyChanged',
                                      Lang.bind(this, this._propertyChanged));
    },

    _propertyChanged: function(dbus, property, value) {
        if (this[property] == value)
            return;

        this[property] = value;
        this.emit('property-changed', property, value);
    },

    destroy: function () {
        this._proxy.disconnect(this._propChangeId);
        this.proxy = null;
    }
}

Signals.addSignalMethods(Technology.prototype);
