/**
 * Module dependencies.
 */
var debug = require('debug')('glint-plugin-wrap-i18n');
var c = require('glint-i18n/config');
var defaults = require('defaults');
var isBrowser = require('is-browser');

/**
 *  Wrap locale Plugin
 *
 * - adds `locale`, (alias: `setLocale`), and `getLocale` function to the wrap
 * - attaches `pre-load` and `pre-save` handlers to the containers, to prefix the id with the locale.
 * - attaches `pre-save` event to the containers adapters, to add the fields: `locale`, `path`.
 *
 */
module.exports = function(o) {
  o = defaults(o, c);
  o.locale = o.locale || 'locale';
  o.path = o.path || 'path';

  var attribute = o.attribute || 'locale';

  plugin.api = 'wrap-plugin';
  function plugin(wrap) {


    function attachHandlers(containers) {

      debug('attachHandlers containers.length', containers.length);

      containers.forEach(function(container) {

        // container load handler
        container.on('pre-load', function() {
          var locale = wrap.getLocale();
          var id = container.id();
          debug('pre-load container.id():', id, ', locale:', locale);
          if (!locale ||!id) return;
          if (id.indexOf(locale) == 0) return; // id starts with locale
          container.id(locale + '-' + id);
        });

        // container save handler
        container.on('pre-save', function() {
          var locale = wrap.getLocale();
          var id = container.id();
          debug('pre-save container.id():', id, ', locale:', locale);
          if (!locale ||!id) return;
          if (id.indexOf(locale) == 0) return; // id starts with locale
          container.id(locale + '-' + id);
        });

        // adapter save handler
        var adapter = container.adapter();
        if (!adapter) return;

        adapter.on('pre-save', function() {
          var args = [].slice.apply(arguments);
          var len = args.length, pos = 3;
          if (len <= pos) return debug('missing argument');
          var obj = args[pos]; // object: 4th argument
          var id = args[pos - 1]; // id: 3rd argument

          // get locale
          var locale = wrap.getLocale();
          if (locale) {
            obj[o.locale] = locale;
            obj[o.path] = id.replace(locale + '-', '');

          } else {
            console.error('wrap-i18n: on adapter-pre-save, locale not found');
          }

          debug('adatper pre-save, locale:', obj[o.locale], ', path:', obj[o.path]);
        });

      });

    }

    /**
     *
     * adds Locale Setter function.
     * chainable function.
     *
     * @param value Locale like `de-CH`.
     * @returns {Object} self
     */
    wrap.locale = wrap.setLocale = function(value) {
      debug('wrap setLocale', value);
      if (typeof value !== 'undefined') {
        wrap['_' + attribute] = value;
        wrap.flow.forEach(function(key, ctrl) {
          if (typeof ctrl[attribute] === 'function') {
            debug('wrap flow', key, ctrl);
            ctrl[attribute](value);
          }
        });
      }
      return wrap;
    };

    /**
     * adds Locale Getter function.
     *
     * @returns {String} Locale like `en` or `en-GB`.
     */
    wrap.getLocale = function() {
      debug('wrap getLocale', wrap['_' + attribute]);
      return wrap['_' + attribute];
    };

    // TODO browser: make translations editable (inline) e.g. with i18n="<key>"

    /**
     * initializes wrap for i18n.
     *
     * @param i18n internationalization object with properties: locale, locales, translate
     * @returns {wrap} Object
     */
    wrap.i18n = function(i18n) {
      if (!i18n) {
        console.error('no i18n object provided', i18n);
        return wrap;
      }
      debug('i18n', i18n.locale, i18n.locales);
      wrap.setLocale(i18n.locale);
      wrap.locales = i18n.locales;
      wrap.translate = i18n.translate;

      return wrap;
    };

    wrap.on('post-load', function(content) {
      debug('post-load', o.translate, !isBrowser, typeof wrap.translate !== 'undefined');
      if (!isBrowser && o.translate && content && typeof content[o.translate] === 'string') {

        if (!wrap.translate) return;

        // get the content to translate
        var text = content[o.translate];

        // translate i18n-* strings
        var translated = wrap.translate(text);
        debug('translate', text);
        debug('translated', translated);

        // write back the translated content
        content[o.translate] = translated || text;

      }
    });

    var handlers = false;
    wrap.on('pre-load', function() {

      // attach container save handler once
      // the handlers are attached on the wrap's pre-load event,
      // because the containers might not be available during this plugins instatiation.
      if (!handlers) attachHandlers(wrap.containers);
      handlers = true;

    });

  }

  return plugin;

};
