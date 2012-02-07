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

const Lang = imports.lang;
const St = imports.gi.St;

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const Service = Extension.service;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const NetStatIcon = {
    NETERROR: 'network-error',
    NETIDLE: 'network-idle',
    NETOFFLINE: 'network-offline',
    NETRECV: 'network-receive',
    NETTRANS: 'network-transmit',
    NETTRANSRECV: 'network-transmit-receive'
};

function ConnmanApp() {
  this._init();
}

ConnmanApp.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this,
                                                    NetStatIcon.NETOFFLINE);
        this.actor.visible = false;
        this._enabled = false;
        this._index = 0;
        this._items = [];
    },

    _addService: function(service) {
        let item = Service.ServiceItemFactory(service);

        if (item == null)
            return;

        this._items[this._index] = item;
        this.menu.addMenuItem(item);
        this._index++;
    },

    _showApp: function () {
        if (this._enabled)
            this.actor.visible = true;
    },

    _hideApp: function () {
        this.actor.visible = false;
    },

    /* Overwrite this method */
    _shutdown: function() {},

    /* Overwrite this method */
    _resume: function() {},

    enable: function() {
        this._enabled = true;
        this._resume();
    },

    disable: function() {
        this._enabled = false;
        this._shutdown();
    },

    isEnabled: function() {
        return this._enabled;
    }
};
