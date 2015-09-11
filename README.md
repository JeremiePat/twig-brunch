## twig-brunch

Add [Twig](https://github.com/justjohn/twig.js) support to [brunch](http://brunch.io/).

## Usage

Install the plugin via npm with `npm install --save twig-brunch`.

Or, do manual install:

* Add `"handlebars-brunch": "x.y.z"` to `package.json` of your brunch app.
  Pick a plugin version that corresponds to your minor (y) brunch version.
* If you want to use git version of plugin, add
`"handlebars-brunch": "git+https://github.com/brunch/handlebars-brunch.git"`.

### Options
If customization is needed or desired, settings can be modified in your brunch
config file (such as `brunch-config.coffee`):

| Option       | Description
| ------------ | -----------------
| `extension`  | The extentions used by your Twig files. It can be either a String or an Array of strings (default to `twig`).
| `staticDir`  | This plugin allows to turn Twig templates into static HTML files. All Twig templates that do not start with a `_` will be turn into a static HTML file within the chosen directory. If not set, there is no static generation.
| `staticData` | The location of a JSON file to populate the Twig template when turn into static HTML files.

#### Example

```coffeescript
exports.config =
  ...
  plugins:
    twig:
      extension: ['twig','html'] # Consider also HTML files as Twig templates
      staticDir: 'app/assets'
      staticData: 'data.json'
```

## Improvement

This plugin can be improved. Here are some ideas under consideration

* Allow multiple data source for static generation

