'use strict';

var DEFAULT_EXTENSION = 'twig';

var sysPath = require('path');
var fs      = require('fs');
var loggy   = require('loggy');
var progeny = require('progeny');
var umd     = require('umd-wrapper');
var Twig    = require('twig');

// Tweak Twig to allow override of templates
Twig.extend(function (t) {
  Twig.unregister = function (id) {
    if (t.Templates.registry[id]) {
      delete t.Templates.registry[id];
    }
  };
});


// UTIL FUNCTIONS
// ----------------------------------------------------------------------------

/// Read JSON data form a file
 //
 // @param path2JSON The path to the JSON file to read
 // @return Promise
function readJson(path2JSON) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path2JSON, 'utf-8', function (err, data) {
      if (err) {
        reject(err);
        loggy.warn('Unable to read', path2JSON);

        return;
      }

      resolve(JSON.parse(data));
    });
  });
}

/// Write content into a file
 //
 // @param file    The path to the file to create or override
 // @param content The content of the file to write
 // @return Promise
function writeFile(file, content) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(file, content, function (err) {
      if (err) {
        reject(err);
        loggy.error('Unable to write in', file);

        return;
      }

      resolve(content);
    });
  });
}

// Turn any extention provide by the user into a RegExp
function RGXExtension(ext) {
  if (ext instanceof RegExp) {
    return ext;
  }

  if (typeof ext === 'string' && ext.length > 0) {
    ext = [ext];
  }

  if (!Array.isArray(ext)) {
    return new RegExp('\.' + DEFAULT_EXTENSION + '$');
  }

  ext = ext.map(function (val) {
    return val.replace(/^\./, '').replace(/\./, '\.');
  });

  return new RegExp('\.(?:' + ext.join('|') + ')$');
}

function setPathToHtml(twigFilePath, assetPath) {
  // We assume the path to the twig file is provided WITHOUT extension
  var path = twigFilePath + '.html';
  path = path.split(sysPath.sep);

  var dest = assetPath.split(sysPath.sep);
  dest.every(function (part) {
    if (path[0] === part) {
      path.shift();
      return true;
    }

    return false;
  });

  dest = sysPath.join.apply(sysPath, dest);
  path = sysPath.join.apply(sysPath, path);

  return sysPath.join(dest, path);
}

/// Turn the template "id" into HTML at "path" with data from "dataSrc"
 //
 // @param id      The id of the template to process
 // @param path    The repository where to create the resulting HTML file
 // @param dataSrc The path to the json file with the data to use
function twig2html(id, path, dataSrc) {
  function processTemplate(data) {
    if (data instanceof Error) {
      data = {};
      loggy.warn(Error);
    }

    var content = Twig.twig({ref: id}).render(data);
    var dest    = setPathToHtml(id, path);

    writeFile(dest, content)
      .then(function () {
        loggy.info('File created', dest);
      });
  }

  return readJson(dataSrc)
    .then(processTemplate)
    .catch(processTemplate);
}


// BRUNCH PLUGIN
// ----------------------------------------------------------------------------

function TwigCompiler(cfg) {
  if (cfg == null) { cfg = {}; }
  var config = (cfg.plugins && cfg.plugins.twig) || {};

  // remin to optimize if possible
  this.optimize = cfg.optimize;

  // Setup actual extention file to check
  this.pattern = RGXExtension(config.extension);

  if (config.static) {
    // For static generation, set output directory
    this.directory = config.static.directory || 'app/assets';

    // For static generation, set data source
    this.data = String(config.static.data || config.static);
  }

  // Set up the dependency tree for brunch
  this.getDependencies = progeny({
    extension     : this.extension,
    extensionsList: [this.extension, 'twig'],
    regexp        : /^\s*(?:\{%\s+(?:embed|include|extends|use|import|from)|\{\{\s+(?:include|source)\()\s+(?:"|')([^"]+)(?:"|').*(?:%\}|\}\})\s*$/,
    // regexp        : /^\s*\{(?:\{|%)\s+(?:embed|include|extends|use|import|from|source)\(?\s+(?:"|')([^"']+)(?:"|').*$/,
    multipass     : [],
    prefix        : '_',
    exclusion     : '',
    rootPath      : this.rootPath,
    potentialDeps : true
  });
}

TwigCompiler.prototype.brunchPlugin = true;
TwigCompiler.prototype.type = 'template';
TwigCompiler.prototype.extension = DEFAULT_EXTENSION;

TwigCompiler.prototype.compile = function processTwig(raw, path, callback) {
  if (this.optimize) {
    raw = raw.replace(/^[\x20\t]+/mg, '')
             .replace(/[\x20\t]+$/mg, '')
             .replace(/^[\r\n]+/, '')
             .replace(/[\r\n]*$/, '\n');
  }

  // Compile twig template
  var id = path.replace(this.pattern, '');
  Twig.unregister(id);

  var tpl = Twig.twig({
    id   : id,
    path : path,
    async: false
  });

  var result = [
    '(function () {',
      // 'if(window && !require){',
      //   'window.require = function (mod) {',
      //     'return window[mod];',
      //   '};',
      // '}',
      'var twig = require("twig").twig;',
      'return ' + tpl.compile({}),
    '}())'
  ].join('\n');

  // Create static HTML if necessary
  if (this.directory && id.indexOf('_') !== 0) {
    twig2html(id, this.directory, this.data);
  }

  return callback(null, umd(result));
};

module.exports = TwigCompiler;
