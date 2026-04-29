let socket, myId, myRoom;
let players = {};
let zombies = [];
let bullets = [];
let score = 0, ammo = 15, hp = 100, castleHP = 500;
let gameStarted = false;
let myX = 1500, myY = 1500, myAngle = 0; // إحداثيات افتراضية عشان تبدأ فوراً

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('display', 'block');
    
    // إنشاء زومبي محلي فوراً عشان اللعبة متبقاش فاضية
    for(let i=0; i<5; i++) {
        zombies.push({ id: Math.random(), x: random(1000, 2000), y: random(1000, 2000), hp: 50 });
    }
}

function startMultiplayer(name, room) {
    myRoom = room;
    // محاولة الاتصال بالسيرفر (لو السيرفر واقف اللعبة هتكمل عادي)
    try {
        socket = io();
        socket.emit('join', { name, room });
        socket.on('updateState', (state) => {
            players = state.players;
            myId = socket.id;
        });
        socket.on('newZombie', (z) => { zombies.push(z); });
        socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
    } catch(e) { console.log("لعب فردي حالياً"); }
    
    gameStarted = true;
}

function draw() {
    if (!gameStarted) return;

    background(20, 25, 35); // لون الخريطة

    // الكاميرا تتبع اللاعب
    translate(width/2 - myX, height/2 - myY);

    // رسم القلعة
    drawCastle();

    // رسم الزومبي وتحريكهم
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        drawZombie(z.x, z.y);
        
        // ذكاء اصطناعي للزومبي (يطارد القلعة)
        let angle = atan2(1500 - z.y, 1500 - z.x);
        z.x += cos(angle) * 1.5;
        z.y += sin(angle) * 1.5;

        // لمس الزومبي للقلعة
        if (dist(z.x, z.y, 1500, 1500) < 100) castleHP -= 0.1;
        
        // لمس الزومبي للاعب
        if (dist(z.x, z.y, myX, myY) < 40) hp -= 0.2;
    }

    // رسم اللاعب (أنا)
    drawPlayer(myX, myY, myAngle, true);

    // رسم الرصاص
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        // قتل الزومبي
        for(let j = zombies.length-1; j>=0; j--) {
            if(dist(bullets[i].x, bullets[i].y, zombies[j].x, zombies[j].y) < 30) {
                zombies.splice(j, 1);
                bullets.splice(i, 1);
                score += 100;
                break;
            }
        }
    }

    resetMatrix();
    updateUI();
    moveLogic();
}

function drawCastle() {
    fill(100); stroke(251, 191, 36); strokeWeight(4);
    rect(1400, 1400, 200, 200, 15);
    fill(255, 0, 0); noStroke();
    rect(1410, 1380, map(castleHP, 0, 500, 0, 180), 10); // بار دم القلعة
}

function drawPlayer(x, y, a, isMe) {
    push();
    translate(x, y);
    rotate(a);
    fill(isMe ? "#4ade80" : "#3b82f6");
    stroke(255);
    ellipse(0, 0, 45);
    fill(50); rect(15, -7, 20, 14); // السلاح
    pop();
}

function drawZombie(x, y) {
    fill(50, 150, 50); stroke(0);
    ellipse(x, y, 40);
    fill(255, 0, 0); ellipse(x+10, y-8, 5); ellipse(x+10, y+8, 5);
}

function moveLogic() {
    let speed = 5;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) myX -= speed;
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) myX += speed;
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) myY -= speed;
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) myY += speed;
    
    // التحكم باللمس (لو ضغطت على الشاشة اللاعب يلف ناحية الضغطة)
    if (mouseIsPressed) {
        myAngle = atan2(mouseY - height/2, mouseX - width/2);
    }
    
    if (socket && socket.connected) {
        socket.emit('move', { x: myX, y: myY, angle: myAngle, room: myRoom });
    }
}

function mousePressed() {
    if (gameStarted && ammo > 0) {
        bullets.push(new Bullet(myX, myY, myAngle));
        ammo--;
    } else if (ammo <= 0) {
        let ans = prompt("سؤال دراسات سريع: ما هي أعلى قمة جبلية في مصر؟");
        if(ans && ans.includes("كاترين")) { ammo = 15; alert("رصاصك اتعمر!"); }
    }
}

class Bullet {
    constructor(x, y, a) { this.x = x; this.y = y; this.a = a; }
    update() { this.x += cos(this.a) * 12; this.y += sin(this.a) * 12; }
    draw() { fill(255, 255, 0); noStroke(); ellipse(this.x, this.y, 8); }
}

function updateUI() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('ammo-val').innerText = ammo;
    document.getElementById('hp-val').innerText = Math.ceil(hp);
    document.getElementById('castle-val').innerText = Math.ceil(castleHP);
}
