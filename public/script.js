let socket, myId, myRoom, players = {}, zombies = [], bullets = [], mines = [];
let score = 0, ammo = 15, hp = 100, castleHP = 500, level = 1;
let isDead = false, gameStarted = false;

function startMultiplayer(name, room) {
    socket = io();
    myRoom = room;
    socket.emit('join', { name, room });
    socket.on('updateState', (state) => { players = state.players; myId = socket.id; gameStarted = true; });
    socket.on('newZombie', (z) => { zombies.push(z); });
    socket.on('playerMoved', (p) => { players[p.id] = p; });
    document.getElementById('fire-btn').style.display = 'flex';
}

function setup() { createCanvas(windowWidth, windowHeight); }

function draw() {
    if (!gameStarted || !players[myId]) return;
    background(20, 25, 30); // أرضية اللعبة
    
    let me = players[myId];
    if (hp <= 0) { showDeathScreen(); return; }

    translate(width/2 - me.x, height/2 - me.y);

    // رسم القلعة بشكل فخم
    drawCastle();

    // رسم الألغام
    for (let m of mines) {
        fill(255, 50, 50); stroke(255); ellipse(m.x, m.y, 20); 
        noFill(); stroke(255, 50, 50, 100); ellipse(m.x, m.y, 40 + sin(frameCount*0.1)*10);
    }

    // رسم الزومبي وتأثيراتهم
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        drawZombieShape(z.x, z.y);
        
        // ذكاء الزومبي: يطارد القلعة أو أقرب لاعب
        let d = dist(z.x, z.y, 1500, 1500);
        if (d < 100) castleHP -= 0.2;
        
        let angle = atan2(1500 - z.y, 1500 - z.x);
        z.x += cos(angle) * (1 + level * 0.3);
        z.y += sin(angle) * (1 + level * 0.3);

        // انفجار اللغم
        for (let j = mines.length - 1; j >= 0; j--) {
            if (dist(z.x, z.y, mines[j].x, mines[j].y) < 30) {
                zombies.splice(i, 1); mines.splice(j, 1); score += 200;
                break;
            }
        }
    }

    // رسم اللاعبين بتصميم قتالي
    for (let id in players) {
        drawPlayerShape(players[id]);
    }

    // الرصاص
    for (let b of bullets) { b.update(); b.draw(); checkHit(b); }

    resetMatrix();
    updateUI();
    handleKeys(me);
}

function drawPlayerShape(p) {
    push();
    translate(p.x, p.y);
    rotate(p.angle);
    // الجسم
    fill(p.id === myId ? "#4ade80" : "#3b82f6");
    stroke(255); strokeWeight(2);
    ellipse(0, 0, 45);
    // السلاح
    fill(50); rect(15, -8, 25, 16, 3);
    // العيون
    fill(255); ellipse(10, -10, 8); ellipse(10, 10, 8);
    pop();
    fill(255); textAlign(CENTER); text(p.name, p.x, p.y - 40);
}

function drawZombieShape(x, y) {
    fill(74, 103, 65); stroke(0);
    ellipse(x, y, 40);
    fill(255, 0, 0); ellipse(x+10, y-8, 5); ellipse(x+10, y+8, 5); // عيون حمراء
}

function drawCastle() {
    fill(60); stroke(30); strokeWeight(5);
    rect(1400, 1400, 200, 200, 10);
    // بوابات وأبراج
    fill(40); rect(1470, 1550, 60, 50); 
    fill(255, 0, 0); noStroke();
    rect(1410, 1380, 180, 10); // بار الصحة للقلعة
}

function updateUI() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('ammo-val').innerText = ammo;
    document.getElementById('hp-val').innerText = Math.ceil(hp);
    document.getElementById('castle-val').innerText = Math.ceil(castleHP);
    if (score >= 500) document.getElementById('shop-menu').style.display = 'block';
}

function buyMine() { if(score >= 500) { score -= 500; mines.push({x: players[myId].x, y: players[myId].y}); } }
function buyHealth() { if(score >= 300) { score -= 300; hp = 100; } }

// نظام الحركة والضرب بالسبيس والموبايل
function handleKeys(me) {
    let moved = false;
    if (keyIsDown(65)) { me.x -= 5; moved = true; }
    if (keyIsDown(68)) { me.x += 5; moved = true; }
    if (keyIsDown(87)) { me.y -= 5; moved = true; }
    if (keyIsDown(83)) { me.y += 5; moved = true; }
    me.angle = atan2(mouseY - height/2, mouseX - width/2);
    if (moved) socket.emit('move', {x: me.x, y: me.y, angle: me.angle, room: myRoom});
}

function shoot() {
    if (ammo > 0) {
        bullets.push(new Bullet(players[myId].x, players[myId].y, players[myId].angle));
        ammo--;
    } else {
        // هنا تظهر أسئلة الدراسات لتعمير السلاح
        let ans = prompt("سؤال سريع: ما هي عاصمة مصر؟");
        if(ans == "القاهرة") { ammo = 15; alert("عاش! رصاصك اتعمر"); }
    }
}

class Bullet {
    constructor(x, y, a) { this.x = x; this.y = y; this.a = a; }
    update() { this.x += cos(this.a) * 15; this.y += sin(this.a) * 15; }
    draw() { fill(255, 255, 0); noStroke(); ellipse(this.x, this.y, 8); }
}
