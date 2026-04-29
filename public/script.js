let socket, myId, myRoom, gameStarted = false;
let myX = 1500, myY = 1500, myAngle = 0;
let players = {}, zombies = [], bullets = [], mines = [], spikes = [];
let score = 0, ammo = 20, hp = 100, castleHP = 500;
let defenseActive = true, quizActive = false;
let moveState = { up: false, down: false, left: false, right: false };

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('display', 'block');
    for(let i=0; i<10; i++) spawnZombie();
    setupMobileControls();
}

function setupMobileControls() {
    const bind = (id, dir) => {
        let el = document.getElementById(id);
        el.ontouchstart = (e) => { e.preventDefault(); moveState[dir] = true; };
        el.ontouchend = (e) => { e.preventDefault(); moveState[dir] = false; };
    };
    bind('upBtn', 'up'); bind('downBtn', 'down'); bind('leftBtn', 'left'); bind('rightBtn', 'right');
    
    document.getElementById('shootBtn').ontouchstart = (e) => { e.preventDefault(); shoot(); };
    document.getElementById('mineBtn').ontouchstart = (e) => { e.preventDefault(); buyMine(); };
    document.getElementById('spikeBtn').ontouchstart = (e) => { e.preventDefault(); buySpikes(); };
}

function startMultiplayer(name, room) {
    myRoom = room;
    gameStarted = true;
    try { socket = io(); socket.emit('join', {name, room}); } catch(e) {}
}

function draw() {
    if (!gameStarted) return;
    background(25, 30, 40);

    // الكاميرا تتبع اللاعب
    translate(width/2 - myX, height/2 - myY);

    // رسم القلعة والحماية
    drawCastle();

    // إدارة العناصر
    handleZombies();
    handleTraps();
    
    for (let b of bullets) { b.update(); b.draw(); }

    // رسم اللاعب
    drawPlayer(myX, myY, myAngle);

    resetMatrix();
    updateUI();
    controlLogic();
    checkAutoChallenge();
}

function drawCastle() {
    fill(70); stroke(251, 191, 36); strokeWeight(4);
    rect(1400, 1400, 200, 200, 15);
    if (defenseActive) {
        noFill(); stroke(0, 255, 255, 100); strokeWeight(8);
        ellipse(1500, 1500, 450);
    }
}

function handleZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        fill(50, 150, 50); ellipse(z.x, z.y, 40);
        let target = (dist(z.x, z.y, myX, myY) < 300) ? {x:myX, y:myY} : {x:1500, y:1500};
        let angle = atan2(target.y - z.y, target.x - z.x);
        
        // لو الحماية شغالة، الزومبي ميعرفش يقرب للقلعة
        if (defenseActive && dist(z.x, z.y, 1500, 1500) < 230) {
            z.x -= cos(angle) * 2; z.y -= sin(angle) * 2;
        } else {
            z.x += cos(angle) * 1.5; z.y += sin(angle) * 1.5;
        }

        // قتل الزومبي بالرصاص
        for(let b of bullets) {
            if(dist(b.x, b.y, z.x, z.y) < 30) { zombies.splice(i, 1); score += 100; spawnZombie(); break; }
        }
    }
}

function controlLogic() {
    let speed = 5;
    if (keyIsDown(65) || moveState.left) myX -= speed;
    if (keyIsDown(68) || moveState.right) myX += speed;
    if (keyIsDown(87) || moveState.up) myY -= speed;
    if (keyIsDown(83) || moveState.down) myY += speed;
    
    if (touches.length > 0) {
        myAngle = atan2(touches[0].y - height/2, touches[0].x - width/2);
    } else {
        myAngle = atan2(mouseY - height/2, mouseX - width/2);
    }
}

function checkAutoChallenge() {
    if (frameCount % 3000 === 0 && !quizActive) { // كل دقيقة تقريباً
        defenseActive = false;
        quizActive = true;
        runQuizChallenge();
    }
}

async function runQuizChallenge() {
    alert("⚠️ سقطت الحماية! أجب عن 5 أسئلة في 30 ثانية!");
    let correct = 0;
    let start = Date.now();
    for(let i=0; i<5; i++) {
        let n1 = floor(random(1,10)), n2 = floor(random(1,10));
        let ans = prompt(`سؤال ${i+1}: ${n1} + ${n2} = ?`);
        if(ans == (n1+n2)) correct++;
    }
    if(correct === 5 && (Date.now()-start) < 30000) {
        defenseActive = true; alert("✅ أحسنت! عادت الحماية");
    } else {
        alert("❌ فشلت! الزومبي سيحطمون القلعة الآن!");
    }
    quizActive = false;
}

function shoot() {
    if(ammo > 0) { bullets.push(new Bullet(myX, myY, myAngle)); ammo--; }
    else { alert("نفذ الرصاص!"); }
}

function buyMine() { if(score >= 500) { score -= 500; mines.push({x:myX, y:myY}); } }
function buySpikes() { if(score >= 300) { score -= 300; spikes.push({x:myX, y:myY}); } }

function handleTraps() {
    for(let m of mines) { fill(255,0,0); ellipse(m.x, m.y, 15); }
    for(let s of spikes) { fill(150); triangle(s.x, s.y-10, s.x-8, s.y+5, s.x+8, s.y+5); }
}

function spawnZombie() { zombies.push({x: random(0, 3000), y: random(0, 3000)}); }

function drawPlayer(x, y, a) {
    push(); translate(x, y); rotate(a);
    fill(0, 255, 100); ellipse(0,0,45);
    fill(50); rect(15, -7, 20, 14);
    pop();
}

function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('ammo').innerText = ammo;
    document.getElementById('defense').innerText = defenseActive ? "فعالة" : "معطلة";
}

class Bullet {
    constructor(x, y, a) { this.x = x; this.y = y; this.a = a; }
    update() { this.x += cos(this.a) * 12; this.y += sin(this.a) * 12; }
    draw() { fill(255,255,0); noStroke(); ellipse(this.x, this.y, 8); }
}
