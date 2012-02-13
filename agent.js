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

const Lang = imports.lang;
const Signals = imports.signals;
const Clutter = imports.gi.Clutter;
const DBus = imports.dbus;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const Extension = imports.ui.extensionSystem.extensions[EXTENSION_DIR];
const ConnmanDbus = Extension.connmanDbus;
const Service = Extension.service;
const Translate = Extension.translate;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ModalDialog = imports.ui.modalDialog;
const ShellEntry = imports.ui.shellEntry;

const AgentField = {
    NAME:       'Name',
    SSID:       'SSID',
    IDENTITY:   'Identity',
    PASSPHRASE: 'Passphrase',
    WPS:        'WPS',
    USERNAME:   'Username',
    PASSWORD:   'Password',
};

function RequestInputDialog() {
    this._init.apply(this, arguments);
}

RequestInputDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(service, fields) {
        ModalDialog.ModalDialog.prototype._init.call(this,
                                            { styleClass: 'polkit-dialog' });
        this._reply = {};
        this._entries = {};
        this._fields = fields;

        let mainContentBox = new St.BoxLayout({ vertical: false,
                                    style_class: 'polkit-dialog-main-layout' });
        this.contentLayout.add(mainContentBox,
                               { x_fill: true,
                                 y_fill: true });

        let icon = new St.Icon({ icon_name: 'dialog-password' });

        mainContentBox.add(icon,
                           { x_fill:  true,
                             y_fill:  false,
                             x_align: St.Align.END,
                             y_align: St.Align.START });

        let messageBox = new St.BoxLayout({ vertical: true,
                                style_class: 'polkit-dialog-message-layout' });
        mainContentBox.add(messageBox,
                           { y_align: St.Align.START });

        this._subjectLabel = new St.Label({ text: Translate.AUTH_REQ_MSG,
                                    style_class: 'polkit-dialog-headline' });

        messageBox.add(this._subjectLabel,
                       { y_fill:  false,
                         y_align: St.Align.START });

        for (let field in fields) {
            let element = this._createEntry(field, fields[field]);
            if (element != null)
                this.contentLayout.add(element,
                       { x_fill:  true,
                         y_fill:  true,
                         y_align: St.Align.START,
                         y_align: St.Align.START });
        }

        this._errorMsgLabel = new St.Label({
                                    style_class: 'polkit-dialog-error-label' });
        this._errorMsgLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._errorMsgLabel.clutter_text.line_wrap = true;
        messageBox.add(this._errorMsgLabel);
        this._errorMsgLabel.hide();

        this._infoMsgLabel = new St.Label({
                                    style_class: 'polkit-dialog-info-label' });
        this._infoMsgLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._infoMsgLabel.clutter_text.line_wrap = true;
        messageBox.add(this._infoMsgLabel);
        this._infoMsgLabel.hide();

        this.setButtons([{ label: Translate.ACCEPT,
                           action: Lang.bind(this, this._onAcceptButtonPressed),
                           key:    Clutter.KEY_Return
                         },
                         { label:  Translate.CANCEL,
                           action: Lang.bind(this, this.cancel),
                           key:    Clutter.Escape
                         }]);

        this._doneEmitted = false;
    },

    _translate: function(field) {
        switch(field) {
        case AgentField.PASSPHRASE:
            return Translate.PASSPHRASE;
        case AgentField.NAME:
            return Translate.NAME;
        case AgentField.IDENTITY:
            return Translate.IDENTITY;
        case AgentField.USERNAME:
            return Translate.USERNAME;
        case AgentField.PASSWORD:
            return Translate.PASSWORD;
        default:
            return field;
        }
    },

    _createEntry: function(field, value) {
        if (field in this._entries)
            return null;

        let box = new St.BoxLayout({ style_class: 'polkit-dialog-message-layout',
                                                            vertical: false });

        let label = new St.Label(({ style_class: 'polkit-dialog-password-label',
                                    text: this._translate(field) }));

        this._entries[field] = new St.Entry({ text: '',
                                   style_class: 'polkit-dialog-password-entry',
                                   can_focus: true,
                                   reactive: true });

        if (field == AgentField.PASSPHRASE || field == AgentField.PASSWORD)
            ShellEntry.addContextMenu(this._entries[field],
                                    { isPassword: true });

        this._entries[field].clutter_text.connect('activate',
                                        Lang.bind(this, this._hideError));
        this._entries[field].clutter_text.connect('cursor-event',
                                        Lang.bind(this, this._hideError));
        box.add(label);
        box.add(this._entries[field], {expand: true });

        return box;
    },

    _hideError: function() {
        /* When the user responds, dismiss already */
        /* shown error texts (if any) */
        this._errorMsgLabel.hide();
    },

    _showError: function(msg) {
        this._errorMsgLabel.set_text(msg);
        this._errorMsgLabel.show();
    },

    _getRequeriment: function(field) {
        let arguments = this._fields[field];

        if (!('Requirement' in arguments))
            return 'undefined';

        return arguments['Requirement'];
    },

    _processMandatory: function(field) {
        let value = this._entries[field].get_text();

        if (value) {
            this._reply[field] = value;
            return true;
        }

        let arguments = this._fields[field];
        if (!('Alternates' in arguments)) {
            /* This mandatory field hasn't got alternates */
            this._showError(this._translate(field) + ' ' +
                                                        Translate.IS_MANDATORY);
            return false;
        }

        /* Check for a valid alternate field */
        let alternates = arguments['Alternates'];
        for (let i = 0, len = alternates.length; i < len; i++) {
            let alt = alternates[i];
            if (alt in this._entries && this._entries[alt].get_text()) {
                this._reply[alt] = this._entries[alt].get_text();
                return true;
            }
        }

        this._showError(this._translate(field) + ' ' + Translate.IS_MANDATORY);
        return false;
    },

    _processOptional: function(field) {
        let value = this._entries[field].get_text();

        if (value)
            this._reply[field] = value;
    },

    _processEntries: function() {
        for (let field in this._entries) {
            let req = this._getRequeriment(field);
            switch (req) {
            case 'mandatory':
                if (!this._processMandatory(field))
                    return false;
                break;
            case 'optional':
                this._processOptional(field);
                break;
            case 'alternate':
                /* Ignored. Alternate values are set in the reply */
                /* only when a mandatory field requires it */
                break;
            default:
                global.log('agent: Unexpected requeriment: ' + req);
                break;
            }
        }

        return true;
    },

    _emitDone: function(canceled) {
        if (!this._doneEmitted) {
            this._doneEmitted = true;
            this.emit('done', canceled, this._reply);
        }
    },

    _onAcceptButtonPressed: function() {
        if (this._processEntries())
            this._emitDone(false);
    },

    cancel: function() {
        this._emitDone(true);
    }
};

Signals.addSignalMethods(RequestInputDialog.prototype);

function AgentErrorReporter() {
    this._init.apply(this, arguments);
}

AgentErrorReporter.prototype = {
    __proto__: MessageTray.Notification.prototype,

    _init: function(source, service, error, callback) {
        MessageTray.Notification.prototype._init.call(this, source,
                                          Translate.CONNECTION_MANAGER,
                                          service.Name ? service.Name : null);
        this._callback = callback;

        this.addBody(Translate.NETWORK_ERROR + ': ' + error);

        this.addButton('retry', Translate.RETRY);
        this.setUrgency(MessageTray.Urgency.HIGH);
        this.setTransient(true);

        this.connect('action-invoked', Lang.bind(this, function(self, action) {
            if (action != 'retry')
                return;

            this._callback = null;

            /* FIXE: This exception is not being thrown */
            /* into the callback context */
            throw new DBus.DBusError(ConnmanDbus.AGENT_ERROR_RETRY, 'Retry');
        }));
    },

    destroy: function() {
        if (this._callback != null) {
            this._callback();
            this._callback = null;
        }

        MessageTray.Notification.prototype.destroy.call(this);
    }
};

function AgentTraySource() {
    this._init();
}

AgentTraySource.prototype = {
    __proto__: MessageTray.Source.prototype,

    _init: function() {
        MessageTray.Source.prototype._init.call(this,
                                                Translate.CONNECTION_MANAGER);

        let icon = new St.Icon({ icon_name: 'network-transmit-receive',
                                 icon_type: St.IconType.SYMBOLIC,
                                 icon_size: this.ICON_SIZE
                               });
        this._setSummaryIcon(icon);
    },

    createNotificationIcon: function() {
        return new St.Icon({ icon_name: 'network-error',
                             icon_type: St.IconType.SYMBOLIC,
                             icon_size: this.ICON_SIZE });
    }
};

function Agent() {
    this._init.apply(this, arguments);
}

Agent.prototype = {
    _init: function(callback) {
        DBus.system.exportObject(ConnmanDbus.AGENT_PATH, this);
        this._getService_cb = callback;
    },

    _onDialogDone: function(dialog, canceled, reply, callback) {
        this._inputDialog.close(global.get_current_time());
        this._inputDialog.destroy();
        this._inputDialog = null;

        if (canceled) {
            /* FIXE: This exception is not being thrown */
            /* into the callback context */
            throw new DBus.DBusError(ConnmanDbus.AGENT_ERROR_CANCELED,
                                                        'Connection canceled');
        }

        callback(reply);
    },

    _ensureSource: function() {
        if (!this._source) {
            this._source = new AgentTraySource();
            this._source.connect('destroy', Lang.bind(this, function() {
                this._source = null;
            }));
            Main.messageTray.add(this._source);
        }
    },

    Release: function() {
        global.log('TODO: Release');
    },

    ReportErrorAsync: function(svcPath, error, callback) {
        let service = this._getService_cb(svcPath);

        if (service == null) {
            callback();
            return;
        }

        this._ensureSource();

        if (this._notification)
            this._notification.destroy();

        this._notification = new AgentErrorReporter(this._source, service,
                                                            error, callback);
        this._source.notify(this._notification);
    },

    RequestBrowser: function() {
        global.log('TODO: RequestBrowser');
    },

    RequestInputAsync: function(svcPath, fields, callback) {
        let service = this._getService_cb(svcPath);

        if (service == null)
            throw new DBus.DBusError(ConnmanDbus.AGENT_ERROR_CANCELED,
                                                'Unmanaged service' + svcPath);

        this._inputDialog = new RequestInputDialog(service, fields);
        this._inputDialog.connect('done', Lang.bind(this, this._onDialogDone,
                                                                    callback));
        this._inputDialog.open();
    },

    Cancel: function() {
        global.log('TODO: Cancel');
    }
};

DBus.conformExport(Agent.prototype, ConnmanDbus.ConnmanAgent);
