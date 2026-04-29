let socket, myId, players = {}, zombies = [], bullets = [], gameStarted = false;
let moveDir = { x: 0, y: 0 }, myName, myRoom, myAngle = 0, score = 0;
let ammo = 10, isQuizActive = false;

// متغيرات الصحة والموت
let playerHealth = 100, castleHealth = 500, isDead = false;
let respawnTimer = 0, gameOver = false, lastDamageTime = 0;

const questions = [
    { q: "تقع مصر في قارة:", a: ["آسيا", "أوروبا", "أفريقيا", "أستراليا"], correct: 2 },
    { q: "يحد مصر من الشمال:", a: ["البحر الأحمر", "البحر المتوسط", "ليبيا", "السودان"], correct: 1 },
    { q: "قناة تربط بين البحرين الأحمر والمتوسط:", a: ["بنما", "السويس", "النيل", "هرمز"], correct: 1 },
    { q: "العاصمة الإدارية لمصر هي:", a: ["الإسكندرية", "الجيزة", "القاهرة", "الأقصر"], correct: 2 },
    { q: "المناخ السائد في مصر:", a: ["استوائي", "معتدل صحراوي", "بارد", "قطبي"], correct: 1 },
    { q: "من مصادر الطاقة المتجددة:", a: ["البترول", "الفحم", "الشمس والرياح", "الغاز"], correct: 2 },
    { q: "أهمية قناة السويس:", a: ["للزراعة", "للتجارة العالمية", "للصناعة", "للسياحة"], correct: 1 }
];

function startMultiplayer(name, room) {
    socket = io();
    myName = name; myRoom = room;
    socket.emit('join', { name, room });
    socket.on('currentPlayers', (sp) => { players = sp; myId = socket.id; gameStarted = true; });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });
    
    // إنشاء زومبي كل 3 ثوانٍ
    setInterval(() => { 
        if(gameStarted && zombies.length < 8 && !gameOver && !isDead) {
            zombies.push(new Zombie()); 
        }
    }, 3000);
}

function setup() { createCanvas(windowWidth, windowHeight); setupControls(); }

function draw() {
    if(!gameStarted || !players[myId]) return;
    background(210, 180, 140);

    if (gameOver) { showGameOver("لقد سقطت القلعة! الزومبي احتلوا مصر!"); return; }
    if (score >= 3000) { showWinScreen(); return; }

    let me = players[myId];

    // نظام الموت (الانتظار 5 ثوانٍ)
    if (isDead) {
        handleDeath();
        return;
    }

    translate(width/2 - me.x, height/2 - me.y);

    // رسم الخريطة والقلعة
    drawMap();

    // رسم الرصاص
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        if (dist(bullets[i].x, bullets[i].y, me.x, me.y) > 900) bullets.splice(i, 1);
    }

    // رسم اللاعبين
    drawPlayers();

    // التعامل مع الزومبي (الهجوم والضرر)
    handleZombies(me);

    resetMatrix();
    drawUI();
    updateLogic();
}

function drawMap() {
    fill(30, 144, 255); noStroke(); rect(1500-30, 0, 60, 3000); // النيل
    
    // مبنى القلعة
    fill(100); stroke(50); strokeWeight(4);
    rect(1400, 1400, 200, 200); 
    fill(150); rect(1380, 1380, 40, 40); rect(1580, 1380, 40, 40);
    
    // شريط صحة القلعة
    fill(255, 0, 0); noStroke(); textAlign(CENTER); textSize(20);
    text("حصن القلعة: " + Math.ceil(castleHealth), 1500, 1370);
}

function drawPlayers() {
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            push(); translate(p.x, p.y); rotate(p.angle || 0);
            fill(id === myId ? "#4ade80" : "#ef4444");
            stroke(255); strokeWeight(2); ellipse(0,0,45);
            fill(0); ellipse(12,-10,6); ellipse(12,10,6);
            pop();
            fill(0); noStroke(); textAlign(CENTER); text(p.name, p.x, p.y - 45);
        }
    }
}

function handleZombies(me) {
    for (let i = zombies.length-1; i >= 0; i--) {
        zombies[i].update(me); zombies[i].draw();

        // 1. هجوم الزومبي على اللاعب (ضرر قوي)
        let dToMe = dist(zombies[i].x, zombies[i].y, me.x, me.y);
        if (dToMe < 35 && !isDead) {
            if (millis() - lastDamageTime > 500) { // ضربة كل نصف ثانية
                playerHealth -= 20; // 5 ضربات واللاعب يموت
                lastDamageTime = millis();
                if (playerHealth <= 0) {
                    playerHealth = 0;
                    isDead = true;
                    respawnTimer = millis() + 5000;
                }
            }
        }

        // 2. هجوم الزومبي على القلعة
        if (zombies[i].x > 1400 && zombies[i].x < 1600 && zombies[i].y > 1400 && zombies[i].y < 1600) {
            castleHealth -= 0.5;
            if (castleHealth <= 0) gameOver = true;
        }

        // 3. قتل الزومبي بالرصاص
        for (let j = bullets.length-1; j >= 0; j--) {
            if (dist(bullets[j].x, bullets[j].y, zombies[i].x, zombies[i].y) < 30) {
                zombies.splice(i, 1); bullets.splice(j, 1); score += 100;
                break;
            }
        }
    }
}

function handleDeath() {
    background(0, 230);
    fill(255, 0, 0); textAlign(CENTER); textSize(40);
    text("لقد هزمك الزومبي!", width/2, height/2 - 40);
    fill(255); textSize(24);
    let timeLeft = Math.ceil((respawnTimer - millis()) / 1000);
    text("ستعود للدفاع عن القلعة بعد: " + (timeLeft > 0 ? timeLeft : 0) + " ثوانٍ", width/2, height/2 + 20);
    
    if (millis() > respawnTimer) {
        playerHealth = 100; isDead = false;
        players[myId].x = 1500; players[myId].y = 1500;
    }
}

function drawUI() {
    fill(0, 180); rect(10, 10, 200, 120, 10);
    fill(255); textSize(18); textAlign(LEFT);
    text("النقاط: " + score, 25, 40);
    fill("#fbbf24"); text("الرصاص: " + ammo, 25, 70);
    fill(0, 255, 0); text("صحتك: " + Math.ceil(playerHealth), 25, 100);
}

function showGameOver(msg) {
    background(0); fill(255, 0, 0); textAlign(CENTER); textSize(45);
    text("GAME OVER", width/2, height/2 - 50);
    fill(255); textSize(22); text(msg, width/2, height/2 + 10);
    text("اضغط في أي مكان لإعادة المحاولة", width/2, height/2 + 70);
    if (mouseIsPressed) location.reload();
}

function showWinScreen() {
    background(0, 200); fill("#fbbf24"); textAlign(CENTER); textSize(45);
    text("🏆 مبروك الفوز يا بطل! 🏆", width/2, height/2 - 40);
    fill(255); textSize(22); text("أنقذت القلعة وحصلت على 3000 نقطة!", width/2, height/2 + 20);
    if (mouseIsPressed) location.reload();
}

function updateLogic() {
    let speed = 5.5, moved = false, me = players[myId];
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
    if (!gameStarted || isQuizActive || isDead || gameOver) return;
    if (ammo > 0) {
        bullets.push(new Bullet(players[myId].x, players[myId].y, myAngle));
        ammo--;
    } else { showQuiz(); }
}

function showQuiz() {
    isQuizActive = true;
    let q = random(questions);
    let ans = prompt(q.q + "\n" + q.a.map((o,i)=>(i+1)+"- "+o).join("\n") + "\nاكتب رقم الإجابة الصحيحة:");
    if (ans == (q.correct + 1)) { ammo += 5; alert("صح ✅ أخذت 5 طلقات!"); }
    else { alert("غلط ❌ ركز في المذاكرة!"); }
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
    update() { this.x += cos(this.angle) * 14; this.y += sin(this.angle) * 14; }
    draw() { fill(255, 255, 0); noStroke(); ellipse(this.x, this.y, 10); }
}

class Zombie {
    constructor() {
        let side = floor(random(4));
        if(side==0){this.x=random(1000,2000); this.y=500;}
        else if(side==1){this.x=random(1000,2000); this.y=2500;}
        else if(side==2){this.x=500; this.y=random(1000,2000);}
        else {this.x=2500; this.y=random(1000,2000);}
    }
    update(t) { 
        let targetX = 1500, targetY = 1500;
        if (dist(this.x, this.y, t.x, t.y) < 350) { targetX = t.x; targetY = t.y; }
        let d = dist(this.x, this.y, targetX, targetY);
        if(d>1) { this.x += (targetX-this.x)/d * 1.9; this.y += (targetY-this.y)/d * 1.9; }
    }
    draw() { fill(50, 150, 50); stroke(0); strokeWeight(1); ellipse(this.x, this.y, 38); }
}
