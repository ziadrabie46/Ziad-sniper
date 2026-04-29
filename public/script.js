let socket;
let myId;
let players = {};
let zombies = [];
let gameStarted = false;
let myName, myRoom;
let move = { x: 0, y: 0 };

function startMultiplayer(name, room) {
    socket = io(); // الاتصال بسيرفر Render
    myName = name;
    myRoom = room;

    socket.emit('join', { name: name, room: room });

    socket.on('currentPlayers', (serverPlayers) => {
        players = serverPlayers;
        myId = socket.id;
        gameStarted = true;
    });

    socket.on('playerMoved', (p) => {
        if (p.room === myRoom) players[p.id] = p;
    });

    socket.on('playerLeft', (id) => { delete players[id]; });

    // نظام الزومبي (السيرفر بيبعت أماكنهم أو بنعملهم محلياً)
    setInterval(() => {
        if(gameStarted && zombies.length < 5) zombies.push(new Zombie());
    }, 3000);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
}

function draw() {
    if (!gameStarted) return;

    background(210, 180, 140); // لون الرمل

    let me = players[myId];
    if (!me) return;

    // الكاميرا تتبعك
    translate(width/2 - me.x, height/2 - me.y);

    // رسم نهر النيل
    fill(30, 144, 255);
    rect(1500 - 25, 0, 50, 3000);

    // رسم كل اللاعبين
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            drawPlayer(p, id === myId);
        }
    }

    // رسم وتحديث الزومبي
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update(me);
        zombies[i].draw();
    }

    // تحديث حركتي وإرسالها للسيرفر
    updateMovement();
}

function drawPlayer(p, isMe) {
    push();
    fill(isMe ? "#4ade80" : "#ef4444");
    stroke(255); strokeWeight(2);
    ellipse(p.x, p.y, 45);
    // رسم العينين
    fill(0);
    ellipse(p.x + 10, p.y - 10, 5);
    ellipse(p.x + 10, p.y + 10, 5);
    // الاسم
    textAlign(CENTER); textSize(16);
    text(p.name, p.x, p.y - 35);
    pop();
}

function updateMovement() {
    let speed = 5;
    let moved = false;
    
    // دعم الكيبورد والموبايل معاً
    if (keyIsDown(LEFT_ARROW) || move.x < 0) { players[myId].x -= speed; moved = true; }
    if (keyIsDown(RIGHT_ARROW) || move.x > 0) { players[myId].x += speed; moved = true; }
    if (keyIsDown(UP_ARROW) || move.y < 0) { players[myId].y -= speed; moved = true; }
    if (keyIsDown(DOWN_ARROW) || move.y > 0) { players[myId].y += speed; moved = true; }

    if (moved) {
        socket.emit('move', { x: players[myId].x, y: players[myId].y });
    }
}

// دالة الزومبي
class Zombie {
    constructor() {
        this.x = random(1000, 2000);
        this.y = random(1000, 2000);
    }
    update(target) {
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let d = sqrt(dx*dx + dy*dy);
        this.x += (dx/d) * 2;
        this.y += (dy/d) * 2;
    }
    draw() {
        fill(255, 50, 50);
        ellipse(this.x, this.y, 30);
    }
}

// ربط أزرار الموبايل اللي في الـ HTML بالحركة
window.onload = () => {
    const bind = (id, x, y) => {
        let btn = document.getElementById(id);
        if(btn) {
            btn.ontouchstart = (e) => { e.preventDefault(); move = {x, y}; };
            btn.ontouchend = () => { move = {x:0, y:0}; };
        }
    };
    bind('btn-u', 0, -1); bind('btn-d', 0, 1);
    bind('btn-l', -1, 0); bind('btn-r', 1, 0);
};
