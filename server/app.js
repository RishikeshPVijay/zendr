var express = require('express');
var bodyParser = require('body-parser');

var app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

app.set('views', path.join(__dirname, "views"));
app.set('view engine', 'ejs');

app.use('/', express.static('./public'));

var urlencodedParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json();

var codes = [];
var clients = [];

io.on('connection', socket => {
    socket.on('receive', data => {
        clients.push({ code: data.code, id: socket.id, name: data.name });
    });
    socket.on('disconnect', () => {
        var result = clients.filter(entry => {
            return entry.id = socket.id;
        });
        let index = clients.indexOf(result[0]);
        if (index > -1) {
            clients.splice(index, 1);
        }
        if (clients.length == 0 && codes.length > 10) {  // this is bad 
            codes.splice(0, 6);
        }
    });
});

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.post('/', urlencodedParser, (req, res) => {
    if (!req.body.name || !req.body.code) return;
    for (code of codes) {
        if (code === req.body.code) {
            res.render('receive.ejs', { code: code, name: req.body.name });
            return;
        }
    }
    res.send('Invalid code');
});

app.post('/code', jsonParser, (req, res) => {
    var code = req.body.code;
    let index = codes.indexOf(code);
    if (index > -1) {
        return
    }
    codes.push(code);
    console.log('codes: ' + codes);
    res.end();
});

app.post('/names', jsonParser, (req, res) => {
    var names = [];
    for (i = 0; i < clients.length; i++) {
        if (clients[i].code === req.body.code) {
            names.push({ name: clients[i].name, id: clients[i].id })
        }
    }
    res.json({ names: names });
});

app.post('/download', jsonParser, (req, res) => {
    if (!req.body.link) return;
    io.to(req.body.to).emit('download', { link: req.body.link });
});

app.post('/disconnect', jsonParser, (req, res) => {
    res.send('true');
    if (!req.body.code) return;
    let code = req.body.code;
    let index = codes.indexOf(code);
    if (index > -1) {
        codes.splice(index, 1);
    }
    if (codes.length === 0)
        clients = [];
});

app.get('/status', urlencodedParser, (req, res) => {
    res.json({ codes: codes.length, clients: clients.length });
});

var port = process.env.PORT || 3001

var server = http.listen(port, () => {
    console.log("App is alive");
});

process.on('SIGINT', () => {
    clients = [];
    codes = [];
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('SIGTERM', () => {
    clients = [];
    codes = [];
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});
