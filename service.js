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
        this._id = new St.BoxLayout({ style_class: 'popup-device-menu-item' });
        this._status = new St.BoxLayout({
                                        style_class: 'popup-device-menu-item'
                                        });

        this._statIcon = new St.Icon({ icon_name: Icons.NetworkStatus.IDLE,
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });

        let icon_name = Icons.FavoriteService.DISCONNECTED
        if (service.State && service.State == State.ONLINE)
            icon_name = Icons.FavoriteService.CONNECTED;

        this._favIcon = new St.Icon({ icon_name: icon_name,
                               icon_type: St.IconType.SYMBOLIC,
                               style_class: 'popup-menu-icon' });

        this._statIcon.visible = false;
        if (!service.Favorite)
            this._favIcon.visible = false;

        this._status.add_actor(this._statIcon);
        this._status.add_actor(this._favIcon);

        this.addActor(this._id);
        this.addActor(this._status);

        this._service = service;
        this._timeoutId = 0;

        this._service.connect('property-changed', Lang.bind(this,
                                                        this._propertyChanged));
    },

    _propertyChanged: function(obj, property, value) {
        switch(property) {
        case 'Favorite':
            this._favIcon.visible = value;
            break;
        case 'State':
            this._changeState(property, value);
            break;
        }
    },

    _startAnimation: function() {
        if (this._timeoutId != 0)
            return;

        this._statIcon.visible = true;
        this._timeoutId = Mainloop.timeout_add_seconds(1,
                                    Lang.bind(this, this._updateStatusIcon));
    },

    _stopAnimation: function() {
        if (this._timeoutId <= 0)
            return;

        Mainloop.source_remove(this._timeoutId);
        this._statIcon.visible = false;
        this._timeoutId = 0;
    },

    _changeState: function(property, value) {
        switch(value) {
        case State.ASSOCIATION:
        case State.CONFIGURATION:
        case State.READY:
            this._startAnimation();
            break;
        case State.ONLINE:
            this._favIcon.set_icon_name(Icons.FavoriteService.CONNECTED);
            this._stopAnimation();
            break;
        case State.IDLE:
        case State.FAILURE:
            this._favIcon.set_icon_name(Icons.FavoriteService.DISCONNECTED);
            this._stopAnimation();
            break;
        }
    },

    _updateStatusIcon: function() {
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
        this._label = new St.Label({ text: this._service.Name != undefined ?
                        this._service.Name : '<' + Translate.UNKNOWN + '>' });
        let icon_name = this._service.Strength ?
            this._signalToIcon(this._service.Strength) : Icons.WifiSignal.WEAK;

        this._icon = new St.Icon({ icon_name: icon_name,
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });

        this._id.add_actor(this._icon);
        this._id.add_actor(this._label);

        if (this._hasSecurity()) {
            this._secureIcon = new St.Icon({ icon_name: Icons.WIFI_ENCRYPTED,
                                            style_class: 'popup-menu-icon' });
            this._status.add_actor(this._secureIcon);
        }

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

    _hasSecurity: function() {
        if (!this._service.Security)
            return false;

        for (let i = 0, len = this._service.Security.length; i < len; i++) {
            if (this._service.Security[i] != 'none')
                return true;
        }

        return false;
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

        this._label = new St.Label({ text: this._service.Name != undefined ?
                        this._service.Name : '<' + Translate.UNKNOWN + '>' });
        this._icon = new St.Icon({ icon_name: Icons.Wired,
                                   icon_type: St.IconType.SYMBOLIC,
                                   style_class: 'popup-menu-icon' });
        this._id.add_actor(this._icon);
        this._id.add_actor(this._label);

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
