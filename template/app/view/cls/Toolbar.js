/**
 * Toolbar with menus providing quick access to class members.
 */
Ext.define('Docs.view.cls.Toolbar', {
    extend: 'Ext.toolbar.Toolbar',
    requires: [
        'Docs.view.HoverMenuButton',
        'Docs.Settings',
        'Ext.form.field.Checkbox'
    ],

    dock: 'top',
    cls: 'member-links',
    padding: '3 5',
    style: 'border-width: 1px 1px 1px 1px !important;',

    /**
     * @cfg {Object} docClass
     * Documentation for a class.
     */
    docClass: {},

    /**
     * @cfg {Object} accessors
     * Accessors map from Overview component.
     */
    accessors: {},

    initComponent: function() {
        this.addEvents(
            /**
             * @event buttonclick
             * Fired when one of the toolbar HoverMenuButtons is clicked.
             * @param {String} type Type of button that was clicked "cfg", "method", "event", etc
             */
            "menubuttonclick",
            /**
             * @event filter
             * Fires when text typed to filter, or one of the hide-checkboxes clicked.
             * @param {String} search  The search text.
             * @param {Object} show  Flags which members to show:
             * @param {Boolean} show.public
             * @param {Boolean} show.protected
             * @param {Boolean} show.private
             * @param {Boolean} show.inherited
             * @param {Boolean} show.accessor
             */
            "filter",
            /**
             * @event toggleExpanded
             * Fires expandAll/collapseAll buttons clicked.
             * @param {Boolean} expand  True to expand all, false to collapse all.
             */
            "toggleExpanded"
        );

        this.items = [];
        this.memberButtons = {};

        var memberTitles = {
            cfg: "Configs",
            property: "Properties",
            method: "Methods",
            event: "Events",
            css_var: "CSS Vars",
            css_mixin: "CSS Mixins"
        };
        for (var type in memberTitles) {
            // combine both static and instance members into one alphabetically sorted array
            var members = this.docClass.members[type].concat(this.docClass.statics[type]);
            members.sort(function(a, b) {
                return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
            });
            if (members.length > 0) {
                var btn = this.createMemberButton({
                    text: memberTitles[type],
                    type: type,
                    members: members
                });
                this.memberButtons[type] = btn;
                this.items.push(btn);
            }
        }

        this.checkItems = {
            "public": this.createCb("Public", "public"),
            "protected": this.createCb("Protected", "protected"),
            "private": this.createCb("Private", "private"),
            "inherited": this.createCb("Inherited", "inherited"),
            "accessor": this.createCb("Accessor", "accessor"),
            "deprecated": this.createCb("Deprecated", "deprecated"),
            "removed": this.createCb("Removed", "removed")
        };

        var self = this;
        this.items = this.items.concat([
            { xtype: 'tbfill' },
            this.filterField = Ext.widget("triggerfield", {
                triggerCls: 'reset',
                cls: 'member-filter',
                hideTrigger: true,
                emptyText: 'Filter class members',
                enableKeyEvents: true,
                listeners: {
                    keyup: function(cmp) {
                        this.fireEvent("filter", cmp.getValue(), this.getShowFlags());
                        cmp.setHideTrigger(cmp.getValue().length === 0);
                    },
                    specialkey: function(cmp, event) {
                        if (event.keyCode === Ext.EventObject.ESC) {
                            cmp.reset();
                            this.fireEvent("filter", "", this.getShowFlags());
                        }
                    },
                    scope: this
                },
                onTriggerClick: function() {
                    this.reset();
                    this.focus();
                    self.fireEvent('filter', '', self.getShowFlags());
                    this.setHideTrigger(true);
                }
            }),
            { xtype: 'tbspacer', width: 10 },
            {
                xtype: 'button',
                text: 'Show',
                menu: [
                    this.checkItems['public'],
                    this.checkItems['protected'],
                    this.checkItems['private'],
                    '-',
                    this.checkItems['inherited'],
                    this.checkItems['accessor'],
                    this.checkItems['deprecated'],
                    this.checkItems['removed']
                ]
            },
            {
                xtype: 'button',
                iconCls: 'expand-all-members',
                tooltip: "Expand all",
                enableToggle: true,
                toggleHandler: function(btn, pressed) {
                    btn.setIconCls(pressed ? 'collapse-all-members' : 'expand-all-members');
                    this.fireEvent("toggleExpanded", pressed);
                },
                scope: this
            }
        ]);

        this.callParent(arguments);
    },

    getShowFlags: function() {
        var flags = {};
        for (var i in this.checkItems) {
            flags[i] = this.checkItems[i].checked;
        }
        return flags;
    },

    createCb: function(text, type) {
        return Ext.widget('menucheckitem', {
            text: text,
            checked: Docs.Settings.get("show")[type],
            listeners: {
                checkchange: function() {
                    this.fireEvent("filter", this.filterField.getValue(), this.getShowFlags());
                },
                scope: this
            }
        });
    },

    createMemberButton: function(cfg) {
        var data = Ext.Array.map(cfg.members, function(m) {
            return this.createLinkRecord(this.docClass.name, m);
        }, this);

        return Ext.create('Docs.view.HoverMenuButton', {
            text: cfg.text,
            cls: 'icon-'+cfg.type,
            store: this.createStore(data),
            showCount: true,
            listeners: {
                click: function() {
                    this.fireEvent('menubuttonclick', cfg.type);
                },
                scope: this
            }
        });
    },

    // creates store tha holds link records
    createStore: function(records) {
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'url', 'label', 'inherited', 'accessor', 'meta']
        });
        store.add(records);
        return store;
    },

    // Creates link object referencing a class member
    createLinkRecord: function(cls, member) {
        return {
            url: cls + "-" + member.id,
            label: (member.tagname === "method" && member.name === "constructor") ? "new "+cls : member.name,
            inherited: member.owner !== cls,
            accessor: member.tagname === "method" && this.accessors.hasOwnProperty(member.name),
            meta: member.meta
        };
    },

    /**
     * Show or hides members in dropdown menus.
     * @param {Object} show
     * @param {Boolean} isSearch
     * @param {RegExp} re
     */
    showMenuItems: function(show, isSearch, re) {
        Ext.Array.forEach(['cfg', 'property', 'method', 'event'], function(type) {
            if (this.memberButtons[type]) {
                var store = this.memberButtons[type].getStore();
                store.filterBy(function(m) {
                    return !(
                        !show['public']    && !(m.get("meta")["private"] || m.get("meta")["protected"]) ||
                        !show['protected'] && m.get("meta")["protected"] ||
                        !show['private']   && m.get("meta")["private"] ||
                        !show['inherited'] && m.get("inherited") ||
                        !show['accessor']  && m.get("accessor") ||
                        !show['deprecated']   && m.get("meta")["deprecated"] ||
                        !show['removed']   && m.get("meta")["removed"] ||
                        isSearch           && !re.test(m.get("label"))
                    );
                });
            }
        }, this);
    },

    /**
     * Returns the current text in filter field.
     * @return {String}
     */
    getFilterValue: function() {
        return this.filterField.getValue();
    }
});
