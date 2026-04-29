const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

// تشغيل الملفات من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.room);
        players[socket.id] = { 
            id: socket.id, 
            name: data.name, 
            room: data.room, 
            x: 1500, 
            y: 1500, 
            angle: 0 
        };
        io.to(data.room).emit('currentPlayers', players);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            socket.to(players[socket.id].room).emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server is running on port ' + PORT));
