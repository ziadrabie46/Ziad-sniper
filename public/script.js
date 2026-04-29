let socket, myId, players = {}, zombies = [], gameStarted = false;
let move = {x:0, y:0}, myName, myRoom, myAngle = 0;

function startMultiplayer(name, room) {
    socket = io(); // الاتصال بسيرفر Render
    myName = name; myRoom = room;

    socket.emit('join', { name: name, room: room });

    socket.on('currentPlayers', (serverPlayers) => { 
        players = serverPlayers; 
        myId = socket.id; 
        gameStarted = true; 
    });

    socket.on('playerMoved', (p) => { 
        if(p.room === myRoom) players[p.id] = p; 
    });

    socket.on('playerLeft', (id) => { 
        delete players[id]; 
    });

    // ظهور زومبي جديد كل 4 ثواني
    setInterval(() => { 
        if(gameStarted && zombies.length < 6) zombies.push(new Zombie()); 
    }, 4000);
}

function setup() { 
    createCanvas(windowWidth, windowHeight); 
}

function draw() {
    if(!gameStarted || !players[myId]) return;
    
    background(210, 180, 140); // لون الرمل الأساسي
    
    let me = players[myId];
    
    // تجعل الكاميرا تتبع اللاعب الخاص بك
    translate(width/2 - me.x, height/2 - me.y);

    // رسم نهر النيل كديكور
    fill(30, 144, 255); 
    rect(1500-30, 0, 60, 3000);

    // رسم جميع اللاعبين في نفس الروم
    for (let id in players) {
        let p = players[id];
        if (p.room === myRoom) {
            push();
            translate(p.x, p.y);
            rotate(p.angle || 0); // الدوران باتجاه الماوس/اللمس
            
            // لون مختلف لك وللخصوم
            fill(id === myId ? "#4ade80" : "#ef4444");
            stroke(255); strokeWeight(2);
            ellipse(0, 0, 45);
            
            // رسم العينين لتوضيح الاتجاه
            fill(0); 
            ellipse(12, -10, 6); 
            ellipse(12, 10, 6); 
            pop();
            
            // رسم الاسم فوق اللاعب
            fill(0); textAlign(CENTER); textSize(16);
            text(p.name, p.x, p.y - 45);
        }
    }

    // تحديث ورسم الزومبي
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update(me);
        zombies[i].draw();
    }

    handleLogic();
}

function handleLogic() {
    let moved = false;
    let speed = 5;

    // الحركة من أزرار الموبايل
    if (move.x !== 0 || move.y !== 0) {
        players[myId].x += move.x * speed;
        players[myId].y += move.y * speed;
        moved = true;
    }

    // حساب زاوية الدوران باتجاه اللمس
    let targetAngle = atan2(mouseY - height/2, mouseX - width/2);
    if (abs(targetAngle - myAngle) > 0.05) {
        myAngle = targetAngle;
        players[myId].angle = myAngle;
        moved = true;
    }

    // إرسال التحديثات للسيرفر فقط عند حدوث تغيير
    if (moved) {
        socket.emit('move', { 
            x: players[myId].x, 
            y: players[myId].y, 
            angle: players[myId].angle 
        });
    }
}

class Zombie {
    constructor() {
        this.x = random(me.x - 500, me.x + 500);
        this.y = random(me.y - 500, me.y + 500);
    }
    update(target) {
        let d = dist(this.x, this.y, target.x, target.y);
        if (d > 5) {
            this.x += (target.x - this.x) / d * 2.5;
            this.y += (target.y - this.y) / d * 2.5;
        }
    }
    draw() {
        fill(255, 50, 50);
        stroke(0);
        ellipse(this.x, this.y, 35);
    }
}

// برمجة أزرار التحكم
window.onload = () => {
    const setupBtn = (id, x, y) => {
        let btn = document.getElementById(id);
        if(btn) {
            btn.ontouchstart = (e) => { e.preventDefault(); move = {x, y}; };
            btn.ontouchend = (e) => { e.preventDefault(); move = {x:0, y:0}; };
        }
    };
    setupBtn('btn-u', 0, -1);
    setupBtn('btn-d', 0, 1);
    setupBtn('btn-l', -1, 0);
    setupBtn('btn-r', 1, 0);
};
