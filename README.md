## twig-brunch

Add [Twig](https://github.com/justjohn/twig.js) support to [brunch](http://brunch.io/).

## Usage

> __WARNING__ _This is work in progress and quite broken at the time. As both
  Brunch and Twig.js are badly documented I cannot guarantee I'll finish this._

### Options
If customization is needed or desired, settings can be modified in your brunch
config file (such as `brunch-config.coffee`):

| Option       | Description
| ------------ | -----------------
| `extension`  | The extentions used by your Twig files. It can be either a String or an Array of strings (default to `twig`).
| `static`     | This plugin allows to turn Twig templates into static HTML files. All Twig templates that do not start with a `_` will be turn into a static HTML file within the chosen directory. If not set, there is no static generation.
| `static.directory` | The directory where the static file will be output (default to app/assets)
| `static.data` | The location of a JSON file to populate the Twig template when turn into static HTML files.

> __NOTE:__ _The static configuration can be either an object (as decribed
  above) or a string representing the path to a JSON file with the necessary
  data to fill the templates_

#### Example

```coffeescript
exports.config =
  ...
  plugins:
    twig:
      extension: ['twig','html'] # Consider also HTML files as Twig templates
      static:
        directory: 'src/assets'
        data: 'data.json'
```

## Improvement

This plugin can be improved. Here are some ideas under consideration

* Allow multiple data source for static generation

