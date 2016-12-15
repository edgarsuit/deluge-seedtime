/*
Script: seedtime.js
    The client-side javascript code for the SeedTime plugin.

Copyright:
    (C) Chase Sterling 2009 <chase.sterling@gmail.com>
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 3, or (at your option)
    any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, write to:
        The Free Software Foundation, Inc.,
        51 Franklin Street, Fifth Floor
        Boston, MA  02110-1301, USA.

    In addition, as a special exception, the copyright holders give
    permission to link the code of portions of this program with the OpenSSL
    library.
    You must obey the GNU General Public License in all respects for all of
    the code used other than OpenSSL. If you modify file(s) with this
    exception, you may extend this exception to your version of the file(s),
    but you are not obligated to do so. If you do not wish to do so, delete
    this exception statement from your version. If you delete this exception
    statement from all source files in the program, then also delete it here.
*/

Ext.ns('Deluge.ux');

Ext.ns('Deluge.ux.preferences');

Deluge.ux.preferences.SeedTimePage = Ext.extend(Ext.Panel, {

    border: false,
    title: _('SeedTime'),
    header: false,
    layout: 'fit',

    initComponent: function() {
        Deluge.ux.preferences.SeedTimePage.superclass.initComponent.call(this);

        this.form = this.add({
            xtype: 'form',
            layout: 'form',
            border: false,
            autoHeight: true
        });

        // this.schedule = this.form.add(new Deluge.ux.ScheduleSelector());

        this.settings = this.form.add({
          xtype : 'fieldset',
          border : false,
          title : _('Settings'),
          autoHeight : true,
          defaultType : 'spinnerfield',
          defaults : {minValue : -1, maxValue : 99999},
          style : 'margin-top: 5px; margin-bottom: 0px; padding-bottom: 0px;',
          labelWidth : 200,
          items : [
            {
              xtype : "checkbox",
              fieldLabel : 'Remove torrent when stopping',
              name : 'chk_remove_torrent',
              checked : true,
              id : 'rm_torrent_checkbox'
            },
            {
              fieldLabel : _('Delay (seconds)'),
              name : 'delay_time',
              width : 80,
              value : 30,
              minValue : 1,
              maxValue : 300,
              decimalPrecision : 0,
              id : 'torrent_delay'
            }
          ]
        });

        this.filter_list = new Ext.grid.GridPanel({
            store: new Ext.data.ArrayStore({
                fields: [
                    {name: 'field', type: 'string'},
                    {name: 'filter', type: 'string'},
                    {name: 'stoptime', type: 'float'}
                ],
                id: 0
            }),
            colModel: new Ext.grid.ColumnModel({
                defaults: {
                    sortable: false,
                    menuDisabled: true
                },
                columns: [{
                    header: _('Field'),
                    width: .24,
                    dataIndex: 'field'
                }, {
                    header: _('Filter'),
                    width: .50,
                    dataIndex: 'filter'
                }, {
                    header: _('Stop Seed Time (days)'),
                    width: .26,
                    renderer: Ext.util.Format.number,
                    dataIndex: 'stoptime'
                }]
            }),
            viewConfig: {
                forceFit: true,
            },
            sm: new Ext.grid.RowSelectionModel({singleSelect:true}),
        });

        this.add(this.filter_list)

        this.removeWhenStopped = this.settings.items.get("rm_torrent_checkbox");
        this.delayTime = this.settings.items.get("torrent_delay");

        this.on('show', this.updateConfig, this);
    },

    onRender: function(ct, position) {
        Deluge.ux.preferences.SeedTimePage.superclass.onRender.call(this, ct, position);
        this.form.layout = new Ext.layout.FormLayout();
        this.form.layout.setContainer(this);
        this.form.doLayout();
    },

    onApply: function() {
        // build settings object
        var config = {};

        config['remove_torrent'] = this.removeWhenStopped.getValue();
        // config['filter_list'] = [];//this.store.data;
        config['delay_time'] = this.delayTime.getValue();

        console.log(config);

        deluge.client.seedtime.set_config(this.initial_config);
    },

    onOk: function() {
        this.onApply();
    },

    updateConfig: function() {
        deluge.client.seedtime.get_config({
            success: function(config) {
                this.initial_config = config
                this.removeWhenStopped.setValue(config['remove_torrent']);
                // this.store.data = config['filter_list'];
                this.delayTime.setValue(config['delay_time']);
            },
            scope: this
        });
    }
});

SeedTimePlugin = Ext.extend(Deluge.Plugin, {

    name: 'SeedTime',

    onDisable: function() {
        deluge.preferences.removePage(this.prefsPage);
    },

    onEnable: function() {
        this.prefsPage = deluge.preferences.addPage(new Deluge.ux.preferences.SeedTimePage());
    }
});
Deluge.registerPlugin('SeedTime', SeedTimePlugin);
