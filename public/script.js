let socket, myId, myRoom, gameStarted = false;
let myX = 1500, myY = 1500, myAngle = 0;
let players = {}, zombies = [], bullets = [], mines = [], spikes = [];
let score = 0, ammo = 20, hp = 100, castleHP = 500;
let defenseActive = true, quizTimer = 0, quizActive = false;

// إعداد الخريطة والكاميرا
function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('display', 'block');
    // توليد زومبي عشوائي في البداية
    for(let i=0; i<8; i++) spawnZombie();
}

function startMultiplayer(name, room) {
    myRoom = room;
    gameStarted = true;
    // (هنا يمكن إضافة ربط السيرفر لاحقاً بنفس الطريقة السابقة)
}

function draw() {
    if (!gameStarted) return;

    background(30, 35, 45);

    // الكاميرا تتبع اللاعب بحرية
    translate(width/2 - myX, height/2 - myY);

    // رسم الأرضية (شبكة لتوضيح الحركة)
    drawGrid();

    // رسم القلعة والحماية
    drawDefense();

    // إدارة الألغام والشوك
    handleTraps();

    // إدارة الزومبي
    handleZombies();

    // رسم الرصاص
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        if (bullets[i].offScreen()) bullets.splice(i, 1);
    }

    // رسم اللاعب (أنا)
    drawPlayer(myX, myY, myAngle, true);

    resetMatrix();
    drawHUD();
    controlLogic();
    checkQuizCondition();
}

function drawGrid() {
    stroke(50);
    for (let x = 0; x < 3000; x += 100) line(x, 0, x, 3000);
    for (let y = 0; y < 3000; y += 100) line(0, y, 3000, y);
}

function drawDefense() {
    // القلعة
    fill(80); stroke(200); strokeWeight(4);
    rect(1400, 1400, 200, 200, 10);
    
    // سور الحماية (يختفي لو التحدي فشل)
    if (defenseActive) {
        noFill(); stroke(0, 200, 255, 150); strokeWeight(10);
        ellipse(1500, 1500, 400); 
    }
}

function handleTraps() {
    // الألغام
    for (let i = mines.length - 1; i >= 0; i--) {
        fill(255, 0, 0); stroke(255); strokeWeight(2);
        ellipse(mines[i].x, mines[i].y, 20);
    }
    // الشوك
    for (let s of spikes) {
        fill(150); stroke(50);
        triangle(s.x, s.y-15, s.x-10, s.y+5, s.x+10, s.y+5);
    }
}

function handleZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        // رسم الزومبي
        fill(50, 150, 50); ellipse(z.x, z.y, 40);
        
        // حركة الزومبي نحو القلعة أو اللاعب
        let target = (dist(z.x, z.y, myX, myY) < 300) ? {x: myX, y: myY} : {x: 1500, y: 1500};
        let angle = atan2(target.y - z.y, target.x - z.x);
        z.x += cos(angle) * 1.5;
        z.y += sin(angle) * 1.5;

        // تصادم مع الشوك (يُبطئ الزومبي ويقتله ببطء)
        for (let s of spikes) {
            if (dist(z.x, z.y, s.x, s.y) < 30) { z.x -= cos(angle)*1; z.y -= sin(angle)*1; }
        }

        // انفجار لغم
        for (let j = mines.length - 1; j >= 0; j--) {
            if (dist(z.x, z.y, mines[j].x, mines[j].y) < 40) {
                zombies.splice(i, 1); mines.splice(j, 1); score += 150; spawnZombie();
                return;
            }
        }
    }
}

function controlLogic() {
    let speed = 5;
    if (keyIsDown(65)) myX -= speed; // A
    if (keyIsDown(68)) myX += speed; // D
    if (keyIsDown(87)) myY -= speed; // W
    if (keyIsDown(83)) myY += speed; // S
    
    myAngle = atan2(mouseY - height/2, mouseX - width/2);
}

function checkQuizCondition() {
    // كل دقيقة الحماية بتختفي
    if (frameCount % 3600 === 0 && !quizActive) {
        defenseActive = false;
        quizActive = true;
        startUrgentQuiz();
    }
}

async function startUrgentQuiz() {
    alert("⚠️ الحماية سقطت! حل 5 أسئلة في 30 ثانية لإعادتها!");
    let correctCount = 0;
    let startTime = Date.now();
    
    for(let i=0; i<5; i++) {
        let a = floor(random(1, 10)), b = floor(random(1, 10));
        let ans = prompt(`سؤال ${i+1}: كم ناتج ${a} + ${b}?`);
        if (ans == (a + b)) correctCount++;
    }

    let timeTaken = (Date.now() - startTime) / 1000;
    if (correctCount === 5 && timeTaken <= 30) {
        defenseActive = true;
        alert("✅ بطل! الحماية عادت");
    } else {
        alert("❌ فشلت! الزومبي سيهاجمون القلعة الآن!");
    }
    quizActive = false;
}

function mousePressed() {
    if (ammo > 0) {
        bullets.push(new Bullet(myX, myY, myAngle));
        ammo--;
    }
}

function keyPressed() {
    if (key === 'm' || key === 'M') { // شراء لغم بـ 500 نقطة
        if (score >= 500) { score -= 500; mines.push({x: myX, y: myY}); }
    }
    if (key === 's' || key === 'S' && !keyIsDown(83)) { // شراء شوك بـ 300 نقطة
        if (score >= 300) { score -= 300; spikes.push({x: myX, y: myY}); }
    }
}

class Bullet {
    constructor(x, y, a) { this.x = x; this.y = y; this.a = a; }
    update() { this.x += cos(this.a) * 15; this.y += sin(this.a) * 15; }
    draw() { fill(255, 250, 0); ellipse(this.x, this.y, 8); }
    offScreen() { return dist(this.x, this.y, myX, myY) > 1000; }
}

function spawnZombie() {
    zombies.push({x: random(0, 3000), y: random(0, 3000)});
}

function drawPlayer(x, y, a, isMe) {
    push(); translate(x, y); rotate(a);
    fill(0, 255, 100); ellipse(0, 0, 45);
    fill(50); rect(15, -7, 20, 14);
    pop();
}

function drawHUD() {
    fill(0, 150); rect(10, 10, 250, 150, 10);
    fill(255); textSize(16);
    text(`💰 السكور: ${score}`, 20, 40);
    text(`🔋 الرصاص: ${ammo}`, 20, 70);
    text(`🛡️ الحماية: ${defenseActive ? "فعالة" : "معطلة"}`, 20, 100);
    text(`🛒 M: لغم (500) | S: شوك (300)`, 20, 130);
}
