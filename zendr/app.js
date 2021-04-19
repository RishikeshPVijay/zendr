#!/usr/bin/env node

var express = require('express');
var fs = require('fs');

var open = require('open');

const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express();
var ip = require("ip");

var port = process.env.port || 3000;

const dirmaker = require('./config/dirmaker');
const dirserver = require('./config/dirserver');

let myIp = ip.address();

const http = require('http').Server(app);
const io = require('socket.io')(http);

var superagent = require('superagent');


app.set('view engine', 'ejs');

app.use('/', express.static('./public'));

function makeid(length) {
    var result = '';
    var characters = '0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

var id = makeid(5);


let connections = [];

let connect = [];

let heroku = [];

io.on('connection', (socket) => {

    connections.push(socket.id);

    socket.on('send', (data) => {
        var sendFn = () => {
            for (f of data.files) {
                var dest = __dirname + '/public/temp/' + f;
                var file = data.url + f;
                fs.copyFileSync(file, dest, fs.constants.COPYFILE_FICLONE, (err) => {
                    if (err) return console.log('error');
                    console.log('copied');
                });
            }
        }
        for (her of heroku) {
            if (her.name == data.name) {
                sendFn();
                var link = `http://${myIp}:${port}/receive/download/${id}`
                superagent.post('https://zendr.herokuapp.com/download')
                    .send({ link: link, to: her.receiver })
                    .end((err, res) => {
                    });
                return;
            }
        }
        for (con of connect) {

            if (con.name == data.name) {
                sendFn();
                io.to(con.receiver).emit('download', { true: 'true' });
            }
        }
    });

    socket.on('receive', (data) => {

        connect.push({ 'name': data.name, 'receiver': data.id, 'sender': null });
        console.log(data.name + ' connected');
    });

    socket.on('disconnect', function () {
        const index = connections.indexOf(socket.id);
        if (index > -1) {
            connections.splice(index, 1);
        }
    });
});

var platform = process.platform;
var location;
if (platform === 'win32') {
    location = 'C:\\';
    console.log(`\nGoto localhost:${port} or 127.0.0.1:${port} to send\n\nGoto \'zendr.herokuapp.com\' to receive\nCode: ${id}\n`);
} else if (platform === 'linux') {
    location = '/home';
    console.log(`\nGoto localhost:${port} or 127.0.0.1:${port} to send\n\nGoto \'zendr.herokuapp.com\' to receive\nCode: ${id}\n`);
} else {
    location = '/sdcard';
    console.log(`\nGoto 127.0.0.1:${port} to send\n\nGoto \'zendr.herokuapp.com\' to receive\nCode: ${id}\n`);
}


superagent.post('https://zendr.herokuapp.com/code')
    .send({ code: id })
    .set('accept', 'json')
    .end((err, res) => {
    });

app.get('/', function (req, res, next) {
    res.render('index.ejs', {id});
});

app.post('/send', urlencodedParser, (req, res) => {
    let names = [];
    for (con of connect) {
        names.push(con.name);
    }
    superagent.post('https://zendr.herokuapp.com/names')
        .send({ code: id })
        .set('accept', 'json')
        .end((err, resp) => {
            if (!resp) return;
            if (resp.body) {
                var more = resp.body.names;
                for (one of more) {
                    names.push(one.name);
                    heroku.push({ 'name': one.name, 'receiver': one.id });
                }
                res.json({ names: names, true: 'true' });
                return;
            }

            res.json({ names: names, true: 'true' });
        });
});

app.get('/receive', (req, res) => {
    res.render('receive.ejs');
});

app.post('/receive/download', (req, res) => {
    var dest = __dirname + '/public/temp/'
    var html = dirserver(dest);
    res.send(html);
});

app.get('/receive/download/:id', (req, res) => {
    if (req.params.id !== id) return;
    var dest = __dirname + '/public/temp/'
    var html = dirserver(dest);
    res.send(html);
});

app.all('*', function (req, res, next) {
    let url = req.url
    if (url == '/path?')
        url = '/';

    dirmaker(res, location + url, location);


    res.end();

});


open(`http://127.0.0.1:${port}`);


var server = http.listen(port, () => {

});

var terminate = () => {
    var files = fs.readdirSync(__dirname + '/public/temp/');
    if (files.length != 0) {
        for (fil of files) {
            fs.unlinkSync(__dirname + '/public/temp/' + fil);
        }
    }
    superagent.post('https://zendr.herokuapp.com/disconnect')
        .send({ code: id })
        .set('accept', 'json')
        .end((err, resp) => {
            console.log('\nZendr gone...\n');
            process.exit(0);
        });
    setTimeout(() => {
        process.exit(0);
    }, 5000);
}

process.on('SIGINT', () => {
    terminate();
});

process.on('SIGTERM', () => {
    terminate();
});