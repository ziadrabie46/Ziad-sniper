let socket, myId, players = {}, zombies = [], bullets = [], gameStarted = false;
let moveDir = { x: 0, y: 0 }, myName, myRoom, myAngle = 0, score = 0;
let ammo = 5, isQuizActive = false;

const questions = [
    { q: "تقع مصر في قارة:", a: ["آسيا", "أوروبا", "أفريقيا", "أستراليا"], correct: 2 },
    { q: "يحد مصر من الشمال:", a: ["البحر الأحمر", "البحر المتوسط", "ليبيا", "السودان"], correct: 1 },
    { q: "قناة تربط بين البحرين الأحمر والمتوسط:", a: ["بنما", "السويس", "النيل", "هرمز"], correct: 1 },
    { q: "المناخ السائد في مصر:", a: ["استوائي", "معتدل صحراوي", "بارد", "قطبي"], correct: 1 },
    { q: "من مصادر الطاقة المتجددة:", a: ["البترول", "الفحم", "الشمس والرياح", "الغاز"], correct: 2 },
    { q: "من وسائل النقل الجوي:", a: ["السفينة", "القطار", "الطائرة", "المترو"], correct: 2 },
    { q: "أهمية قناة السويس:", a: ["للزراعة", "للتجارة العالمية", "للصناعة", "للسياحة"], correct: 1 }
];

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;
    socket.emit('join', { name, room });
    socket.on('currentPlayers', (sp) => { players = sp; myId = socket.id; gameStarted = true; });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });
    setInterval(() => { if(gameStarted && zombies.length < 6 && score < 3000) zombies.push(new Zombie()); }, 3000);
}

function setup() { createCanvas(windowWidth, windowHeight); setupControls(); }

function draw() {
    if(!gameStarted || !players[myId]) return;
    background(210, 180, 140);
    
    let me = players[myId];

    if (score < 3000) {
        translate(width/2 - me.x, height/2 - me.y);
        fill(30, 144, 255); rect(1500-30, 0, 60, 3000); // نهر النيل

        for (let b of bullets) { b.update(); b.draw(); }

        for (let id in players) {
            let p = players[id];
            if (p.room === myRoom) {
                push(); translate(p.x, p.y); rotate(p.angle || 0);
                fill(id === myId ? "#4ade80" : "#ef4444");
                stroke(255); strokeWeight(2); ellipse(0,0,45);
                fill(0); ellipse(12,-10,6); ellipse(12,10,6);
                pop();
                fill(0); textAlign(CENTER); text(p.name, p.x, p.y - 45);
            }
        }

        for (let i = zombies.length-1; i >= 0; i--) {
            zombies[i].update(me); zombies[i].draw();
            for (let j = bullets.length-1; j >= 0; j--) {
                if (dist(bullets[j].x, bullets[j].y, zombies[i].x, zombies[i].y) < 30) {
                    zombies.splice(i, 1); bullets.splice(j, 1); score += 100;
                    break;
                }
            }
        }
        resetMatrix();
        drawUI();
        updateLogic();
    } else {
        showWinScreen();
    }
}

function drawUI() {
    fill(0, 150); rect(10, 10, 160, 80, 10);
    fill(255); textSize(18); text("النقاط: " + score, 25, 40);
    fill(ammo > 0 ? "#fbbf24" : "#ff4444"); text("الرصاص: " + ammo, 25, 70);
}

function showWinScreen() {
    resetMatrix();
    fill(0, 220); rect(0, 0, width, height);
    fill("#fbbf24"); textAlign(CENTER); textSize(40);
    text("🏆 مبروك الفوز يا بطل! 🏆", width/2, height/2 - 40);
    fill(255); textSize(20); text("وصلت لـ 3000 نقطة وبقيت أسطورة الدراسات", width/2, height/2 + 20);
    text("اضغط في أي مكان للبدء من جديد", width/2, height/2 + 80);
    if (mouseIsPressed) location.reload();
}

function updateLogic() {
    let speed = 5, moved = false, me = players[myId];
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { me.x -= speed; moved = true; }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { me.x += speed; moved = true; }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) { me.y -= speed; moved = true; }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { me.y += speed; moved = true; }
    if (moveDir.x !== 0 || moveDir.y !== 0) { me.x += moveDir.x * speed; me.y += moveDir.y * speed; moved = true; }
    
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.05) { myAngle = targetAngle; me.angle = myAngle; moved = true; }
    if (moved) socket.emit('move', me);
}

function shoot() {
    if (!gameStarted || isQuizActive || score >= 3000) return;
    if (ammo > 0) {
        bullets.push(new Bullet(players[myId].x, players[myId].y, myAngle));
        ammo--;
    } else { showQuiz(); }
}

function showQuiz() {
    isQuizActive = true;
    let q = random(questions);
    let ans = prompt(q.q + "\n" + q.a.map((o,i)=>(i+1)+"- "+o).join("\n") + "\nاكتب رقم الإجابة:");
    if (ans == (q.correct + 1)) { ammo += 3; alert("إجابة صحيحة ✅ +3 طلقات"); }
    else { alert("إجابة خاطئة ❌ حاول مرة أخرى"); }
    isQuizActive = false;
}

function setupControls() {
    const bind = (id, x, y) => {
        let b = document.getElementById(id);
        if(b) {
            b.ontouchstart = (e) => { e.preventDefault(); moveDir = {x, y}; };
            b.ontouchend = () => moveDir = {x:0, y:0};
        }
    };
    bind('btn-u', 0, -1); bind('btn-d', 0, 1); bind('btn-l', -1, 0); bind('btn-r', 1, 0);
    document.getElementById('shoot-btn').ontouchstart = (e) => { e.preventDefault(); shoot(); };
    window.onkeydown = (e) => { if(e.keyCode === 32) shoot(); };
}

class Bullet {
    constructor(x, y, angle) { this.x = x; this.y = y; this.angle = angle; }
    update() { this.x += cos(this.angle) * 12; this.y += sin(this.angle) * 12; }
    draw() { fill(255, 255, 0); noStroke(); ellipse(this.x, this.y, 10); }
}

class Zombie {
    constructor() { this.x = random(1000, 2000); this.y = random(1000, 2000); }
    update(t) { let d = dist(this.x, this.y, t.x, t.y); if(d>1) { this.x += (t.x-this.x)/d * 1.8; this.y += (t.y-this.y)/d * 1.8; } }
    draw() { fill(50, 150, 50); stroke(0); ellipse(this.x, this.y, 35); }
}
