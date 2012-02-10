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

        let mainContentBox = new St.BoxLayout({ style_class: 'polkit-dialog-main-layout',
                                                vertical: false });
        this.contentLayout.add(mainContentBox,
                               { x_fill: true,
                                 y_fill: true });

        let icon = new St.Icon({ icon_name: 'dialog-password' });

        mainContentBox.add(icon,
                           { x_fill:  true,
                             y_fill:  false,
                             x_align: St.Align.END,
                             y_align: St.Align.START });

        let messageBox = new St.BoxLayout({ style_class: 'polkit-dialog-message-layout',
                                            vertical: true });
        mainContentBox.add(messageBox,
                           { y_align: St.Align.START });

        this._subjectLabel = new St.Label({ style_class: 'polkit-dialog-headline',
                                            text: 'Authentication Required' });

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
/*
        this._descriptionLabel = new St.Label({ style_class: 'polkit-dialog-description',
                                                text: 'hola mundo' });
        this._descriptionLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._descriptionLabel.clutter_text.line_wrap = true;

        messageBox.add(this._descriptionLabel,
                       { y_fill:  true,
                         y_align: St.Align.START });

        this._passwordBox = new St.BoxLayout({ vertical: false });
        messageBox.add(this._passwordBox);
        this._passwordLabel = new St.Label(({ style_class: 'polkit-dialog-password-label' }));
        this._passwordBox.add(this._passwordLabel);
        this._passwordEntry = new St.Entry({ style_class: 'polkit-dialog-password-entry',
                                             text: '',
                                             can_focus: true});
        ShellEntry.addContextMenu(this._passwordEntry, { isPassword: true });
        this._passwordEntry.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivate));
        this._passwordBox.add(this._passwordEntry,
                              {expand: true });

        this.setInitialKeyFocus(this._passwordEntry);
        this._passwordBox.hide();
*/
        this._errorMessageLabel = new St.Label({ style_class: 'polkit-dialog-error-label' });
        this._errorMessageLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._errorMessageLabel.clutter_text.line_wrap = true;
        messageBox.add(this._errorMessageLabel);
        this._errorMessageLabel.hide();

        this._infoMessageLabel = new St.Label({ style_class: 'polkit-dialog-info-label' });
        this._infoMessageLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._infoMessageLabel.clutter_text.line_wrap = true;
        messageBox.add(this._infoMessageLabel);
        this._infoMessageLabel.hide();

        this.setButtons([{ label: 'Accept',
                           action: Lang.bind(this, this._onAcceptButtonPressed),
                           key:    Clutter.KEY_Return
                         },
                         { label:  'Cancel',
                           action: Lang.bind(this, this.cancel),
                           key:    Clutter.Escape
                         }]);

        this._doneEmitted = false;
    },

    _translate: function(field) {
        /* TODO: Set translatable */
        switch(field) {
        case AgentField.PASSPHRASE:
        case AgentField.NAME:
        case AgentField.IDENTITY:
        case AgentField.USERNAME:
        case AgentField.PASSWORD:
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
                                   can_focus: true});

        if (field == AgentField.PASSPHRASE || field == AgentField.PASSWORD)
            ShellEntry.addContextMenu(this._entries[field],
                                    { isPassword: true });

        box.add(label);
        box.add(this._entries[field], {expand: true });

        return box;
    },

    _showError: function(msg) {
        this._errorMessageLabel.set_text(msg);
        this._errorMessageLabel.show();
    },

    _getRequeriment: function(field) {
        let arguments = this._fields[field];

        if (!('Requirement' in arguments))
            return 'undefined';

        return arguments['Requirement'];
    },

    _processMandatory: function(field) {
        let value = this._reply[field];

        if (value != '')
            return true;

        let arguments = this._fields[field];
        if ('Alternates' in arguments) {
            /* The mandatory field is not provided but */
            /* we can still use an alternate one */
            delete this._reply[field];
            return true;
        }

        this._showError('Field ' + this._translate(field) + ' is mandatory');
        return false;
    },

    _processEntries: function() {
        for (let entry in this._entries)
            this._reply[entry] = this._entries[entry].get_text();

        /* Check user input */
        for (let field in this._reply) {
            let req = this._getRequeriment(field);

            switch (req) {
            case 'Mandatory':
                if (!this._processMandatory(field))
                    return false;
                break;
            case 'Optional':
            case 'Alternate':
            default:
                global.log('agent: Unexpected requeriment: ' + req);
                return false;
            }
        }

        // When the user responds, dismiss already shown info and
        // error texts (if any)
        //this._errorMessageLabel.hide();
        //this._infoMessageLabel.hide();
        return true;
    },

    _emitDone: function(dismissed) {
        if (!this._doneEmitted) {
            this._doneEmitted = true;
            this.emit('done', dismissed, this._reply);
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

function Agent() {
    this._init.apply(this, arguments);
};

Agent.prototype = {
    _init: function(callback) {
        DBus.system.exportObject(ConnmanDbus.AGENT_PATH, this);
        this._getService_cb = callback;
    },

    _onDialogDone: function(dialog, dismissed, reply, callback) {
         this._inputDialog.close(global.get_current_time());
         this._inputDialog.destroy();
         this._inputDialog = null;

         callback(reply);
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

    RequestInputAsync: function(svcPath, fields, callback) {
        let service = this._getService_cb(svcPath);

        if (service == null) {
            global.log('No service found ' + svcPath);
            /* TODO: regturn net.connman.Agent.Error.Canceled */
            return null;
        }

        this._inputDialog = new RequestInputDialog(service, fields);
        this._inputDialog.connect('done', Lang.bind(this, this._onDialogDone, callback));
        this._inputDialog.open();
    },

    Cancel: function() {
        global.log('TODO: Cancel');
    }
};

DBus.conformExport(Agent.prototype, ConnmanDbus.ConnmanAgent);
