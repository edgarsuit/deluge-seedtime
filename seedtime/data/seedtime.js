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

// TODO: edit item in grid
// TODO: make sure default editing is handled correctly
// TODO: load data to grid
// TODO: save data from grid
// TODO: make sure stoptime coloumn is rendered as number
// TODO: add min/max to stop time coloumn
// TODO: fix layout, grid not expanding
// TODO: grid drag and drop, http://docs.sencha.com/extjs/4.0.7/#!/example/dd/dnd_grid_to_grid.html
// TODO: layout, move buttons?
// TODO: clean up: fix code formatting
// TODO: clean up: probably lots of unneeded code

Ext.ns('Deluge.ux');

Ext.ns('Deluge.ux.preferences');

Deluge.ux.preferences.SeedTimePage = Ext.extend(Ext.Panel, {

    border: false,
    title: _('SeedTime'),
    header: false,
    layout: 'fit',

    initComponent: function() {
        Deluge.ux.preferences.SeedTimePage.superclass.initComponent.call(this);

        // this.vbox = this.add({
        //     xtype: 'container',
        //     layout: 'vbox',
        //     defaultType: 'button'
        //   });

        this.form = this.add({
            xtype: 'form',
            layout: 'form',
            border: false,
            // autoHeight: true
        });

        this.settings = this.form.add({
          xtype : 'fieldset',
          border : false,
          title : _('Settings'),
          // autoHeight : true,
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
          autoHeight : true,
          // autoScroll: true,
          store : new Ext.data.JsonStore({
            fields : [
              {name : 'field', type : 'string'},
              {name : 'filter', type : 'string'},
              {name : 'stoptime', type : 'float'},
            ],
            id : 0
          }),
          colModel : new Ext.grid.ColumnModel({
            defaults : {sortable : false, menuDisabled : true},
            columns : [
              {
                header : 'Field',
                width : .24,
                sortable : false,
                dataIndex : 'field',
                renderer : function(val) {
                  if (val === "default") {
                      return 'default';
                  }
                  else if (val === "label") {
                      return '<select><option value="label" selected="selected">label</option><option value="tracker">tracker</option></select>';
                  }
                  else {
                      return '<select><option value="label">label</option><option value="tracker" selected="selected">tracker</option></select>';
                  }
                },
              },
              {header : 'Filter', width : .50, dataIndex : 'filter'},
              {header : 'Stop Seed Time (days)',
                width : .26,
                // renderer : Ext.util.Format.number,
                dataIndex : 'stoptime'
              },
            ]
          }),
          flex: 1,
          viewConfig : {
            forceFit : true,
              // plugins: {
              //     ptype: 'Ext.dd.gridviewdragdrop',
              //     // ptype: 'gridviewdragdrop',
              //     dragGroup: 'firstGridDDGroup',
              //     dropGroup: 'firstGridDDGroup'
              // },
              // listeners: {
              //     drop: function(node, data, dropRec, dropPosition) {
              //         var dropOn = dropRec ? ' ' + dropPosition + ' ' + dropRec.get('name') : ' on empty view';
              //         console.log("Drag from right to left", 'Dropped ' + data.records[0].get('name') + dropOn);
              //     }
              // }
          },
          selModel : new Ext.grid.RowSelectionModel({singleSelect : true}),
        });

        this.filter_list.getStore().loadData( [
            { field : "label", filter : "a.*sdf", stoptime : 1.5},
            { field : "tracker", filter : "b.*sdf", stoptime : 2.5},
            { field : "label", filter : "c.*sdf", stoptime : 3.5},
            { field : "label", filter : "d.*sdf", stoptime : 4.5},
            { field : "default", filter : ".*", stoptime : 5.5} ] );

        this.filter_list.addButton({text:"Up"},this.filterUp, this);
        this.filter_list.addButton({text:"Down"},this.filterDown, this);
        this.filter_list.addButton({text:"Add"},this.filterAdd, this);
        this.filter_list.addButton({text:"Remove"},this.filterRemove, this);
        this.form.add(this.filter_list);

        this.removeWhenStopped = this.settings.items.get("rm_torrent_checkbox");
        this.delayTime = this.settings.items.get("torrent_delay");
        this.on('show', this.updateConfig, this);
    },

    filterUp: function() {
        var store = this.filter_list.getStore();
        var sm = this.filter_list.getSelectionModel();
        var selected_rec = sm.getSelected();
        var selected_indx = store.indexOf(selected_rec);

        if (selected_indx > 0 && selected_indx < store.getCount()-1 ) {
          store.remove(selected_rec);
          store.insert(selected_indx-1, selected_rec);
          sm.selectRow(selected_indx-1);
        }
    },

    filterDown: function() {
        var store = this.filter_list.getStore();
        var sm = this.filter_list.getSelectionModel();
        var selected_rec = sm.getSelected();
        var selected_indx = store.indexOf(selected_rec);

        if (selected_indx < store.getCount()-2 ) {
          store.remove(selected_rec);
          store.insert(selected_indx+1, selected_rec);
          sm.selectRow(selected_indx+1);
        }
    },

    filterAdd: function() {
        var store = this.filter_list.getStore();
        store.insert(0, new store.recordType({ field : "tracker", filter : ".*", stoptime : 1.0}));
    },

    filterRemove: function() {
      var store = this.filter_list.getStore();
        var store = this.filter_list.getStore();
        var sm = this.filter_list.getSelectionModel();
        var selected_rec = sm.getSelected();
        var selected_indx = store.indexOf(selected_rec);

        if (selected_indx < store.getCount()-1 ) {
          store.remove(selected_rec);
        }
    },

    onRender: function(ct, position) {
        Deluge.ux.preferences.SeedTimePage.superclass.onRender.call(this, ct, position);
        this.form.layout = new Ext.layout.FormLayout();
        this.form.layout.setContainer(this);
        this.form.doLayout();
        // this.vbox.doLayout();
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
