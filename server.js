var path = require('path'),
    fs = require('fs'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    connect = require('connect'),
    vhost = require('vhost');
    open = require('open'),
    Mustache = require('mustache'),
    glob = require('glob'),
    md = require(__dirname + '/node_modules/reveal-md/node_modules/reveal.js/plugin/markdown/markdown'),
    exec = require('child_process').exec,
    githubUtils = require('./seafewd6/app/utils/githubUtils'),
    githubUtils2 = require('./seafewd8/app/utils/githubUtils'),
    compression = require('compression'),
    serverStatic = require('serve-static'),
    appConstants = require('./seafewd6/app/constants/appConstants'),

// github method to get auth token
var githubOAuth = require('github-oauth')({
  githubClient: '9ea07a0c928f3bfc6884',
  githubSecret: '7fff2290617f3950310d487a2b4f2d312106a786',
  baseURL: 'http://seafewd6.briancama.com',
  loginURI: '/login',
  callbackURI: '/callback',
  scope: appConstants.GITHUB_API_SCOPE
});

githubOAuth.on('error', function(err) {
  console.error('there was a login error', err);
});

githubOAuth.on('token', function(token, serverResponse) {
  process.stdout.write('TOKEN RECEIVED');
  githubUtils.login(token.access_token, serverResponse);
});

var githubOAuth2 = require('github-oauth')({
  githubClient: '67482b98da5a857ba35b',
  githubSecret: '4baaab441670698c87574a7bfe5a24f995444417',
  baseURL: 'http://seafewd8.briancama.com',
  loginURI: '/fewd8login',
  callbackURI: '/fewd8callback',
  scope: appConstants.GITHUB_API_SCOPE
});

githubOAuth2.on('error', function(err) {
  console.error('there was a login error', err);
});

githubOAuth2.on('token', function(token, serverResponse) {
  process.stdout.write('TOKEN RECEIVED');
  githubUtils2.login(token.access_token, serverResponse);
});



// reveal-md code to render reveal template
// from md files
var serverBasePath = path.resolve(__dirname);

var opts = {
    printMode: false,
    host: 'localhost',
    port: 80,
    revealBasePath: __dirname + '/node_modules/reveal-md/node_modules/reveal.js/',
    template: fs.readFileSync(serverBasePath + '/seafewd6/dist/template/reveal.html').toString(),
    theme: 'css/theme/beige.css',
    separator: '^(\r\n?|\n)---(\r\n?|\n)$',
    verticalSeparator: '^(\r\n?|\n)----(\r\n?|\n)$',
    revealOptions: {}
};

// need to fix print functionality on reveal later
var printPluginPath = serverBasePath + '/node_modules/reveal.js/plugin/print-pdf/print-pdf.js';


var renderMarkdownAsSlides = function(req, res) {

    var markdown = '',
        markdownPath,
        fsPath;

    // Look for print-pdf option
    if (~req.url.indexOf('?print-pdf')) {
      req.url = req.url.replace('?print-pdf','');
    }

    markdownPath = path.resolve(__dirname + '/seafewd6/dist/slides/' + req.url);
    process.stdout.write('markdown path: ');
    process.stdout.write(markdownPath);
    fsPath = markdownPath.replace(/(\?.*)$/, '');
    process.stdout.write(' fs path: ');
    process.stdout.write(fsPath);
    if(fs.existsSync(fsPath)) {
        markdown = fs.readFileSync(fsPath).toString();
        render(res, markdown);
    } else {
        var parsedUrl = url.parse(req.url.replace(/^\//, ''));
        if(parsedUrl) {
            (parsedUrl.protocol === 'https:' ? https : http).get(parsedUrl.href, function(response) {
                response.on('data', function(chunk) {
                    markdown += chunk;
                });
                response.on('end', function() {
                    render(res, markdown);
                });
            }).on('error', function(e) {
                console.log('Problem with path/url: ' + e.message);
                render(res, e.message);
            });
        }
    }
};

var render = function(res, markdown) {
    var slides = md.slidify(markdown, opts);

    res.end(Mustache.to_html(opts.template, {
        theme: opts.theme,
        slides: slides,
        options: JSON.stringify(opts.revealOptions, null, 2)
    }));
};

// server paths
var briancama = connect();
var seafewd = connect();
var seafewd8 = connect();

// get reveal files from reveal-md module
['css', 'js', 'images', 'plugin', 'lib'].forEach(function(dir) {
  seafewd.use('/' + dir, serverStatic(opts.revealBasePath + dir));
  seafewd8.use('/' + dir, serverStatic(opts.revealBasePath + dir));
});

briancama.use(serverStatic(__dirname + "/dist"));
seafewd.use(serverStatic(__dirname + "/seafewd6/dist"));
seafewd8.use(serverStatic(__dirname + "/seafewd8/dist"));

var app = connect();
app.use(compression());
app.use(vhost('seafewd6.briancama.com', seafewd));
app.use(vhost('seafewd8.briancama.com', seafewd8));
app.use(vhost('briancama.com', briancama));

http.createServer(function(req, res) {
  if (req.url.match(/fewd8login/)) {
    return githubOAuth2.login(req, res)
  }
  else if (req.url.match(/login/)) {
    return githubOAuth.login(req, res)
  }
  else if (req.url.match(/fewd8callback/)) {
    return githubOAuth2.callback(req, res)
  }
  else if (req.url.match(/callback/)) {
    return githubOAuth.callback(req, res)
  }
  else if (req.url.match(/(\w+\.md)$/)) {
    return renderMarkdownAsSlides(req, res)
  } else {
    return app(req, res)
  }
}).listen(process.env.PORT || 80);