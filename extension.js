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
const ConnmanApplet = Extension.connmanApplet;
const ConnmanDbus = Extension.connmanDbus;

const Main = imports.ui.main;

let connMan = null;

const ConnManState = {
    OFFLINE: 'offline',
    ONLINE: 'online',
};

function Agent() {
    this._init();
};

Agent.prototype = {
    _init: function() {
        DBus.session.exportObject(ConnmanDbus.AGENT_PATH, this);
    },

    Release: function() {
        global.log('TODO: Release');
    },

    ReportError: function() {
        global.log('TODO: ReportError');
    },

    RequestBrowser: function() {
        global.log('TODO: RequestBrowser');
    },

    RequestInput: function() {
        global.log('TODO: RequestInput');
    },

    Cancel: function() {
        global.log('TODO: Cancel');
    }
};

DBus.conformExport(Agent.prototype, ConnmanDbus.ConnmanAgent);

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

            this._cb(this, null);
        }));
    },

    getPath: function() {
        return this._path;
    }
};

function ConnManager() {
    this._init();
};

ConnManager.prototype = {
    __proto__ : ConnmanApplet.ConnmanApp.prototype,

    _init: function() {
        ConnmanApplet.ConnmanApp.prototype._init.call(this);
        this._services = {};
        this.State = ConnManState.OFFLINE;
        this.OfflineMode = false;
        this.SessionMode = false;
        this._operating = false;
        this._error = false;
        this._agent = new Agent();
        this._managerProxy = new ConnmanDbus.ManagerProxy(DBus.system,
                                              ConnmanDbus.MANAGER_SERVICE,
                                              ConnmanDbus.MANAGER_OBJECT_PATH);
        DBus.system.watch_name(ConnmanDbus.MANAGER_SERVICE,
                           false, // do not launch a name-owner if none exists
                           Lang.bind(this, this._onManagerAppeared),
                           Lang.bind(this, this._onManagerVanished));
    },

    _onManagerAppeared: function(owner) {
        this._operating = true;
        if (this.isEnabled())
            this._resume();
    },

    _onManagerVanished: function(oldOwner) {
        this._operating = false;
        if (this.isEnabled())
            this._shutdown();
    },

    _addService_cb: function(service, err) {
        let path;

        if (err != null) {
            /* TODO: Destroy the service obj */
            global.log(err);
            return;
        }

        path = service.getPath();

        if (path in this._services) {
            //* TODO: Destroy the service obj */
            return;
        }

        this._services[path] = service;
        this._addService(service.Name);
    },

    _processServices: function(services) {
        for (let i = 0; i < services.length; i++) {
            if (!(services[i] in this._services))
                new Service(services[i], Lang.bind(this, this._addService_cb));
        }
    },

    _updateStateIcon: function() {
        if (this._error)  {
            this.setIcon(ConnmanApplet.NetStatIcon.NETERROR);
            return;
        }

        if (this.OfflineMode) {
            this.setIcon(ConnmanApplet.NetStatIcon.NETOFFLINE);
            return;
        }

        if (this.State == ConnManState.OFFLINE)
            this.setIcon(ConnmanApplet.NetStatIcon.NETIDLE);
        else if (this.State == ConnManState.ONLINE)
            this.setIcon(ConnmanApplet.NetStatIcon.NETTRANSRECV);
        else
            global.log('Unexpected state: ' + this.State);
    },

    _propertyChanged: function(dbus, property, value) {
        if (property == 'Services')
            this._processServices(value);
        else
            this[prop] = value;

        if (property == 'State' || property == 'OfflineMode' ||
                                                    property == 'SessionMode')
            this._updateStateIcon();
    },

    _resume: function() {
        if (!this._operating)
            return;

        this._showApp();

        this._managerProxy.RegisterAgentRemote(ConnmanDbus.AGENT_PATH,
                                                Lang.bind(this, function(err) {
            if (err != null) {
                global.log("Error Registering the Agent");
                this._error = true;
                _updateStateIcon();
            }
        }));

        this._managerProxy.GetPropertiesRemote(Lang.bind(this,
                                                    function(properties, err) {
            if (err != null) {
                global.log(err);
                return;
            }

            for (let prop in properties) {
                if (prop == 'Services')
                    this._processServices(properties[prop]);
                else
                    this[prop] = properties[prop];
            }

            this._updateStateIcon();
        }));

        this._propChangeId = this._managerProxy.connect('PropertyChanged',
                                      Lang.bind(this, this._propertyChanged));
    },

    _shutdown: function() {
        this._hideApp();

        this._managerProxy.disconnect(this._propChangeId);

        if (this._operating)
            this._managerProxy.UnregisterAgentRemote(ConnmanDbus.AGENT_PATH,
		                                Lang.bind(this, function(err) {
                if (err != null)
                    global.log("Error unregistering the Agent");
            }));
    }
};

function init(metadata) {
    global.log('Starting ConnMan extension - version: ' + metadata.version);
    connMan = new ConnManager();
    Main.panel.addToStatusArea('networkp', connMan);
}

function enable() {
    connMan.enable();
}

function disable() {
    connMan.disable();
}
