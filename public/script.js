let socket, myId, myRoom, gameStarted = false;
let myX = 1500, myY = 1500, myAngle = 0;
let players = {}, zombies = [], bullets = [], mines = [], spikes = [];
let score = 0, ammo = 20, hp = 100, castleHP = 500;
let defenseActive = true, quizActive = false;
let moveState = { up: false, down: false, left: false, right: false };

// 📘 بنك أسئلة الإنجليزي (Grade 6 - Term 2)
const englishQuiz = [
    { q: "My brother _____ to school every morning.", a: "goes" },
    { q: "We _____ basketball yesterday.", a: "played" },
    { q: "Choose the opposite of 'strong':", a: "weak" },
    { q: "Mona is _____ than Salma.", a: "taller" },
    { q: "I _____ my homework now.", a: "am doing" },
    { q: "They _____ TV at the moment.", a: "are watching" },
    { q: "Yesterday, Ali _____ to the club.", a: "went" },
    { q: "Ahmed is my friend. _____ is kind.", a: "He" },
    { q: "What is the plural of 'tooth'?", a: "teeth" },
    { q: "I saw _____ elephant at the zoo.", a: "an" },
    { q: "_____ is your birthday?", a: "When" },
    { q: "The ball is _____ the box (under/from).", a: "under" },
    { q: "We use our eyes to _____.", a: "see" },
    { q: "She _____ English very well.", a: "speaks" },
    { q: "There _____ a cat in the garden (is/are).", a: "is" },
    { q: "Which word is an adjective? (run/beautiful).", a: "beautiful" },
    { q: "Don't _____ noisy in class.", a: "be" },
    { q: "We _____ dinner when the lights went out.", a: "were eating" },
    { q: "Correct spelling: (because/becuse).", a: "because" },
    { q: "The sun _____ in the east.", a: "rises" },
    { q: "How _____ apples do you have?", a: "many" },
    { q: "My mother is _____ doctor (a/an).", a: "a" },
    { q: "I _____ never visited Luxor before.", a: "have" },
    { q: "They _____ happy after the match.", a: "were" },
    { q: "Correct: (She like/She likes) apples.", a: "She likes" },
    { q: "The book is _____ the table (in/on).", a: "on" },
    { q: "We _____ to music every evening.", a: "listen" },
    { q: "Where (do/does) you live?", a: "do" },
    { q: "A camel can live in the _____.", a: "desert" },
    { q: "I was tired, _____ I went to bed early.", a: "so" }
];

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('display', 'block');
    for(let i=0; i<10; i++) spawnZombie();
    setupMobileControls();
}

function setupMobileControls() {
    const bind = (id, dir) => {
        let el = document.getElementById(id);
        if(!el) return;
        el.ontouchstart = (e) => { e.preventDefault(); moveState[dir] = true; };
        el.ontouchend = (e) => { e.preventDefault(); moveState[dir] = false; };
    };
    bind('upBtn', 'up'); bind('downBtn', 'down'); bind('leftBtn', 'left'); bind('rightBtn', 'right');
}

function startMultiplayer(name, room) {
    myRoom = room;
    gameStarted = true;
    try { socket = io(); socket.emit('join', {name, room}); } catch(e) { console.log("Offline Mode"); }
}

function draw() {
    if (!gameStarted) return;
    background(25, 30, 40);

    // الكاميرا تتبع اللاعب
    translate(width/2 - myX, height/2 - myY);

    drawGrid();
    drawCastle();
    handleZombies();
    handleTraps();
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        if(bullets[i].offScreen()) bullets.splice(i, 1);
    }

    drawPlayer(myX, myY, myAngle);
    resetMatrix();
    updateUI();
    controlLogic();
    checkAutoChallenge();
}

function drawGrid() {
    stroke(40);
    for (let x = 0; x < 3000; x += 100) line(x, 0, x, 3000);
    for (let y = 0; y < 3000; y += 100) line(0, y, 3000, y);
}

function drawCastle() {
    fill(70); stroke(251, 191, 36); strokeWeight(4);
    rect(1400, 1400, 200, 200, 15);
    if (defenseActive) {
        noFill(); stroke(0, 255, 255, 120); strokeWeight(8);
        ellipse(1500, 1500, 450);
    }
}

function handleZombies() {
    for (let i = zombies.length - 1; i >= 0; i--) {
        let z = zombies[i];
        fill(50, 150, 50); stroke(0); ellipse(z.x, z.y, 40);
        let target = (dist(z.x, z.y, myX, myY) < 350) ? {x:myX, y:myY} : {x:1500, y:1500};
        let angle = atan2(target.y - z.y, target.x - z.x);
        
        if (defenseActive && dist(z.x, z.y, 1500, 1500) < 230) {
            z.x -= cos(angle) * 2; z.y -= sin(angle) * 2;
        } else {
            z.x += cos(angle) * 1.5; z.y += sin(angle) * 1.5;
        }

        // تصادم مع الرصاص
        for(let j = bullets.length - 1; j >= 0; j--) {
            if(dist(bullets[j].x, bullets[j].y, z.x, z.y) < 30) {
                zombies.splice(i, 1); bullets.splice(j, 1); score += 100; spawnZombie();
                break;
            }
        }
    }
}

function controlLogic() {
    let speed = 6;
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
    if (frameCount % 3600 === 0 && !quizActive) { 
        defenseActive = false;
        quizActive = true;
        runQuizChallenge();
    }
}

async function runQuizChallenge() {
    alert("⚠️ EMERGENCY! الحماية سقطت! حل 5 أسئلة إنجليزي في 30 ثانية!");
    let correct = 0; let start = Date.now();
    let selected = englishQuiz.sort(() => 0.5 - Math.random()).slice(0, 5);

    for(let i=0; i<5; i++) {
        let ans = prompt(`Question ${i+1}: ${selected[i].q}`);
        if(ans && ans.toLowerCase().trim() === selected[i].a.toLowerCase()) correct++;
    }

    if(correct === 5 && (Date.now()-start) < 30000) {
        defenseActive = true; alert("✅ أحسنت يا بطل! عادت الحماية");
    } else {
        alert("❌ فشلت! الزومبي سيهاجمون القلعة الآن!");
        castleHP -= 100;
    }
    quizActive = false;
}

function shoot() {
    if(ammo > 0) { bullets.push(new Bullet(myX, myY, myAngle)); ammo--; }
    else { 
        alert("خلصت الرصاص! حل السؤال ده عشان تعمر:");
        let q = englishQuiz[Math.floor(random(englishQuiz.length))];
        let ans = prompt(q.q);
        if(ans && ans.toLowerCase().trim() === q.a.toLowerCase()) { ammo = 20; alert("🔋 تعمر!"); }
    }
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
    update() { this.x += cos(this.a) * 15; this.y += sin(this.a) * 15; }
    draw() { fill(255,255,0); noStroke(); ellipse(this.x, this.y, 8); }
    offScreen() { return dist(this.x, this.y, myX, myY) > 1000; }
}
