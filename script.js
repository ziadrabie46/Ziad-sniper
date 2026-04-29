
let socket;
let myPlayer = {};
let otherPlayers = {};
let gameStarted = false;

// دالة البدء التي يتم استدعاؤها من index.html
function startMultiplayer(name, room) {
    socket = io(); // الاتصال بالسيرفر

    // إرسال بيانات الدخول
    socket.emit('join', { name: name, room: room });

    // استقبال اللاعبين الموجودين حالياً
    socket.on('currentPlayers', (serverPlayers) => {
        otherPlayers = serverPlayers;
    });

    // استقبال حركة اللاعبين الآخرين
    socket.on('playerMoved', (playerData) => {
        otherPlayers[playerData.id] = playerData;
    });

    // حذف لاعب عند خروجه
    socket.on('playerLeft', (id) => {
        delete otherPlayers[id];
    });

    myPlayer = {
        id: "", // السيرفر سيعطيك ID
        name: name,
        room: room,
        x: 1500,
        y: 1500,
        color: [random(100, 255), random(100, 255), random(100, 255)]
    };
    
    gameStarted = true;
}

function setup() {
    createCanvas(windowWidth, windowHeight);
}

function draw() {
    if (!gameStarted) return;

    background(210, 180, 140); // لون الخريطة

    // الكاميرا تتبعني
    translate(width/2 - myPlayer.x, height/2 - myPlayer.y);

    // رسم كل اللاعبين
    for (let id in otherPlayers) {
        let p = otherPlayers[id];
        if (p.room === myPlayer.room) {
            drawPlayer(p);
        }
    }

    // تحريك لاعبي وإرسال التحديث
    updateMyPosition();
}

function drawPlayer(p) {
    push();
    fill(p.id === socket.id ? "#4ade80" : "#ef4444");
    stroke(255);
    ellipse(p.x, p.y, 40);
    fill(0);
    textAlign(CENTER);
    text(p.name, p.x, p.y - 30);
    pop();
}

function updateMyPosition() {
    let moved = false;
    if (keyIsDown(LEFT_ARROW)) { myPlayer.x -= 5; moved = true; }
    if (keyIsDown(RIGHT_ARROW)) { myPlayer.x += 5; moved = true; }
    if (keyIsDown(UP_ARROW)) { myPlayer.y -= 5; moved = true; }
    if (keyIsDown(DOWN_ARROW)) { myPlayer.y += 5; moved = true; }

    if (moved) {
        // إرسال الإحداثيات الجديدة للسيرفر
        socket.emit('move', { x: myPlayer.x, y: myPlayer.y });
    }
}
