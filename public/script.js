let socket, myId, myRoom, players = {}, zombies = [], bullets = [];
let score = 0, ammo = 15, hp = 100, castleHP = 500, gameStarted = false;

function setup() {
    // دي أهم سطرين عشان الشاشة السودة تختفي
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('display', 'block'); 
}

function startMultiplayer(name, room) {
    socket = io();
    myRoom = room;
    socket.emit('join', { name, room });

    socket.on('updateState', (state) => {
        players = state.players;
        myId = socket.id;
        gameStarted = true;
        console.log("Game Connected!"); // عشان تتأكد في الـ Console إن الربط تم
    });

    socket.on('newZombie', (z) => { zombies.push(z); });
    socket.on('playerMoved', (p) => { if(p.room === myRoom) players[p.id] = p; });
}

function draw() {
    if (!gameStarted) {
        background(0); // شاشة سوداء قبل البداية
        return;
    }

    background(25, 30, 40); // لون الأرضية بعد البداية
    
    let me = players[myId];
    if(!me) return;

    // تحريك الكاميرا مع اللاعب
    translate(width/2 - me.x, height/2 - me.y);

    // رسم القلعة
    fill(80); stroke(251, 191, 36); strokeWeight(3);
    rect(1400, 1400, 200, 200, 10);

    // رسم اللاعبين
    for (let id in players) {
        let p = players[id];
        push();
        translate(p.x, p.y);
        rotate(p.angle);
        fill(id === myId ? "#4ade80" : "#3b82f6");
        ellipse(0, 0, 40);
        fill(50); rect(10, -5, 15, 10);
        pop();
    }

    // تحديث الأرقام في الواجهة
    resetMatrix();
    document.getElementById('score').innerText = score;
    document.getElementById('ammo').innerText = ammo;
    document.getElementById('hp').innerText = Math.ceil(hp);
    document.getElementById('castle').innerText = Math.ceil(castleHP);

    handleMovement(me);
}

function handleMovement(me) {
    let moved = false;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) { me.x -= 5; moved = true; }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) { me.x += 5; moved = true; }
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) { me.y -= 5; moved = true; }
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) { me.y += 5; moved = true; }
    
    me.angle = atan2(mouseY - height/2, mouseX - width/2);
    if (moved || frameCount % 5 === 0) {
        socket.emit('move', { x: me.x, y: me.y, angle: me.angle, room: myRoom });
    }
}
