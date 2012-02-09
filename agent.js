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

function RequestInputDialog() {
    this._init.apply(this, arguments);
}

RequestInputDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(service, fields) {
        ModalDialog.ModalDialog.prototype._init.call(this,
                                            { styleClass: 'polkit-dialog' });

        let mainContentBox = new St.BoxLayout({ style_class: 'polkit-dialog-main-layout',
                                                vertical: false });
        this.contentLayout.add(mainContentBox,
                               { x_fill: true,
                                 y_fill: true });

        let icon = new St.Icon({ icon_name: 'dialog-password-symbolic' });

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

    _onEntryActivate: function() {
        let passphrase = this._passwordEntry.get_text();

        // When the user responds, dismiss already shown info and
        // error texts (if any)
        this._errorMessageLabel.hide();
        this._infoMessageLabel.hide();
    },

    _emitDone: function(dismissed) {
        if (!this._doneEmitted) {
            this._doneEmitted = true;
            this.emit('done', dismissed);
        }
    },

    _onAcceptButtonPressed: function() {
        this._onEntryActivate();
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

    _onDialogDone: function(dialog, dismissed) {
         this._inputDialog.close(global.get_current_time());
         this._inputDialog.destroy();
         this._inputDialog = null;
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

    RequestInput: function(svcPath, fields) {
        let service = this._getService_cb(svcPath);

        if (service == null) {
            global.log('No service found ' + svcPath);
            return null;
        }

        this._inputDialog = new RequestInputDialog(service, fields);
        this._inputDialog.connect('done', Lang.bind(this, this._onDialogDone));
        this._inputDialog.open();
        return null;
    },

    Cancel: function() {
        global.log('TODO: Cancel');
    }
};

DBus.conformExport(Agent.prototype, ConnmanDbus.ConnmanAgent);
