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
const St = imports.gi.St;

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const Agent = Extension.agent;
const ConnmanDbus = Extension.connmanDbus;
const Icons = Extension.icons;
const Service = Extension.service;
const Translate = Extension.translate;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

function Connman() {
  this._init();
}

Connman.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this,
                                                Icons.NetworkStatus.OFFLINE);
        this._agent = new Agent.Agent(Lang.bind(this, this._getService));
        this.actor.visible = false;
        this._enabled = false;

        this._servicesItem = new PopupMenu.PopupSubMenuMenuItem(
                                                    Translate.SERVICES);
        this._configItem = new PopupMenu.PopupSubMenuMenuItem(
                                                    Translate.CONFIGURATION);
        this._offLineMode = new PopupMenu.PopupSwitchMenuItem(
                                                    Translate.OFFLINE, false);
        this._offLineMode.connect('toggled', Lang.bind(this, function() {
            global.log('Applet: TODO');
        }));

        this._servicesItem.actor.visible = false;
        this.menu.addMenuItem(this._servicesItem);
        this.menu.addMenuItem(this._configItem);
        this._configItem.menu.addMenuItem(this._offLineMode);

        this._manager = new Manager();
        this._manager.connect('demon-start', Lang.bind(this, function(obj) {
            this._manager.proxy.RegisterAgentRemote(ConnmanDbus.AGENT_PATH,
                                                Lang.bind(this, function(err) {
                if (err != null)
                    global.log('Connman: ' + err);
            }));
            this.actor.visible = true;
        }));

        this._manager.connect('demon-stop', Lang.bind(this, function(obj) {
            this._manager.proxy.UnregisterAgentRemote(ConnmanDbus.AGENT_PATH,
		                                Lang.bind(this, function(err) {
                if (err != null)
                    global.log('Connman: ' + err);
            }));
            this.actor.visible = false;
        }));

        this._manager.connect('property-change', Lang.bind(this,
                                                function(obj, property, value) {
            if (property == 'State' || property == 'OfflineMode')
                this._updateStateIcon();
        }));
    },

    _getService: function(svcPath) {
        /* TODO */
        return null;
    },

    _updateStateIcon: function() {
        if (this._manager.OfflineMode) {
            this.setIcon(Icons.NetworkStatus.OFFLINE);
            return;
        }

        if (this._manager.State == ManagerState.OFFLINE)
            this.setIcon(Icons.NetworkStatus.IDLE);
        else if (this._manager.State == ManagerState.ONLINE)
            this.setIcon(Icons.NetworkStatus.TRANSRECV);
        else
            global.log('Unexpected state: ' + this.State);
    },

    _connectService: function(object, event, service) {
        /* TODO: Change icon or do something */
        service.connectService();
    },

    _addServiceItem: function(service) {
        let item = Service.ServiceItemFactory(service);l

        if (item == null)
            return;

        this._servicesItem.menu.addMenuItem(item);
        item.connect('activate', Lang.bind(this, this._connectService, service));

        if (!this._servicesItem.actor.visible)
            this._servicesItem.actor.visible = true;
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

const ManagerState = {
    OFFLINE: 'offline',
    ONLINE: 'online',
};

function Manager() {
    this._init.apply(this, arguments);
}

Manager.prototype = {
    _init: function() {
        this.Services = [];
        this.State = ManagerState.OFFLINE;
        this.OfflineMode = false;
        this.SessionMode = false;
        this.proxy = new ConnmanDbus.ManagerProxy(DBus.system,
                                              ConnmanDbus.MANAGER_SERVICE,
                                              ConnmanDbus.MANAGER_OBJECT_PATH);
        DBus.system.watch_name(ConnmanDbus.MANAGER_SERVICE,
                           false, // do not launch a name-owner if none exists
                           Lang.bind(this, this._onManagerAppeared),
                           Lang.bind(this, this._onManagerVanished));
    },

    _updateProperty:function(prop, value) {
        if (prop == 'Services')
            return;

        if (this[prop] && this[prop] == value)
            return;

        this[prop] = value;
        this.emit('property-change', prop, value);
    },

    _connectSignals: function() {
        this._propChangeId = this.proxy.connect('PropertyChanged',
                                      Lang.bind(this, function(bus, prop, val) {
            this._updateProperty(prop, val);
        }));
    },

    _disconnectSignals: function() {
        this.proxy.disconnect(this._propChangeId);
    },

    _onManagerAppeared: function(owner) {
        this._connectSignals();
        this.proxy.GetPropertiesRemote(Lang.bind(this,
                                                    function(properties, err) {
            if (err != null) {
                global.log(err);
                return;
            }

            for (let prop in properties)
                this._updateProperty(prop, properties[prop]);
        }));
        this.emit('demon-start');
    },

    _onManagerVanished: function(oldOwner) {
        this._disconnectSignals();
        this.emit('demon-stop');
    },

    destroy: function() {
        this._disconnectSignals();
        this.Services = [];
    }
};
Signals.addSignalMethods(Manager.prototype);

