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
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const St = imports.gi.St;

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const ConnmanDbus = Extension.connmanDbus;
const Icons = Extension.icons;
const Translate = Extension.translate;

const PopupMenu = imports.ui.popupMenu;

const ServiceType = {
    ETHERNET: 'ethernet',
    WIFI: 'wifi',
};

const State = {
    IDLE: 'idle',
    FAILURE: 'failure',
    ASSOCIATION: 'association',
    CONFIGURATION: 'configuration',
    READY: 'ready',
    ONLINE: 'online',
};

function ServiceItem() {
    /* TODO: Make this class abstract. See PopupMenuBase */
    this._init.apply(this, arguments);
}

ServiceItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(service) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
        this._service = service;
        this._timeoutId = 0;
    },

    _updateStatusIcon: function() {
        if (this._service.State == State.ONLINE) {
            this._statIcon.visible = false;
            this._timeoutId = 0;
            return false;
        }

        let icon_name;

        switch(this._statIcon.get_icon_name()) {
        case Icons.NetworkStatus.TRANS:
            icon_name = Icons.NetworkStatus.RECV;
            break;
        case Icons.NetworkStatus.RECV:
            icon_name = Icons.NetworkStatus.TRANS;
            break;
        default:
            icon_name = Icons.NetworkStatus.RECV;
            break;
        }

        this._statIcon.set_icon_name(icon_name);
        return true;
    },

    addStatusIcon: function(box) {
        this._statIcon = new St.Icon({ icon_name: Icons.NetworkStatus.IDLE,
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });
        this._statIcon.visible = false;

        box.add_actor(this._statIcon);
        this._service.connect('property-changed', Lang.bind(this,
                                                function(obj, property, value) {
            if (property != 'State')
                return;

            switch(value) {
            case State.ASSOCIATION:
            case State.CONFIGURATION:
            case State.READY:
                if (this._timeoutId == 0) {
                    /* Set animation while network is connecting */
                    this._statIcon.visible = true;
                    this._timeoutId = Mainloop.timeout_add_seconds(1,
                                    Lang.bind(this, this._updateStatusIcon));
                }
                break;
            case State.IDLE:
            case State.FAILURE:
            case State.ONLINE:
                if (this._timeoutId > 0) {
                    /* Stop animation */
                    Mainloop.source_remove(this._timeoutId);
                    this._statIcon.visible = false;
                    this._timeoutId = 0;
                }
                break;
            }
        }));
    },

    activate: function(event) {
        this._service.proxy.ConnectRemote(Lang.bind(this, function(err) {
            if (err)
                global.log('Connect: ' + err);
        }));

        PopupMenu.PopupBaseMenuItem.prototype.activate.call(this, event);
    },
};

function WifiServiceItem() {
    this._init.apply(this, arguments);
};

WifiServiceItem.prototype = {
    __proto__: ServiceItem.prototype,

    _init: function(service) {
        ServiceItem.prototype._init.call(this, service);

        this._box = new St.BoxLayout({ style_class: 'popup-device-menu-item' });
        this._label = new St.Label({ text: this._service.Name != undefined ?
                        this._service.Name : '<' + Translate.UNKNOWN + '>'});

        let icon_name = this._service.Strength ?
            this._signalToIcon(this._service.Strength) : Icons.WifiSignal.WEAK;

        this._icon = new St.Icon({ icon_name: icon_name,
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });

        this._box.add_actor(this._icon);
        this._box.add_actor(this._label);
        this.addStatusIcon(this._box);
        this.addActor(this._box);
        this._service.connect('property-changed', Lang.bind(this,
                                                function(obj, property, value) {
            switch(property) {
            case 'Name':
                this._label.set_text(value);
                break;
            case 'Strength':
                this._icon.set_icon_name(this._signalToIcon(value));
                break;
            }
        }));
    },

    _signalToIcon: function (value) {
        if (value > 80)
            return Icons.WifiSignal.EXCELLENT;
        if (value > 55)
            return Icons.WifiSignal.GOOD;
        if (value > 30)
            return Icons.WifiSignal.OK;
        if (value > 5)
            return Icons.WifiSignal.WEAK;

        return this._icon.get_icon_name();
    }
};

function EtherServiceItem() {
    this._init.apply(this, arguments);
};

EtherServiceItem.prototype = {
    __proto__: ServiceItem.prototype,

    _init: function(service) {
        ServiceItem.prototype._init.call(this, service);

        this._box = new St.BoxLayout({ style_class: 'popup-device-menu-item' });
        this._label = new St.Label({ text: this._service.Name != undefined ?
                        this._service.Name : '<' + Translate.UNKNOWN + '>' });
        this._icon = new St.Icon({ icon_name: Icons.Wired,
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });
        this._box.add_actor(this._icon);
        this._box.add_actor(this._label);
        this.addActor(this._box);
        this._service.connect('property-changed', Lang.bind(this,
                                                function(obj, property, value) {
            if (property == 'Name')
                this._label.set_text(value);
        }));
    }
};

function Service() {
    this._init.apply(this, arguments);
};

Service.prototype = {
    _init: function(path, properties) {
        this.proxy = new ConnmanDbus.ServiceProxy(DBus.system,
                                        ConnmanDbus.MANAGER_SERVICE, path);
        this._propChangeId = this.proxy.connect('PropertyChanged',
                                      Lang.bind(this, this._propertyChanged));

        for (let property in properties)
            this[property] = properties[property];
    },

    _propertyChanged: function(dbus, property, value) {
        if (this[property] == value)
            return;

        this[property] = value;
        this.emit('property-changed', property, value);
    },

    destroy: function() {
        this.proxy.disconnect(this._propChangeId);
        this.proxy = null;
    }
};
Signals.addSignalMethods(Service.prototype);

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
