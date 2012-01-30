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

const Lang = imports.lang;
const St = imports.gi.St;

const Main = imports.ui.main;

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
    _init: function() {
        this._enabled = false;
        this._button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
        this._icon = new St.Icon({ icon_name: NetStatIcon.NETOFFLINE,
                             icon_type: St.IconType.SYMBOLIC,
                             style_class: 'system-status-icon' });
        this._button.set_child(this._icon);
        this._button.connect('button-press-event',
                                        Lang.bind(this, this._buttonPressed));
    },

    _buttonPressed: function() {
        if (this._icon.icon_name == NetStatIcon.NETERROR)
            this._icon.icon_name = NetStatIcon.NETIDLE;
        else if (this._icon.icon_name == NetStatIcon.NETIDLE)
            this._icon.icon_name = NetStatIcon.NETOFFLINE;
        else if (this._icon.icon_name == NetStatIcon.NETOFFLINE)
            this._icon.icon_name = NetStatIcon.NETRECV;
        else if (this._icon.icon_name == NetStatIcon.NETRECV)
            this._icon.icon_name = NetStatIcon.NETTRANS;
        else if (this._icon.icon_name == NetStatIcon.NETTRANS)
            this._icon.icon_name = NetStatIcon.NETTRANSRECV;
        else if (this._icon.icon_name == NetStatIcon.NETTRANSRECV)
            this._icon.icon_name = NetStatIcon.NETERROR;
    },

    _showApp: function () {
        if (this._enabled)
            Main.panel._rightBox.insert_actor(this._button, 0);
    },

    _hideApp: function () {
        Main.panel._rightBox.remove_actor(this._button);
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

    setIconName: function(name) {
        this._icon.icon_name = name;
    }
};
