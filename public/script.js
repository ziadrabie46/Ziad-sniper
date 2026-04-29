let socket, myId, myRoom, players = {}, zombies = [], bullets = [], mines = [];
let gameStarted = false, ammo = 15, score = 0, level = 1;
let playerHealth = 100, castleHealth = 500, isDead = false;

// تحميل الأصوات
let shootSound, hitSound, levelUpSound;
function preload() {
    // تأكد من وجود الملفات دي في مجلد public/sounds أو شيل السطور دي لو مش معاك أصوات حالياً
    // shootSound = loadSound('sounds/shoot.mp3');
    // levelUpSound = loadSound('sounds/win.mp3');
}

function setup() { 
    createCanvas(windowWidth, windowHeight); 
}

function startMultiplayer(name, room) {
    myRoom = room;
    socket = io();
    socket.emit('join', { name, room });

    socket.on('updateState', (state) => {
        players = state.players;
        myId = socket.id;
        gameStarted = true;
    });

    socket.on('newZombie', (z) => { zombies.push(z); });
    socket.on('playerMoved', (p) => { players[p.id] = p; });
    socket.on('playerLeft', (id) => { delete players[id]; });
}

function draw() {
    if (!gameStarted || !players[myId]) return;
    background(30, 40, 50); // لون غامق عشان الحماس

    let me = players[myId];
    if (isDead) { displayRespawn(); return; }

    translate(width/2 - me.x, height/2 - me.y);

    // رسم القلعة (الحصن)
    drawCastle();

    // رسم الألغام (Mines)
    for (let m of mines) {
        fill(255, 0, 0); ellipse(m.x, m.y, 15);
    }

    // رسم الزومبي (الكل بيشوف نفس الزومبي)
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        drawZombie(z);
        moveZombieTowardTarget(z, me);

        // تصادم الزومبي مع الألغام
        for (let j = mines.length - 1; j >= 0; j--) {
            if (dist(z.x, z.y, mines[j].x, mines[j].y) < 30) {
                zombies.splice(i, 1);
                mines.splice(j, 1);
                score += 150;
                break;
            }
        }
    }

    // رسم اللاعبين الآخرين
    for (let id in players) {
        let p = players[id];
        push();
        translate(p.x, p.y); rotate(p.angle);
        fill(id === myId ? "#00ff00" : "#00ffff");
        ellipse(0, 0, 45); 
        fill(255); rect(10, -5, 20, 10); // سلاح
        pop();
    }

    // الرصاص
    for (let b of bullets) { b.update(); b.draw(); checkBulletHit(b); }

    checkLevelUp();
    resetMatrix();
    drawHUD();
    handleMovement(me);
}

function drawCastle() {
    fill(100); rect(1400, 1400, 200, 200);
    fill(255, 0, 0); textSize(20); textAlign(CENTER);
    text("حصن الفريق 🏰: " + Math.ceil(castleHealth), 1500, 1380);
}

function drawZombie(z) {
    fill(50, 150, 50); ellipse(z.x, z.y, 40);
    fill(255, 0, 0); rect(z.x - 20, z.y - 30, 40, 5); // شريط دم الزومبي
}

function moveZombieTowardTarget(z, me) {
    let target = { x: 1500, y: 1500 }; // الهدف الأساسي القلعة
    // لو أي لاعب قرب، الزومبي يطارد أقرب واحد
    for (let id in players) {
        let p = players[id];
        if (dist(z.x, z.y, p.x, p.y) < 300) target = p;
    }
    let angle = atan2(target.y - z.y, target.x - z.x);
    z.x += cos(angle) * (1.5 + level * 0.5);
    z.y += sin(angle) * (1.5 + level * 0.5);

    // ضرر القلعة
    if (dist(z.x, z.y, 1500, 1500) < 100) castleHealth -= 0.1;
}

function checkBulletHit(b) {
    for (let i = zombies.length - 1; i >= 0; i--) {
        if (dist(b.x, b.y, zombies[i].x, zombies[i].y) < 30) {
            zombies.splice(i, 1);
            score += 100;
            // if(hitSound) hitSound.play();
        }
    }
}

function checkLevelUp() {
    let nextLevel = Math.floor(score / 2000) + 1;
    if (nextLevel > level) {
        level = nextLevel;
        ammo += 20;
        // if(levelUpSound) levelUpSound.play();
        alert("ليفل جديد! المستوى " + level);
    }
}

function drawHUD() {
    fill(0, 150); rect(10, 10, 220, 140, 10);
    fill("#fbbf24"); textSize(20);
    text("المستوى: " + level, 20, 40);
    text("سكور الفريق: " + score, 20, 70);
    text("الرصاص: " + ammo, 20, 100);
    fill(0, 255, 0); text("دمك: " + Math.ceil(playerHealth), 20, 130);
}

function shoot() {
    if (ammo > 0) {
        bullets.push(new Bullet(players[myId].x, players[myId].y, players[myId].angle));
        ammo--;
        // if(shootSound) shootSound.play();
    } else {
        askQuestion(); // نظام الأسئلة القديم لتعمير السلاح
    }
}

// إضافة لغم (M)
function deployMine() {
    if (score >= 500) {
        score -= 500;
        mines.push({ x: players[myId].x, y: players[myId].y });
    }
}

// الكلاسات المساعدة (Bullet, Movement...) تبقى كما هي مع ربطها بالـ socket.emit
