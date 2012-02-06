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

const PopupMenu = imports.ui.popupMenu;

function signalToIcon(value) {
    if (value > 80)
        return 'network-wireless-signal-excellent';
    if (value > 55)
        return 'network-wireless-signal-good';
    if (value > 30)
        return 'network-wireless-signal-ok';
    if (value > 5)
        return 'network-wireless-signal-weak';
    return 'none';
}

function ServiceItem() {
    this._init.apply(this, arguments);
}

ServiceItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(service) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
        this._service = service;

        this._createItem();
    },

    _createItemWifi: function () {
        this._icon = new St.Icon({ icon_name: signalToIcon(this._service.Strength),
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });

        this._box.add_actor(this._icon);
        this._box.add_actor(this._label);
        this.addActor(this._box);
        this._service.addPropertyWatcher(['Name', 'State', 'Strength'],
                                   Lang.bind(this, function(property, value) {
            switch(property) {
                case 'Name':
                this._label.set_text(value);
                break;
            case 'Strength':
                this._icon.set_icon_name(signalToIcon(value));
                break;
            case 'State':
                /* TODO: */
                break;
            default:
                global.log('Unmanaged property ' + property);
                return;
            }
        }));
    },

    _createItemEthernet: function () {
        this._icon = new St.Icon({ icon_name: 'network-wired',
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });
        this._box.add_actor(this._icon);
        this._box.add_actor(this._label);
        this.addActor(this._box);
        this._service.addPropertyWatcher(['Name', 'State'], Lang.bind(this,
                                                    function(property, value) {
            switch(property) {
                case 'Name':
                this._label.set_text(value);
                break;
            case 'State':
                /* TODO: */
                break;
            default:
                global.log('Unmanaged property ' + property);
                return;
            }
        }));
    },

    _createItem: function () {
        this._box = new St.BoxLayout({ style_class: 'popup-device-menu-item' });
        this._label = new St.Label({ text: this._service.Name != undefined ?
                                            this._service.Name : '<unknown>' });

        switch(this._service.Type) {
        case ServiceType.WIFI:
            this._createItemWifi();
            break;
        case ServiceType.ETHERNET:
            this._createItemWifi();
            break;
        default: /* Add more services for ethernet, bluetooth, etc */
            global.log('TODO: Add service item for ' + this._service.Type);
            this._box.add_actor(this._label);
            this.addActor(this._box);
            break;
        }
    }
};

const ServiceType = {
    ETHERNET: 'ethernet',
    WIFI: 'wifi',
};

const ServiceState = {
    IDLE: 'idle',
    FAILURE: 'failure',
    ASSOCIATION: 'association',
    CONFIGURATION: 'configuration',
    READY: 'ready',
    ONLINE: 'online',
};

function Service() {
    this._init.apply(this, arguments);
};

Service.prototype = {
    _init: function(path, cb) {
        this._path = path;
        this._cb = cb;
        this._watchers = [];
        this._proxy = new ConnmanDbus.ServiceProxy(DBus.system,
                                        ConnmanDbus.MANAGER_SERVICE, path);
        this._proxy.GetPropertiesRemote(Lang.bind(this,
                                                    function(properties, err) {
            if (err != null) {
                this._cb(this, err);
                return;
            }

            for (let prop in properties)
                this[prop] = properties[prop];

            if (!this._cb(this, null))
                return;

            this._propChangeId = this._proxy.connect('PropertyChanged',
                                      Lang.bind(this, this._propertyChanged));
        }));
    },

    addPropertyWatcher: function(properties, cb) {
        this._watchers.unshift({ properties : properties, cb : cb });
    },

    _propertyChanged: function(dbus, property, value) {
        this[property] = value;

        for (let i = 0, len = this._watchers.length; i < len; i++) {
            if (!this._watchers[i])
                continue;

            for (let j = 0, jlen = this._watchers[i].properties.length;
                                                            j < jlen; j++) {
                if (!this._watchers[i].properties[j])
                    continue;

                if (property == this._watchers[i].properties[j])
                    this._watchers[i].cb(property, value);
            }
        }
    },

    getPath: function() {
        return this._path;
    }
};
