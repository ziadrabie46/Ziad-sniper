let socket, myId, players = {}, zombies = [], gameStarted = false;
let move = {x:0, y:0}, myName, myRoom, myAngle = 0;

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;

    socket.emit('join', { name: name, room: room });

    socket.on('currentPlayers', (serverPlayers) => {
        players = serverPlayers;
        myId = socket.id;
        gameStarted = true;
    });

    socket.on('playerMoved', (p) => {
        if(p.room === myRoom) players[p.id] = p;
    });

    socket.on('playerLeft', (id) => { delete players[id]; });

    // ظهور الزومبي كل 5 ثواني
    setInterval(() => {
        if(gameStarted && zombies.length < 8) zombies.push(new Zombie());
    }, 5000);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
}

function draw() {
    if(!gameStarted || !players[myId]) return;
    
    background(210, 180, 140); // لون الأرضية
    
    let me = players[myId];
    
    // الكاميرا تتبع اللاعب
    translate(width/2 - me.x, height/2 - me.y);

    // رسم نهر النيل كعلامة في الخريطة
    fill(30, 144, 255);
    rect(1500-30, 0, 60, 3000);

    // رسم اللاعبين
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            push();
            translate(p.x, p.y);
            rotate(p.angle || 0);
            
            // لون أخضر لك، أحمر للباقي
            fill(id === myId ? "#4ade80" : "#ef4444");
            stroke(255); strokeWeight(2);
            ellipse(0, 0, 45);
            
            // العينين (بتبص ناحية اليمين دايماً والدوران بيلفها)
            fill(0);
            ellipse(12, -10, 6); ellipse(12, 10, 6);
            
            // السلاح
            fill(50); rect(15, -4, 20, 8);
            pop();
            
            // الاسم
            fill(0); textAlign(CENTER); textSize(16);
            text(p.name, p.x, p.y - 40);
        }
    }

    // رسم الزومبي
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update(me);
        zombies[i].draw();
    }

    updateAndSend();
}

function updateAndSend() {
    let speed = 5;
    let moved = false;

    // حركة الأسهم (كيبورد وموبايل)
    if (keyIsDown(LEFT_ARROW) || move.x < 0) { players[myId].x -= speed; moved = true; }
    if (keyIsDown(RIGHT_ARROW) || move.x > 0) { players[myId].x += speed; moved = true; }
    if (keyIsDown(UP_ARROW) || move.y < 0) { players[myId].y -= speed; moved = true; }
    if (keyIsDown(DOWN_ARROW) || move.y > 0) { players[myId].y += speed; moved = true; }

    // الدوران ناحية الماوس أو اللمس
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.05) {
        myAngle = targetAngle;
        players[myId].angle = myAngle;
        moved = true;
    }

    if (moved) {
        socket.emit('move', players[myId]);
    }
}

class Zombie {
    constructor() {
        // يظهر الزومبي في أماكن عشوائية حول اللاعب
        this.x = players[myId].x + random([-500, 500]);
        this.y = players[myId].y + random([-500, 500]);
    }
    update(t) {
        let d = dist(this.x, this.y, t.x, t.y);
        if(d > 5) {
            this.x += (t.x - this.x) / d * 2;
            this.y += (t.y - this.y) / d * 2;
        }
    }
    draw() {
        fill(255, 50, 50);
        stroke(0);
        ellipse(this.x, this.y, 35);
        // عيون الزومبي
        fill(255); ellipse(this.x+5, this.y-5, 5); ellipse(this.x+5, this.y+5, 5);
    }
}

// ربط أزرار الموبايل
function setupControls() {
    const bindBtn = (id, x, y) => {
        let btn = document.getElementById(id);
        if(btn) {
            btn.ontouchstart = (e) => { e.preventDefault(); move = {x, y}; };
            btn.ontouchend = (e) => { e.preventDefault(); move = {x:0, y:0}; };
        }
    };
    bindBtn('btn-u', 0, -1); bindBtn('btn-d', 0, 1);
    bindBtn('btn-l', -1, 0); bindBtn('btn-r', 1, 0);
}

// تشغيل ربط الأزرار بعد تحميل الصفحة
window.onload = setupControls;
