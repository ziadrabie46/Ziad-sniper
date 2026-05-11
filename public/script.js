let myX = 1500, myY = 1500, myAngle = 0, pName = "";
let gameStarted = false, score = 0, ammo = 20, hp = 100, castleHP = 500;
let zombies = [], bullets = [], mines = [], spikes = [], particles = [];
let defenseActive = true, powerUp = null, powerTimer = 0;
let mysteryBox = { x: 1200, y: 1200, active: true, type: 'gift' };
let moveState = { up: false, down: false, left: false, right: false };

const englishQuiz = [
    { q: "My brother _____ to school every morning.", a: "goes" },
    { q: "We _____ basketball yesterday.", a: "played" },
    { q: "Opposite of 'strong':", a: "weak" },
    { q: "Mona is _____ than Salma.", a: "taller" },
    { q: "I _____ my homework now.", a: "am doing" },
    { q: "They _____ TV at the moment.", a: "are watching" },
    { q: "Yesterday, Ali _____ to the club.", a: "went" },
    { q: "Ahmed is my friend. _____ is kind.", a: "He" },
    { q: "Plural of 'tooth':", a: "teeth" },
    { q: "I saw _____ elephant at the zoo.", a: "an" },
    { q: "The ball is _____ the box (under/from).", a: "under" },
    { q: "Correct spelling: (because/becuse).", a: "because" },
    { q: "How _____ apples do you have?", a: "many" },
    { q: "A camel can live in the _____.", a: "desert" },
    { q: "I was tired, _____ I went to bed early.", a: "so" }
];

function setup() {
    createCanvas(windowWidth, windowHeight);
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

function startLocalGame(name) {
    pName = name;
    gameStarted = true;
    for(let i=0; i<8; i++) spawnZombie();
}

function draw() {
    if (!gameStarted) return;
    background(15, 20, 30);
    
    // تأثير الكاميرا (اهتزاز لو انضربت)
    let shake = powerUp === 'damage' ? random(-5, 5) : 0;
    translate(width/2 - myX + shake, height/2 - myY + shake);

    drawMap();
    handleMysteryBox();
    handleZombies();
    handleBullets();
    handleTraps();
    
    drawPlayer(myX, myY, myAngle);
    
    resetMatrix();
    updateUI();
    controlLogic();
    if(frameCount % 3600 === 0) triggerQuiz(); // تحدي كل دقيقة
}

function drawMap() {
    stroke(40); strokeWeight(1);
    for(let i=0; i<3000; i+=100) { line(i, 0, i, 3000); line(0, i, 3000, i); }
    // القلعة
    fill(60); stroke(251, 191, 36); strokeWeight(4);
    rect(1400, 1400, 200, 200, 10);
    if(defenseActive) { noFill(); stroke(0, 255, 255, 150); ellipse(1500, 1500, 450); }
}

function handleZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        // رسم زومبي متطور
        fill(40, 100, 40); stroke(0); ellipse(z.x, z.y, 40);
        fill(255, 0, 0); ellipse(z.x+12, z.y-8, 6); ellipse(z.x+12, z.y+8, 6);
        
        let angle = atan2((dist(z.x, z.y, myX, myY) < 400 ? myY : 1500) - z.y, (dist(z.x, z.y, myX, myY) < 400 ? myX : 1500) - z.x);
        let speed = 1.5 + (score/5000); // الزومبي بيسرع مع السكور
        
        if(defenseActive && dist(z.x, z.y, 1500, 1500) < 225) {
            z.x -= cos(angle) * 3; z.y -= sin(angle) * 3;
        } else {
            z.x += cos(angle) * speed; z.y += sin(angle) * speed;
        }

        if(dist(z.x, z.y, myX, myY) < 40) { hp -= 0.5; powerUp = 'damage'; setTimeout(()=>powerUp=null, 100); }
    }
}

function handleBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += cos(b.a) * 15; b.y += sin(b.a) * 15;
        fill(255, 255, 0); noStroke(); ellipse(b.x, b.y, 8);
        
        for(let j = zombies.length - 1; j >= 0; j--) {
            if(dist(b.x, b.y, zombies[j].x, zombies[j].y) < 30) {
                zombies.splice(j, 1); bullets.splice(i, 1);
                score += 100; spawnZombie(); break;
            }
        }
        if(b.x < 0 || b.x > 3000 || b.y < 0 || b.y > 3000) bullets.splice(i, 1);
    }
}

function handleMysteryBox() {
    if(!mysteryBox.active) return;
    // رسم الصندوق (عسل Alhor)
    fill(255, 200, 0); stroke(255);
    rect(mysteryBox.x, mysteryBox.y, 45, 45, 8);
    fill(0); textSize(12); text("ALHOR", mysteryBox.x+5, mysteryBox.y+25);

    if(dist(myX, myY, mysteryBox.x, mysteryBox.y) < 50) {
        mysteryBox.active = false;
        let q = englishQuiz[floor(random(englishQuiz.length))];
        let a = prompt("🍯 Alhor Honey Box!\n" + q.q);
        if(a && a.toLowerCase().trim() === q.a.toLowerCase()) {
            let gift = random(['hp', 'speed', 'ammo']);
            if(gift==='hp') { hp = min(100, hp+30); alert("🍯 عسل أصلي! صحتك زادت"); }
            else if(gift==='speed') { powerTimer = 300; alert("⚡ سرعة نحل خارقة!"); }
            else { ammo += 30; alert("🔋 رصاص إضافي!"); }
        }
        setTimeout(() => { mysteryBox.x = random(500, 2500); mysteryBox.y = random(500, 2500); mysteryBox.active = true; }, 20000);
    }
}

function controlLogic() {
    let speed = powerTimer > 0 ? 12 : 6;
    if(powerTimer > 0) powerTimer--;
    if (keyIsDown(65) || moveState.left) myX -= speed;
    if (keyIsDown(68) || moveState.right) myX += speed;
    if (keyIsDown(87) || moveState.up) myY -= speed;
    if (keyIsDown(83) || moveState.down) myY += speed;
    
    myAngle = (touches.length > 0) ? atan2(touches[0].y - height/2, touches[0].x - width/2) : atan2(mouseY - height/2, mouseX - width/2);
}

async function triggerQuiz() {
    defenseActive = false;
    alert("⚠️ الحماية سقطت! جاوب 3 أسئلة بسرعة!");
    let win = 0;
    for(let i=0; i<3; i++) {
        let q = englishQuiz[floor(random(englishQuiz.length))];
        if(prompt(q.q).toLowerCase().trim() === q.a) win++;
    }
    if(win === 3) { defenseActive = true; alert("🛡️ الحماية عادت!"); }
}

function shoot() {
    if(ammo > 0) { bullets.push({x: myX, y: myY, a: myAngle}); ammo--; }
    else { 
        let q = englishQuiz[0];
        if(prompt("خلصت رصاص! حل ده:\n" + q.q).toLowerCase() === q.a) ammo = 20;
    }
}

function drawPlayer(x, y, a) {
    push(); translate(x, y); rotate(a);
    fill(0, 255, 150); stroke(255); ellipse(0,0,50);
    fill(50); rect(20, -8, 25, 16, 5); // سلاح مطور
    pop();
    fill(255); textAlign(CENTER); text(pName, x, y-40);
}

function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('ammo').innerText = ammo;
    document.getElementById('hp').innerText = floor(hp);
    document.getElementById('defense').innerText = defenseActive ? "فعال" : "ساقط!";
    let r = "مبتدئ";
    if(score > 2000) r = "قناص"; if(score > 5000) r = "أسطورة الـ Alhor";
    document.getElementById('rank').innerText = r;
    if(hp <= 0) { alert("Game Over! سكورك: " + score); location.reload(); }
}

function buyMine() { if(score >= 500) { score -= 500; mines.push({x:myX, y:myY}); } }
function buySpikes() { if(score >= 300) { score -= 300; spikes.push({x:myX, y:myY}); } }
function handleTraps() {
    for(let m of mines) { fill(255,0,0); ellipse(m.x, m.y, 20); }
    for(let s of spikes) { fill(150); triangle(s.x, s.y-12, s.x-10, s.y+5, s.x+10, s.y+5); }
}
function spawnZombie() { zombies.push({x: random(0, 3000), y: random(0, 3000)}); }
