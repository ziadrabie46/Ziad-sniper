let socket, myId, players = {}, zombies = [], bullets = [], gameStarted = false;
let move = {x:0, y:0}, myName, myRoom, myAngle = 0;
let ammo = 20, score = 0;

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;

    socket.emit('join', { name: name, room: room });
    socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; myId = socket.id; gameStarted = true; });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });

    // ظهور زومبي كل 3 ثواني
    setInterval(() => { 
        if(gameStarted && zombies.length < 8) {
            zombies.push(new Zombie(random(1000, 2000), random(1000, 2000)));
        }
    }, 3000);
}

function setup() { 
    createCanvas(windowWidth, windowHeight); 
}

function draw() {
    if(!gameStarted || !players[myId]) return;
    background(210, 180, 140); // أرضية الخريطة
    
    let me = players[myId];
    // الكاميرا تتبع اللاعب
    translate(width/2 - me.x, height/2 - me.y);

    // رسم الخريطة (نهر النيل كعلامة)
    fill(30, 144, 255); rect(1500-25, 0, 50, 3000);

    // رسم اللاعبين الآخرين وأنا
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            drawPlayer(p, id === myId);
        }
    }

    // إدارة الرصاص
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        // فحص إصابة الزومبي
        for (let j = zombies.length - 1; j >= 0; j--) {
            if (dist(bullets[i].x, bullets[i].y, zombies[j].x, zombies[j].y) < 25) {
                zombies.splice(j, 1);
                bullets.splice(i, 1);
                score += 50;
                break;
            }
        }
        if (bullets[i] && bullets[i].life <= 0) bullets.splice(i, 1);
    }

    // إدارة الزومبي
    for (let z of zombies) { 
        z.update(me); 
        z.draw(); 
        if(dist(z.x, z.y, me.x, me.y) < 30) {
            console.log("إصابة!"); // هنا ممكن تضيف نقص دم
        }
    }

    updateLogic();
    drawUI(me);
}

function drawPlayer(p, isMe) {
    push();
    translate(p.x, p.y);
    rotate(p.angle || 0);
    fill(isMe ? "#4ade80" : "#ef4444");
    stroke(255); strokeWeight(2);
    ellipse(0,0,45);
    // الوش والسلاح
    fill(0); ellipse(12, -10, 6); ellipse(12, 10, 6); 
    fill(50); rect(15, -4, 20, 8); // ماسورة السلاح
    pop();
    fill(0); textAlign(CENTER); text(p.name, p.x, p.y - 45);
}

function updateLogic() {
    let moved = false;
    let me = players[myId];
    
    if (move.x !== 0 || move.y !== 0) {
        me.x += move.x * 6;
        me.y += move.y * 6;
        moved = true;
    }

    // اللف ناحية اللمس/الماوس
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.05) {
        myAngle = targetAngle;
        me.angle = myAngle;
        moved = true;
    }

    if (moved) socket.emit('move', me);
}

// إطلاق النار عند لمس الشاشة (بعيداً عن أزرار الحركة)
function mousePressed() {
    if (gameStarted && mouseY < height - 150) {
        let me = players[myId];
        bullets.push(new Bullet(me.x, me.y, myAngle));
    }
}

function drawUI(me) {
    resetMatrix(); // تثبيت الواجهة على الشاشة
    fill(0, 150); rect(10, 10, 150, 80, 10);
    fill(255); textSize(16);
    text("النقاط: " + score, 20, 35);
    text("اللاعب: " + myName, 20, 60);
}

class Bullet {
    constructor(x, y, angle) {
        this.x = x; this.y = y;
        this.vx = cos(angle) * 12;
        this.vy = sin(angle) * 12;
        this.life = 60;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; }
    draw() { fill("#fbbf24"); noStroke(); ellipse(this.x, this.y, 8); }
}

class Zombie {
    constructor(x, y) { this.x = x; this.y = y; }
    update(t) { 
        let d = dist(this.x, this.y, t.x, t.y);
        if (d > 1) { this.x += (t.x-this.x)/d * 2.5; this.y += (t.y-this.y)/d * 2.5; }
    }
    draw() { fill(255, 50, 50); stroke(0); ellipse(this.x, this.y, 35); }
}

// ربط أزرار الموبايل
window.onload = () => {
    const s = (id, x, y) => {
        let b = document.getElementById(id);
        if(b) {
            b.addEventListener('touchstart', (e) => { e.preventDefault(); move = {x, y}; });
            b.addEventListener('touchend', () => { move = {x:0, y:0}; });
        }
    };
    s('btn-u', 0, -1); s('btn-d', 0, 1); s('btn-l', -1, 0); s('btn-r', 1, 0);
};
