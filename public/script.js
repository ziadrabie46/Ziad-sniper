let socket, myId, players = {}, zombies = [], gameStarted = false;
let move = {x:0, y:0}, myName, myRoom, myAngle = 0;

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;

    socket.emit('join', { name: name, room: room });
    socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; myId = socket.id; gameStarted = true; });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });

    setInterval(() => { if(gameStarted && zombies.length < 5) zombies.push(new Zombie()); }, 4000);
}

function setup() { createCanvas(windowWidth, windowHeight); }

function draw() {
    if(!gameStarted || !players[myId]) return;
    background(210, 180, 140);
    
    let me = players[myId];
    translate(width/2 - me.x, height/2 - me.y);

    // نهر النيل
    fill(30, 144, 255); rect(1500-25, 0, 50, 3000);

    // رسم اللاعبين
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            push();
            translate(p.x, p.y);
            rotate(p.angle || 0);
            fill(id === myId ? "#4ade80" : "#ef4444");
            stroke(255); ellipse(0,0,45);
            fill(0); ellipse(12, -10, 6); ellipse(12, 10, 6); // العينين
            pop();
            fill(0); textAlign(CENTER); text(p.name, p.x, p.y - 40);
        }
    }

    // الزومبي
    for (let z of zombies) { z.update(me); z.draw(); }

    updateLogic();
}

function updateLogic() {
    let moved = false;
    if (move.x !== 0 || move.y !== 0) {
        players[myId].x += move.x * 5;
        players[myId].y += move.y * 5;
        moved = true;
    }

    // الدوران ناحية اللمس/الماوس
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.1) {
        myAngle = targetAngle;
        players[myId].angle = myAngle;
        moved = true;
    }

    if (moved) socket.emit('move', players[myId]);
}

class Zombie {
    constructor() { this.x = random(1200, 1800); this.y = random(1200, 1800); }
    update(t) { let d = dist(this.x, this.y, t.x, t.y); this.x += (t.x-this.x)/d * 2; this.y += (t.y-this.y)/d * 2; }
    draw() { fill(255,0,0); ellipse(this.x, this.y, 30); }
}

// ربط الأزرار
window.onload = () => {
    const s = (id, x, y) => {
        let b = document.getElementById(id);
        if(b) {
            b.ontouchstart = (e) => { e.preventDefault(); move = {x, y}; };
            b.ontouchend = () => { move = {x:0, y:0}; };
        }
    };
    s('btn-u', 0, -1); s('btn-d', 0, 1); s('btn-l', -1, 0); s('btn-r', 1, 0);
};
