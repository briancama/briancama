var path = require('path'),
    fs = require('fs'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    connect = require('connect'),
    vhost = require('vhost');
    open = require('open'),
    glob = require('glob'),
    exec = require('child_process').exec,
    compression = require('compression'),
    serverStatic = require('serve-static');

// server paths
var briancama = connect();

briancama.use(serverStatic(__dirname + "/dist"));

var app = connect();
app.use(compression());
app.use(vhost('briancama.com', briancama));

app.listen(process.env.PORT || 80);