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

const DBus = imports.dbus;

const MANAGER_SERVICE = 'net.connman';
const MANAGER_INTERFACE = 'net.connman.Manager';
const MANAGER_OBJECT_PATH = '/';

const ManagerInterface = {
    name: MANAGER_INTERFACE,
    methods: [
        { name: 'GetProperties', inSignature: '', outSignature: 'a{sv}' },
        { name: 'SetProperty', inSignature: 'sv', outSignature: '' },
        { name: 'GetTechnologies', inSignature: '', outSignature: 'a(oa{sv})' },
        { name: 'RemoveProvider', inSignature: 'o', outSignature: '' },
        { name: 'RequestScan', inSignature: 's', outSignature: '' },
        { name: 'EnableTechnology', inSignature: 's', outSignature: '' },
        { name: 'DisableTechnology', inSignature: 's', outSignature: '' },
        { name: 'GetServices', inSignature: '', outSignature: 'a(oa{sv})' },
        { name: 'ConnectProvider', inSignature: 'a{sv}', outSignature: 'o' },
        { name: 'RegisterAgent', inSignature: 'o', outSignature: '' },
        { name: 'UnregisterAgent', inSignature: 'o', outSignature: '' },
        { name: 'RegisterCounter', inSignature: 'ouu', outSignature: '' },
        { name: 'UnregisterCounter', inSignature: 'o', outSignature: '' },
        { name: 'CreateSession', inSignature: 'a{sv}o', outSignature: 'o' },
        { name: 'DestroySession', inSignature: 'o', outSignature: '' },
        { name: 'RequestPrivateNetwork', inSignature: '', outSignature: 'oa{sv}h' },
        { name: 'ReleasePrivateNetwork', inSignature: 'o', outSignature: '' },
        ],
    signals: [
        { name: 'PropertyChanged', inSignature: 'sv' },
        { name: 'TechnologyAdded', inSignature: 'a{sv}' },
        { name: 'TechnologyRemoved', inSignature: 'o' },
        ]
};

let ManagerProxy = DBus.makeProxyClass(ManagerInterface);


const TECHNOLOGY_INTERFACE = 'net.connman.Technology';

const TechnologyInterface = {
    name: TECHNOLOGY_INTERFACE,
    methods: [
        { name: 'GetProperties', inSignature: '', outSignature: 'a{sv}' },
        { name: 'SetProperty', inSignature: 'sv', outSignature: '' },
        { name: 'Scan', inSignature: '', outSignature: '' },
        ],
    signals: [
        { name: 'PropertyChanged', inSignature: 'sv' },
        ]
};

let TechnologyProxy = DBus.makeProxyClass(TechnologyInterface);

const AGENT_INTERFACE = 'net.connman.Agent';

const ConnmanAgent = {
    name: AGENT_INTERFACE,
    methods: [
        { name: 'Release', inSignature: '', outSignature: '' },
        { name: 'ReportError', inSignature: 'os', outSignature: '' },
        { name: 'RequestBrowser', inSignature: 'os', outSignature: '' },
        { name: 'RequestInput', inSignature: 'oa{sv}', outSignature: 'a{sv}' },
        { name: 'Cancel', inSignature: '', outSignature: '' },
        ]
};

