const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {}; // لتخزين بيانات كل غرفة بشكل منفصل

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.room);
        if (!rooms[data.room]) {
            rooms[data.room] = { players: {}, zombies: [], level: 1, score: 0 };
        }
        rooms[data.room].players[socket.id] = { id: socket.id, name: data.name, x: 1500, y: 1500, angle: 0, health: 100 };
        io.to(data.room).emit('updateState', rooms[data.room]);
    });

    socket.on('move', (data) => {
        let room = rooms[data.room];
        if (room && room.players[socket.id]) {
            room.players[socket.id].x = data.x;
            room.players[socket.id].y = data.y;
            room.players[socket.id].angle = data.angle;
            socket.to(data.room).emit('playerMoved', room.players[socket.id]);
        }
    });

    // السيرفر هو اللي بيطلع الزومبي لكل الناس مع بعض
    setInterval(() => {
        for (let rId in rooms) {
            let room = rooms[rId];
            if (Object.keys(room.players).length > 0 && room.zombies.length < 5 + room.level * 2) {
                let newZombie = { 
                    id: Math.random(), 
                    x: Math.random() > 0.5 ? 500 : 2500, 
                    y: Math.random() > 0.5 ? 500 : 2500,
                    health: 50 + (room.level * 20)
                };
                room.zombies.push(newZombie);
                io.to(rId).emit('newZombie', newZombie);
            }
        }
    }, 4000);

    socket.on('disconnect', () => {
        for (let rId in rooms) {
            if (rooms[rId].players[socket.id]) {
                delete rooms[rId].players[socket.id];
                io.to(rId).emit('playerLeft', socket.id);
            }
        }
    });
});

http.listen(process.env.PORT || 3000, () => console.log('Co-op Battle Started!'));
