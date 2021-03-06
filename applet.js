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
const Technology = Extension.technology;
const Translate = Extension.translate;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

function Connman() {
  this._init.apply(this, arguments);
}

Connman.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this,
                                                Icons.NetworkStatus.OFFLINE);
        this._manager = new Manager();
        this._agent = new Agent.Agent(this._manager);

        this._servicesItem = new PopupMenu.PopupSubMenuMenuItem(
                                                    Translate.SERVICES);
        this._configItem = new PopupMenu.PopupSubMenuMenuItem(
                                                    Translate.CONFIGURATION);

        this.menu.addMenuItem(this._servicesItem);
        this.menu.addMenuItem(this._configItem);

        this._connectSignals();
        this._setInitialVisibility();
    },

    _setInitialVisibility: function() {
        this.actor.hide();
        this._configItem.actor.hide();
        this._servicesItem.actor.hide();
    },

    _demonStart: function() {
        this._manager.proxy.RegisterAgentRemote(ConnmanDbus.AGENT_PATH,
                                                Lang.bind(this, function(err) {
            if (err != null)
                global.log('RegisterAgent: ' + err);
        }));

	this._offLineMode = new Technology.PropertyChangedSwitchMenuItem(
	                                Translate.OFFLINE, false, this._manager,
	                                this._manager.proxy, 'OfflineMode');
        this._configItem.menu.addMenuItem(this._offLineMode);
        this.actor.show();
    },

    _demonStop: function() {
        this._manager.proxy.UnregisterAgentRemote(ConnmanDbus.AGENT_PATH,
		                                Lang.bind(this, function(err) {
                if (err != null)
                    global.log('UnregisterAgent: ' + err);
        }));

        this._setInitialVisibility();
        this._configItem.menu.removeAll();
        this._servicesItem.menu.removeAll();
    },

    _propChanged: function(obj, property, value) {
        switch(property) {
        case 'OfflineMode':
            this._configItem.actor.show();
        case 'State':
            this._updateStateIcon();
            break;
        default:
            global.log('Ignored: ' + property);
            break;
        }
    },

    _techAdded: function(obj, technology) {
        item = new Technology.PropertyChangedSwitchMenuItem(technology.Name,
                                                technology.Powered, technology,
                                                technology.proxy, 'Powered');
        this._configItem.menu.addMenuItem(item);
    },

    _updateServices: function(obj, services) {
        /* We can't remove individually elements from a menu  */
        /* so the only way to keep the menu items sorted is   */
        /* by removing all elements and inserting them sorted */
        this._servicesItem.menu.removeAll();

        for (let i = 0, len = services.length; i < len; i++) {
            let [path, service] = services[i];
            let item = Service.ServiceItemFactory(service);

            if (item)
                this._servicesItem.menu.addMenuItem(item);
        }

        if (services.length == 0)
            this._servicesItem.actor.hide();
        else
            this._servicesItem.actor.show();
    },

    _connectSignals: function() {
        this._startId = this._manager.connect('demon-start', Lang.bind(this,
                                                            this._demonStart));
        this._stopId = this._manager.connect('demon-stop', Lang.bind(this,
                                                            this._demonStop));
        this._propChangeId = this._manager.connect('property-changed',
                                            Lang.bind(this, this._propChanged));
        this._techAddedId = this._manager.connect('technology-added',
                                            Lang.bind(this, this._techAdded));
        this._servChangedId = this._manager.connect('services-changed',
                                        Lang.bind(this, this._updateServices));
    },

    _disconnectSignals: function() {
        this._manager.disconnect(this._startId);
        this._manager.disconnect(this._stopId);
        this._manager.disconnect(this._propChangeId);
        this._manager.disconnect(this._techAddedId);
        this._manager.disconnect(this._servChangedId);
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

    destroy: function() {
        this._manager.proxy.UnregisterAgentRemote(ConnmanDbus.AGENT_PATH);
        this._agent.destroy();
        this._agent = null;
        this._disconnectSignals();
        this._manager.destroy();
        this._manager = null;
        PanelMenu.SystemStatusButton.prototype.destroy.call(this);
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
        this.Technologies = {};
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
        if (this[prop] && this[prop] == value)
            return;

        this[prop] = value;
        this.emit('property-changed', prop, value);
    },

    _addTechnology: function (path, properties) {
        if (this.Technologies[path])
            return;

        let technology = new Technology.Technology(path, properties);
        this.Technologies[path] = technology;
        this.emit('technology-added', technology);
    },

    _getElement: function(path) {
        for (let i = 0, len = this.Services.length; i < len; i++) {
            if (!this.Services[i])
                continue;

            let [objPath, service] = this.Services[i];

            if (path == objPath)
                return[i, service];
        }

        return [-1, null];
    },

    _serviceAdded: function(services) {
        let newList = new Array(services.length);

        for (let i = 0, len = services.length; i < len; i++) {
            let [path, properties] = services[i];
            let [index, service] = this._getElement(path);

            if (index < 0)
                newList[i] = [path, new Service.Service(path, properties)];
            else {
                newList[i] = [path, service];
                delete this.Services[index];
            }
        }

        this.Services = newList;
        this.emit('services-changed', this.Services);
    },

    _servicesRemoved: function(services) {
        for (let i = 0, len = services.length; i < len; i++) {
            let path = services[i];
            let [index, service] = this._getElement(path);

            if (index < 0)
                continue;

            service.destroy();
            delete this.Services[index];
        }

        let newList = [];
        let numServices = 0;
        for (let i = 0, len = this.Services.length; i < len; i++) {
            if (!this.Services[i])
                continue;

            newList[numServices++] = this.Services[i];
        }

        this.Services = newList;
        this.emit('services-changed', this.Services);
    },

    _connectSignals: function() {
        this._propChangeId = this.proxy.connect('PropertyChanged',
                                      Lang.bind(this, function(bus, prop, val) {
            this._updateProperty(prop, val);
        }));

        this._techAddedId = this.proxy.connect('TechnologyAdded',
                            Lang.bind(this, function(bus, path, properties) {
            this._addTechnology(path, properties);
        }));

        this._techRemovedId = this.proxy.connect('TechnologyRemoved',
                            Lang.bind(this, function(bus, objPath, properties) {
            global.log('TODO: Removed ' + properties['Name']);
        }));

        this._svcAddedId = this.proxy.connect('ServicesAdded',
                                    Lang.bind(this, function(bus, services) {
            this._serviceAdded(services);
        }));

        this._svcRemovedId = this.proxy.connect('ServicesRemoved',
                                    Lang.bind(this, function(bus, services) {
            this._servicesRemoved(services);
        }));
    },

    _disconnectSignals: function() {
        this.proxy.disconnect(this._propChangeId);
        this.proxy.disconnect(this._techAddedId);
        this.proxy.disconnect(this._techRemovedId);
        this.proxy.disconnect(this._svcAddedId);
        this.proxy.disconnect(this._svcRemovedId);
    },

    _getProperties: function() {
        this.proxy.GetPropertiesRemote(Lang.bind(this,
                                                    function(properties, err) {
            if (err != null) {
                global.log(err);
                return;
            }

            for (let prop in properties)
                this._updateProperty(prop, properties[prop]);
        }));
    },

    _getTechnologies: function() {
        this.proxy.GetTechnologiesRemote(Lang.bind(this,
                                                function(technologies, err) {
            if (err != null) {
                global.log('GetTechnologies: ' + err);
                return;
            }

            for (let i = 0, len = technologies.length; i < len; i++) {
                let [path, properties] = technologies[i];
                this._addTechnology(path, properties);
            }
        }));
    },

    _getServices: function() {
        this.proxy.GetServicesRemote(Lang.bind(this, function(services, err) {
            if (err != null) {
                global.log('GetServices: ' + err);
                return;
            }

            this._serviceAdded(services);
        }));
    },

    _onManagerAppeared: function(owner) {
        this._connectSignals();

        this._getProperties();
        this._getTechnologies();
        this._getServices();

        this.emit('demon-start');
    },

    _onManagerVanished: function(oldOwner) {
        this._reset();
        this.emit('demon-stop');
    },

    _reset: function() {
        for (let technology in this.Technologies)
            this.Technologies[technology].destroy();

        this.Technologies = {};

        for (let i = 0, len = this.Services.length; i < len; i++) {
            let [path, service] = this.Services[i];
            service.destroy();
        }

        this.Services = [];

        this._disconnectSignals();

        this.State = ManagerState.OFFLINE;
        this.OfflineMode = false;
        this.SessionMode = false;
    },

    destroy: function() {
        this._reset();
        /* TODO: unwatch_name */
        this.proxy = null;
    }
};

Signals.addSignalMethods(Manager.prototype);

