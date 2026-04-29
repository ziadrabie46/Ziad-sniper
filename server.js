const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.room);
        if (!rooms[data.room]) {
            rooms[data.room] = { players: {}, zombies: [], score: 0, level: 1, castleHP: 500 };
        }
        rooms[data.room].players[socket.id] = { id: socket.id, name: data.name, x: 1500, y: 1500, angle: 0, hp: 100 };
        io.to(data.room).emit('updateState', rooms[data.room]);
    });

    socket.on('move', (data) => {
        if (rooms[data.room] && rooms[data.room].players[socket.id]) {
            let p = rooms[data.room].players[socket.id];
            p.x = data.x; p.y = data.y; p.angle = data.angle;
            socket.to(data.room).emit('playerMoved', p);
        }
    });

    socket.on('disconnect', () => {
        for (let r in rooms) {
            if (rooms[r].players[socket.id]) {
                delete rooms[r].players[socket.id];
                io.to(r).emit('playerLeft', socket.id);
            }
        }
    });
});

setInterval(() => {
    for (let r in rooms) {
        if (Object.keys(rooms[r].players).length > 0 && rooms[r].zombies.length < 10) {
            let z = { id: Math.random(), x: Math.random()*3000, y: Math.random()*3000 };
            rooms[r].zombies.push(z);
            io.to(r).emit('newZombie', z);
        }
    }
}, 3000);

http.listen(3000, () => console.log('Battle Logic Ready!'));
