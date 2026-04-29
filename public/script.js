let socket, myId, players = {}, zombies = [], bullets = [], gameStarted = false;
let moveDir = { x: 0, y: 0 }, myName, myRoom, myAngle = 0, score = 0;

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;

    socket.emit('join', { name: name, room: room });
    socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; myId = socket.id; gameStarted = true; });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });

    // توليد الزومبي
    setInterval(() => { if(gameStarted && zombies.length < 8) zombies.push(new Zombie()); }, 3000);
}

function setup() { 
    createCanvas(windowWidth, windowHeight); 
    setupControls();
}

function draw() {
    if(!gameStarted || !players[myId]) return;
    background(210, 180, 140);
    
    let me = players[myId];
    translate(width/2 - me.x, height/2 - me.y);

    // رسم الخريطة (النهر)
    fill(30, 144, 255); rect(1500-25, 0, 50, 3000);

    // رسم الرصاص
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        // حذف الرصاصة لو بعدت
        if (dist(bullets[i].x, bullets[i].y, me.x, me.y) > 1000) bullets.splice(i, 1);
    }

    // رسم اللاعبين
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            push();
            translate(p.x, p.y);
            rotate(p.angle || 0);
            fill(id === myId ? "#4ade80" : "#ef4444");
            stroke(255); ellipse(0, 0, 45);
            fill(0); ellipse(12, -10, 6); ellipse(12, 10, 6); // العينين
            pop();
            fill(0); textAlign(CENTER); text(p.name, p.x, p.y - 40);
        }
    }

    // رسم الزومبي واكتشاف الإصابة
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update(me);
        zombies[i].draw();

        // هل رصاصة لمست زومبي؟
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (dist(bullets[j].x, bullets[j].y, zombies[i].x, zombies[i].y) < 25) {
                zombies.splice(i, 1);
                bullets.splice(j, 1);
                score += 10;
                break;
            }
        }
    }

    // عرض النتيجة (ثابتة في الشاشة)
    resetMatrix();
    fill(0, 150); rect(10, 10, 120, 40, 5);
    fill(255); textSize(20); text("النقاط: " + score, 20, 38);

    updateLogic();
}

function updateLogic() {
    let speed = 5;
    let moved = false;
    let me = players[myId];

    // تحكم الكمبيوتر
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { me.x -= speed; moved = true; }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { me.x += speed; moved = true; }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) { me.y -= speed; moved = true; }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { me.y += speed; moved = true; }

    // تحكم الموبايل
    if (moveDir.x !== 0 || moveDir.y !== 0) {
        me.x += moveDir.x * speed; me.y += moveDir.y * speed;
        moved = true;
    }

    // الزاوية
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.05) {
        myAngle = targetAngle; me.angle = myAngle;
        moved = true;
    }

    if (moved) socket.emit('move', me);
}

function shoot() {
    if(!gameStarted) return;
    let me = players[myId];
    bullets.push(new Bullet(me.x, me.y, myAngle));
}

function setupControls() {
    // أزرار الحركة
    const bind = (id, x, y) => {
        let b = document.getElementById(id);
        if(b) {
            b.ontouchstart = (e) => { e.preventDefault(); moveDir = {x, y}; };
            b.ontouchend = () => moveDir = {x:0, y:0};
        }
    };
    bind('btn-u', 0, -1); bind('btn-d', 0, 1); bind('btn-l', -1, 0); bind('btn-r', 1, 0);

    // زر الضرب للموبايل
    document.getElementById('shoot-btn').ontouchstart = (e) => { e.preventDefault(); shoot(); };
    // زر المسافة للكمبيوتر
    window.onkeydown = (e) => { if(e.keyCode === 32) shoot(); };
}

class Bullet {
    constructor(x, y, angle) { this.x = x; this.y = y; this.angle = angle; this.speed = 12; }
    update() { this.x += cos(this.angle) * this.speed; this.y += sin(this.angle) * this.speed; }
    draw() { fill(255, 255, 0); noStroke(); ellipse(this.x, this.y, 8); }
}

class Zombie {
    constructor() { this.x = random(1000, 2000); this.y = random(1000, 2000); }
    update(t) { let d = dist(this.x, this.y, t.x, t.y); if(d>1) { this.x += (t.x-this.x)/d * 1.5; this.y += (t.y-this.y)/d * 1.5; } }
    draw() { fill(50, 150, 50); stroke(0); ellipse(this.x, this.y, 35); }
}
