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

const FavoriteService = {
    CONNECTED: 'starred',
    DISCONNECTED: 'non-starred',
};

const NetworkStatus = {
    ERROR: 'network-error',
    IDLE: 'network-idle',
    OFFLINE: 'network-offline',
    RECV: 'network-receive',
    TRANS: 'network-transmit',
    TRANSRECV: 'network-transmit-receive'
};

const WifiSignal = {
    EXCELLENT: 'network-wireless-signal-excellent',
    GOOD: 'network-wireless-signal-good',
    OK: 'network-wireless-signal-ok',
    WEAK: 'network-wireless-signal-weak',
};

const BLUETOOTH = 'bluetooth-active-symbolic';
const Wired = 'network-wired';
const WIFI_ENCRYPTED = 'network-wireless-encrypted';
