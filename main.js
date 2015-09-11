'use strict';

var DEFAULT_EXTENSION = 'twig';

var sysPath = require('path');
var fs      = require('fs');
var log     = require('loggy');
var progeny = require('progeny');
var umd     = require('umd-wrapper');
var Twig    = require('twig');

Twig.extend(function (t) {
  Twig.unregister = function (id) {
    if (t.Templates.registry[id]) {
      delete t.Templates.registry[id];
    }
  };
});

// Make sure any extention provide by the user is allways a RegExp
function normalizeExtension(ext) {
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

function getData(dataSrc) {
  return new Promise(function (resolve, reject) {
    fs.readFile(dataSrc, 'utf-8', function (err, data) {
      if (err) {
        reject(err);

        if (dataSrc) {
          log.warn('TwigCompiler was unable to get data from', dataSrc);
        }

        return;
      }

      resolve(JSON.parse(data));
    });
  });
}

function writeFile(dest, content) {
  return new Promise(function (resolve, reject) {
    fs.writeFile(dest, content, function (err) {
      if (err) {
        reject(err);

        log.error('TwigCompiler is unable to write in', dest);

        return;
      }

      resolve();
    });
  });
}

function twig2html(id, path, dataSrc) {
  function processTemplate(data) {
    if (data instanceof Error) {
      data = {};
    }

    var content = Twig.twig({ref: id}).render(data);
    var dest    = setPathToHtml(id, path);

    writeFile(dest, content);
  }

  return getData(dataSrc)
    .then(processTemplate)
    .catch(processTemplate);
}

function TwigCompiler(cfg) {
  if (cfg == null) { cfg = {}; }
  var config = (cfg.plugins && cfg.plugins.twig) || {};
  // console.log(cfg);
  this.optimize   = cfg.optimize;
  this.pattern    = normalizeExtension(config.extension);
  this.staticDir  = config.staticDir;
  this.staticData = config.staticData;

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

  var id = path.replace(this.pattern, '');
  Twig.unregister(id);

  var tpl = Twig.twig({
    id  : id,
    data: raw
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

  return callback(null, umd(result));
};

TwigCompiler.prototype.onCompile = function processStaticTwig(generatedFiles) {
  var ext  = this.pattern;
  var dest = this.staticDir;
  var data = this.staticData;

  var nbrTwigFiles = 0;
  var nbrHtmlFiles = 0;

  function fileIterator(file) {
    if (file.sourceFiles) {
      file.sourceFiles.forEach(fileIterator);
    }

    if (file.path && ext.test(file.path)) {
      var filename = file.path.split(sysPath.sep).pop();
      nbrTwigFiles += 1;

      if (filename.indexOf('_') !== 0) {
        nbrHtmlFiles += 1;

        var id = file.path.replace(ext, '');
        twig2html(id, dest, data);
      }
    }
  }

  if (dest) {
    generatedFiles.forEach(fileIterator); // This is asynchonous in there
    log.info('process', nbrTwigFiles, 'twig files into', nbrHtmlFiles, 'HTML files');
  }
};

module.exports = TwigCompiler;
