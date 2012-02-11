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
const Translate = Extension.translate;

const PopupMenu = imports.ui.popupMenu;

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

function ServiceItem() {
    this._init.apply(this, arguments);
}

ServiceItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(service) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
        this._service = service;

        this._createItem();
    }
};

function WifiServiceItem() {
    this._init.apply(this, arguments);
};

WifiServiceItem.prototype = {
    __proto__: ServiceItem.prototype,

    _init: function(service) {
        ServiceItem.prototype._init.call(this, service);
    },

    _signalToIcon: function (value) {
        if (value > 80)
            return 'network-wireless-signal-excellent';
        if (value > 55)
            return 'network-wireless-signal-good';
        if (value > 30)
            return 'network-wireless-signal-ok';
        if (value > 5)
            return 'network-wireless-signal-weak';
        return 'none';
    },

    _createItem: function () {
        this._box = new St.BoxLayout({ style_class: 'popup-device-menu-item' });
        this._label = new St.Label({ text: this._service.Name != undefined ?
                        this._service.Name : '<' + Translate.UNKNOWN + '>'});
        this._icon = new St.Icon({ icon_name: this._signalToIcon(
                                                        this._service.Strength),
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
                this._icon.set_icon_name(this._signalToIcon(value));
                break;
            case 'State':
                /* TODO: */
                break;
            default:
                global.log('Not managed wifi service property ' + property);
                return;
            }
        }));
    },
};

function EtherServiceItem() {
    this._init.apply(this, arguments);
};

EtherServiceItem.prototype = {
    __proto__: ServiceItem.prototype,

    _init: function(service) {
        ServiceItem.prototype._init.call(this, service);
    },

    _createItem: function () {
        this._box = new St.BoxLayout({ style_class: 'popup-device-menu-item' });
        this._label = new St.Label({ text: this._service.Name != undefined ?
                                            this._service.Name : '<unknown>' });
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
                global.log('Not managed ethernet service property ' + property);
                return;
            }
        }));
    },
};

function Service() {
    this._init.apply(this, arguments);
};

Service.prototype = {
    _init: function(path, cb, data) {
        this._path = path;
        this._cb = cb;
        this._data = data;
        this._watchers = [];
        this._propChangeId = 0;
        this._proxy = new ConnmanDbus.ServiceProxy(DBus.system,
                                        ConnmanDbus.MANAGER_SERVICE, path);
        this._proxy.GetPropertiesRemote(Lang.bind(this,
                                                    function(properties, err) {
            if (err != null) {
                this._cb(this, this._data, err);
                return;
            }

            for (let prop in properties)
                this[prop] = properties[prop];

            this._propChangeId = this._proxy.connect('PropertyChanged',
                                      Lang.bind(this, this._propertyChanged));
            this._cb(this, this._data, null);
        }));
    },

    connect: function() {
        this._proxy.ConnectRemote(Lang.bind(this, function(err) {
            if (err)
                global.log('connection fail: ' + err);
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

    destroy: function () {
        if (this._propChangeId > 0) {
            this._proxy.disconnect(this._propChangeId);
            this._propChangeId = 0;
        }

        this._watchers = [];
        this._proxy = null;
    }
};

function ServiceItemFactory(service) {
    if (!(service instanceof Service))
        return null;

    switch(service.Type) {
    case ServiceType.WIFI:
        return new WifiServiceItem(service);
    case ServiceType.ETHERNET:
        return new EtherServiceItem(service);
    default:
        global.log('TODO: Add service item for ' + this._service.Type);
        return null;
    }
};
