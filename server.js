const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
    socket.on('join', (name) => {
        players[socket.id] = { name: name, choice: null, status: 'alive', x: 50 };
        io.emit('update', players);
    });

    socket.on('choose', (choice) => {
        if (players[socket.id] && players[socket.id].status === 'alive') {
            players[socket.id].choice = choice;
            players[socket.id].x = choice === 'A' ? 20 : 80;
            io.emit('update', players);
        }
    });

    socket.on('judge', (correctAnswer) => {
        for (let id in players) {
            if (players[id].status === 'alive' && players[id].choice !== correctAnswer) {
                players[id].status = 'dead';
            }
        }
        io.emit('update', players);
    });

    socket.on('next', () => {
        for (let id in players) {
            if (players[id].status === 'alive') {
                players[id].choice = null;
                players[id].x = 50;
            }
        }
        io.emit('update', players);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('update', players);
    });
});

server.listen(3000, () => {
    console.log('サーバー起動中: ポート3000');
});
