# -*- coding: utf-8 -*-
# Copyright (C) 2019 Jeff VanOss <vanossj@gmail.com>
#
# Basic plugin template created by the Deluge Team.
#
# This file is part of test_plugin and is licensed under GNU GPL 3.0, or later,
# with the additional special exception to link portions of this program with
# the OpenSSL library. See LICENSE for more details.


import logging

from gi.repository import Gtk

import deluge.component as component
from deluge.plugins.pluginbase import Gtk3PluginBase
from deluge.ui.client import client

try:
    from deluge.ui.gtk3.listview import cell_data_time
except ImportError:
    from deluge.ui.gtk3.torrentview_data_funcs import cell_data_time

from .common import get_resource

log = logging.getLogger(__name__)


class Gtk3UI(Gtk3PluginBase):
    def enable(self):
        self.builder = Gtk.Builder()
        self.builder.add_from_file(get_resource("config.ui"))

        component.get("Preferences").add_page(
            "SeedTime", self.builder.get_object("prefs_box")
        )
        component.get("PluginManager").register_hook(
            "on_apply_prefs", self.on_apply_prefs
        )
        component.get("PluginManager").register_hook(
            "on_show_prefs", self.on_show_prefs
        )
        # Columns
        torrentview = component.get("TorrentView")
        torrentview.add_func_column(
            _("Seed Time"), cell_data_time, [int], status_field=["seeding_time"]
        )
        torrentview.add_func_column(
            _("Stop Seed Time"), cell_data_time, [int], status_field=["seed_stop_time"]
        )
        torrentview.add_func_column(
            _("Remaining Seed Time"),
            cell_data_time,
            [int],
            status_field=["seed_time_remaining"],
        )
        # Submenu
        log.debug("add items to torrentview-popup menu.")
        torrentmenu = component.get("MenuBar").torrentmenu
        self.seedtime_menu = SeedTimeMenu()
        torrentmenu.append(self.seedtime_menu)
        self.seedtime_menu.show_all()

        # Build Preference filter table
        self.setupFilterTable()

    def setupFilterTable(self):
        # Setup filter button callbacks
        self.btnAdd = self.builder.get_object("btnAdd")
        self.btnAdd.connect("clicked", self.btnAddCallback)
        self.btnRemove = self.builder.get_object("btnRemove")
        self.btnRemove.connect("clicked", self.btnRemoveCallback)
        self.btnUp = self.builder.get_object("btnUp")
        self.btnUp.connect("clicked", self.btnUpCallback)
        self.btnDown = self.builder.get_object("btnDown")
        self.btnDown.connect("clicked", self.btnDownCallback)

        # cell by cell renderer callback, changes field and filter to editable
        def rowRendererCb(column, cell, model, row, data):
            cell.set_property("editable", True)

        # creating the treeview,and add columns
        self.treeview = Gtk.TreeView()

        # setup Field column
        liststore_field = Gtk.ListStore(str)
        for item in ["tracker", "label"]:
            liststore_field.append([item])
        renderer = Gtk.CellRendererCombo()
        renderer.set_property("editable", True)
        renderer.set_property("model", liststore_field)
        renderer.set_property("text-column", 0)
        renderer.set_property("has-entry", False)
        renderer.connect("edited", self.on_field_changed)
        column = Gtk.TreeViewColumn("Field", renderer, text=0)
        column.set_cell_data_func(renderer, rowRendererCb)
        label = Gtk.Label("Field")
        column.set_widget(label)
        label.set_tooltip_text("Torrent Field to filter.")
        label.show()
        self.treeview.append_column(column)

        # setup Filter column
        renderer = Gtk.CellRendererText()
        renderer.set_property("editable", True)
        renderer.connect("edited", self.on_filter_changed)
        column = Gtk.TreeViewColumn("Filter", renderer, text=1)
        column.set_cell_data_func(renderer, rowRendererCb)
        label = Gtk.Label("Filter")
        column.set_widget(label)
        label.set_tooltip_text("RegEx filter to apply to Field")
        label.show()

        self.treeview.append_column(column)

        # setup stop time column
        renderer = Gtk.CellRendererSpin()
        renderer.connect("edited", self.on_stoptime_edited)
        renderer.set_property("editable", True)
        adjustment = Gtk.Adjustment(0, 0, 100, 1, 10, 0)
        renderer.set_property("adjustment", adjustment)
        column = Gtk.TreeViewColumn("Stop Seed Time (days)", renderer, text=2)
        label = Gtk.Label("Stop Seed Time (days)")
        column.set_widget(label)
        label.set_tooltip_text(
            "Set the amount of time a torrent seeds for "
            "before being stopped. Default value is editable"
        )
        label.show()
        self.treeview.append_column(column)

        self.sw1 = self.builder.get_object("scrolledwindow1")
        self.sw1.add(self.treeview)
        self.sw1.show_all()

    def disable(self):
        component.get("Preferences").remove_page("SeedTime")
        component.get("PluginManager").deregister_hook(
            "on_apply_prefs", self.on_apply_prefs
        )
        component.get("PluginManager").deregister_hook(
            "on_show_prefs", self.on_show_prefs
        )
        try:
            # Columns
            component.get("TorrentView").remove_column(_("Seed Time"))
            component.get("TorrentView").remove_column(_("Stop Seed Time"))
            component.get("TorrentView").remove_column(_("Remaining Seed Time"))
            # Submenu
            torrentmenu = component.get("MenuBar").torrentmenu
            torrentmenu.remove(self.seedtime_menu)
        except Exception as e:
            log.debug(e)

    def on_apply_prefs(self):
        log.debug("applying prefs for SeedTime")

        config = {
            "remove_torrent": self.builder.get_object(
                "chk_remove_torrent"
            ).get_active(),
            "filter_list": list(
                {"field": row[0], "filter": row[1], "stop_time": row[2]}
                for row in self.liststore
            ),
            "delay_time": self.builder.get_object("delay_time").get_value_as_int(),
            "default_stop_time": self.builder.get_object(
                "default_stop_time"
            ).get_value(),
        }
        client.seedtime.set_config(config)

    def on_show_prefs(self):
        client.seedtime.get_config().addCallback(self.cb_get_config)

    def cb_get_config(self, config):
        """callback for on show_prefs"""
        log.debug("cb get config seedtime")
        self.builder.get_object("chk_remove_torrent").set_active(
            config["remove_torrent"]
        )
        self.builder.get_object("delay_time").set_value(config["delay_time"])
        self.builder.get_object("default_stop_time").set_value(
            config["default_stop_time"]
        )

        # populate filter table
        self.liststore = Gtk.ListStore(str, str, float)
        for filter_ref in config["filter_list"]:
            self.liststore.append(
                [filter_ref["field"], filter_ref["filter"], filter_ref["stop_time"]]
            )

        self.treeview.set_model(self.liststore)

    def on_field_changed(self, widget, path, text):
        self.liststore[path][0] = text

    def on_filter_changed(self, widget, path, text):
        self.liststore[path][1] = text

    def on_stoptime_edited(self, widget, path, value):
        self.liststore[path][2] = float(value)

    def btnAddCallback(self, widget):
        self.liststore.prepend(["label", "RegEx", 3.0])

    def btnRemoveCallback(self, widget):
        selection = self.treeview.get_selection()
        model, paths = selection.get_selected_rows()

        # Get the TreeIter instance for each path
        for path in paths:
            itr = model.get_iter(path)
            model.remove(itr)

    def btnUpCallback(self, widget):
        selection = self.treeview.get_selection()
        model, paths = selection.get_selected_rows()

        for path in paths:
            itr = model.get_iter(path)
            if path[0] > 0:
                previousRow = model.get_iter(path[0] - 1)
                model.move_before(itr, previousRow)

    def btnDownCallback(self, widget):
        selection = self.treeview.get_selection()
        model, paths = selection.get_selected_rows()

        for path in paths:
            itr = model.get_iter(path)
            if path[0] < len(model) - 1:
                nextRow = model.get_iter(path[0] + 1)
                model.move_after(itr, nextRow)


class SeedTimeMenu(Gtk.MenuItem):
    def __init__(self):
        Gtk.MenuItem.__init__(self, "Seed Stop Time")

        self.sub_menu = Gtk.Menu()
        self.set_submenu(self.sub_menu)
        self.items = []

        # attach..
        self.sub_menu.connect("show", self.on_show, None)

    def get_torrent_ids(self):
        return component.get("TorrentView").get_selected_torrents()

    def on_show(self, widget=None, data=None):
        try:
            for child in self.sub_menu.get_children():
                self.sub_menu.remove(child)
            # TODO: Make thise times customizable, and/or add a custom popup
            for time in (None, 1, 2, 3, 7, 14, 30):
                if time is None:
                    item = Gtk.MenuItem("Never")
                else:
                    item = Gtk.MenuItem(str(time) + " days")
                item.connect("activate", self.on_select_time, time)
                self.sub_menu.append(item)
            item = Gtk.MenuItem("Custom")
            item.connect("activate", self.on_custom_time)
            self.sub_menu.append(item)
            self.show_all()
        except Exception as e:
            log.exception("AHH!")

    def on_select_time(self, widget=None, time=None):
        log.debug("select seed stop time:%s,%s" % (time, self.get_torrent_ids()))
        for torrent_id in self.get_torrent_ids():
            client.seedtime.set_torrent(torrent_id, time)

    def on_custom_time(self, widget=None):
        # Show the custom time dialog
        builder = Gtk.Builder()
        builder.add_from_file(get_resource("dialog.ui"))
        dlg = builder.get_object("dlg_custom_time")
        result = dlg.run()
        if result == Gtk.RESPONSE_OK:
            time = builder.get_object("txt_custom_stop_time").get_text()
            try:
                self.on_select_time(time=float(time))
            except ValueError:
                log.error("Invalid custom stop time entered.")
        dlg.destroy()
