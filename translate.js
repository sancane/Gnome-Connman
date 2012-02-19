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

const ExtensionSystem = imports.ui.extensionSystem;
const Gettext = imports.gettext;

const path = ExtensionSystem.extensionMeta[EXTENSION_DIR].path + "/locale";
Gettext = imports.gettext.domain(EXTENSION_DIR);
Gettext.bindtextdomain(EXTENSION_DIR, path);

const _ = Gettext.gettext;

/* Translatable strings */

const ACCEPT = _("Accept");
const AUTH_REQ_MSG = _("Authentication Required");
const CANCEL = _("Cancel");
const CONNECTION_MANAGER = _("Connection Manager");
const CONFIGURATION = _("Configuration");
const IDENTITY = _("Identity");
const IS_MANDATORY = _("is mandatory");
const NAME = _("Name");
const NETWORK_ERROR = _("Network error");
const PASSPHRASE = _("Passphrase");
const PASSWORD = _("Password");
const RETRY = _("Retry");
const SERVICES = _("Services");
const UNKNOWN = _("Unknown");
const USERNAME = _("Username");

