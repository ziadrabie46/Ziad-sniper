let socket, myId, players = {}, zombies = [], gameStarted = false;
let moveDir = { x: 0, y: 0 };
let myName, myRoom, myAngle = 0;

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;

    socket.emit('join', { name: name, room: room });
    socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; myId = socket.id; gameStarted = true; });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });

    setInterval(() => { if(gameStarted && zombies.length < 5) zombies.push(new Zombie()); }, 4000);
}

function setup() { 
    createCanvas(windowWidth, windowHeight); 
    setupMobileButtons();
}

function draw() {
    if(!gameStarted || !players[myId]) return;
    background(210, 180, 140);
    
    let me = players[myId];
    translate(width/2 - me.x, height/2 - me.y);

    // نهر النيل كعلامة في الخريطة
    fill(30, 144, 255); rect(1500-25, 0, 50, 3000);

    // رسم كل اللاعبين
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            push();
            translate(p.x, p.y);
            rotate(p.angle || 0); // الدوران
            fill(id === myId ? "#4ade80" : "#ef4444");
            stroke(255); strokeWeight(2);
            ellipse(0, 0, 45);
            // رسم العينين لتوضيح الاتجاه
            fill(0);
            ellipse(12, -10, 6); ellipse(12, 10, 6);
            pop();
            // الاسم فوق اللاعب
            fill(0); textAlign(CENTER); textSize(16);
            text(p.name, p.x, p.y - 40);
        }
    }

    for (let z of zombies) { z.update(me); z.draw(); }
    updateLogic();
}

function updateLogic() {
    let speed = 5;
    let moved = false;
    let me = players[myId];

    // تحكم الكيبورد (كمبيوتر)
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { me.x -= speed; moved = true; }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { me.x += speed; moved = true; }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) { me.y -= speed; moved = true; }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { me.y += speed; moved = true; }

    // تحكم أزرار اللمس (موبايل)
    if (moveDir.x !== 0 || moveDir.y !== 0) {
        me.x += moveDir.x * speed;
        me.y += moveDir.y * speed;
        moved = true;
    }

    // الدوران ناحية الماوس أو اللمس
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.05) {
        myAngle = targetAngle;
        me.angle = myAngle;
        moved = true;
    }

    if (moved) socket.emit('move', me);
}

function setupMobileButtons() {
    const bind = (id, x, y) => {
        let b = document.getElementById(id);
        if(b) {
            b.ontouchstart = (e) => { e.preventDefault(); moveDir = {x, y}; };
            b.ontouchend = (e) => { e.preventDefault(); moveDir = {x:0, y:0}; };
        }
    };
    bind('btn-u', 0, -1); bind('btn-d', 0, 1);
    bind('btn-l', -1, 0); bind('btn-r', 1, 0);
}

class Zombie {
    constructor() { this.x = random(1200, 1800); this.y = random(1200, 1800); }
    update(t) { let d = dist(this.x, this.y, t.x, t.y); if(d>1) { this.x += (t.x-this.x)/d * 2; this.y += (t.y-this.y)/d * 2; } }
    draw() { fill(255,0,0); ellipse(this.x, this.y, 30); }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
