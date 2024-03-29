/*

Ext Gantt Pro 4.2.7
Copyright(c) 2009-2016 Bryntum AB
http://bryntum.com/contact
http://bryntum.com/license

*/
Ext.define('Sch.patches.CollectionKey', {
    extend : 'Sch.util.Patch',

    target     : 'Ext.util.CollectionKey',

    minVersion : '6.0.0',

    maxVersion : '6.0.3', // Though by the time it out the issue reported might not be fixed yet.

    reportUrl  : 'https://www.sencha.com/forum/showthread.php?310532-Ext.util.Collection-key-configuration-application-and-cloning-is-broken',

    description : [
        'Ext.util.CollectionKey::clone() is broken due to wrong usage of Ext\'s configuration facility.',
        'We relay on the (though) private Ext.data.LocalStore::extraKeys configuration, we use it to define additional',
        'unique but complex keys for Assignment and Dependency stores. Upon store filtering such keys are being cloned',
        'but due to the broken config key\'s clone() method throws an exception'
    ].join(' '),

    applyFn : function() {
        var applyFn;

        applyFn = Ext.util.CollectionKey.prototype.applyKeyFn;
        Ext.util.CollectionKey.prototype.applyKeyFn = Ext.identityFn;
        Ext.util.CollectionKey.prototype.updateKeyFn = applyFn;
    }
});
