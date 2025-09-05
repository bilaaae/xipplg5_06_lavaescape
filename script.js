const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const bgImages = [
    "Image/bagroundpagi.png",
    "Image/bagroundsore.png",
    "Image/bagroundmalam.png"
].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

let currentBg = 0;

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game variables
let gameRunning = true;
let camera = { y: 0 };
let lavaHeight = canvas.height;
let lavaSpeed = 0.1;
let startTime = Date.now();
let gameTime = 0;
let score = 0;

// Player object
const player = {
    x: canvas.width / 2,
    y: canvas.height - 200,
    width: 20,
    height: 40,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpPower: 25,
    onGround: false,
    color: '#228B22' // hijau katak
};

// Platforms array
let platforms = [];

// Platform types
const PLATFORM_TYPES = {
    NORMAL: 'normal',
    CRUMBLING: 'crumbling',
    MOVING: 'moving',
    TRAP: 'trap'
};

// Keys pressed
const keys = {};

// Particles for effects
let particles = [];

class Platform {
    constructor(x, y, width, type = PLATFORM_TYPES.NORMAL) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 15;
        this.type = type;
        this.health = type === PLATFORM_TYPES.CRUMBLING ? 200 : 2000;
        this.moveDirection = Math.random() > 0.5 ? 1 : -1;
        this.moveSpeed = 5;
        this.trapActive = false;
        this.trapTimer = 5;
    }

    update() {
        if (this.type === PLATFORM_TYPES.MOVING) {
            this.x += this.moveDirection * this.moveSpeed;
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.moveDirection *= -1;
            }
        }

        if (this.type === PLATFORM_TYPES.CRUMBLING && this.health < 100) {
            this.health -= 2;
            if (this.health <= 0) {
                this.crumble();
            }
        }

        if (this.type === PLATFORM_TYPES.TRAP) {
            this.trapTimer++;
            if (this.trapTimer > 260) {
                this.trapActive = !this.trapActive;
                this.trapTimer = 0;
            }
        }
    }

    crumble() {
        for (let i = 0; i < 500; i++) {
            particles.push({
                x: this.x + Math.random() * this.width,
                y: this.y,
                velX: (Math.random() - 0.5) * 8,
                velY: Math.random() * -5,
                life: 100,
                color: '#4B3621'
            });
        }
    }

    draw() {
        let color;
        switch (this.type) {
            case PLATFORM_TYPES.NORMAL:
                color = '#4A4A4A';
                break;
            case PLATFORM_TYPES.CRUMBLING:
                if (this.health > 100){
                    color = '#8B4513';
                } else if (this.health > 50){
                    color = '#A0522D';
                } else {
                    color = '#CD853F';
                }
                break;
            case PLATFORM_TYPES.MOVING:
                color = '#4169E1';
                break;
            case PLATFORM_TYPES.TRAP:
                color = this.trapActive ? '#FF0000' : '#32CD32';
                break;
        }

        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y - camera.y, this.width, this.height);

        if (this.type === PLATFORM_TYPES.CRUMBLING && this.health < 100) {
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(this.x, this.y - camera.y, this.width, 2);
        }

        if (this.type === PLATFORM_TYPES.TRAP && this.trapActive) {
            ctx.fillStyle = '#FF6B35';
            for (let i = 0; i < this.width; i += 10) {
                ctx.fillRect(this.x + i, this.y - camera.y - 5, 5, 5);
            }
        }
    }
}

// Initialize platforms
function initPlatforms() {
    platforms = [];
    platforms.push(new Platform(canvas.width / 2 - 100, canvas.height - 100, 200, PLATFORM_TYPES.NORMAL));
    
    for (let i = 1; i < 50; i++) {
        const x = Math.random() * (canvas.width - 150);
        const y = canvas.height - 100 - (i * 80);
        const width = 100 + Math.random() * 100;
        
        let type = PLATFORM_TYPES.NORMAL;
        const rand = Math.random();
        if (rand < 0.2) type = PLATFORM_TYPES.CRUMBLING;
        else if (rand < 0.35) type = PLATFORM_TYPES.MOVING;
        else if (rand < 0.45) type = PLATFORM_TYPES.TRAP;
        
        platforms.push(new Platform(x, y, width, type));
    }
}

// Handle input
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (player.onGround) {
            player.velY = -player.jumpPower;
            player.onGround = false;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.velX;
        p.y += p.velY;
        p.velY += 0.3;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Draw particles
function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60;
        ctx.fillRect(p.x, p.y - camera.y, 3, 3);
        ctx.globalAlpha = 1;
    });
}

// Check collision
function checkCollisions() {
    player.onGround = false;
    
    platforms.forEach((platform, index) => {
        if (platform.health <= 0) {
            platforms.splice(index, 1);
            return;
        }

        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            if (player.velY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velY = 0;
                player.onGround = true;

                if (platform.type === PLATFORM_TYPES.CRUMBLING) {
                    platform.health -= 5;
                }
                
                if (platform.type === PLATFORM_TYPES.TRAP && platform.trapActive) {
                    for (let i = 0; i < 20; i++) {
                        particles.push({
                            x: player.x + player.width/2,
                            y: player.y + player.height/2,
                            velX: (Math.random() - 0.5) * 12,
                            velY: (Math.random() - 0.5) * 12,
                            life: 45,
                            color: '#FF0000'
                        });
                    }
                    gameOver();
                    return;
                }

                if (platform.type === PLATFORM_TYPES.MOVING) {
                    player.x += platform.moveDirection * platform.moveSpeed;
                }
            }
        }
    });
}

// Update game
function update() {
    if (!gameRunning) return;

    if (keys['a'] || keys['arrowleft']) {
        player.velX = -player.speed;
    } else if (keys['d'] || keys['arrowright']) {
        player.velX = player.speed;
    } else {
        player.velX *= 0.8;
    }

    player.velY += 0.8;
    player.x += player.velX;
    player.y += player.velY;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    checkCollisions();
    platforms.forEach(platform => platform.update());

    const targetCameraY = player.y - canvas.height / 2;
    camera.y += (targetCameraY - camera.y) * 0.1;

    lavaHeight -= lavaSpeed;
    lavaSpeed += 0.001;

    if (gameRunning) {
        gameTime = Math.floor((Date.now() - startTime) / 1000);
    }

    if (player.y + player.height >= lavaHeight) {
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: player.x + player.width/2,
                y: player.y + player.height/2,
                velX: (Math.random() - 0.5) * 15,
                velY: (Math.random() - 0.5) * 15,
                life: 60,
                color: Math.random() > 0.5 ? '#FF0000' : '#FF6B35'
            });
        }
        gameOver();
        return;
    }

    const currentHeight = Math.max(0, Math.floor((canvas.height - 150 - player.y) / 10));
    if (currentHeight > score) {
        score = currentHeight;
    }

    // Ganti background tiap 150m
    if (score % 150 === 0) {
        currentBg = (currentBg + 1) % bgImages.length;
    }

    updateParticles();

    const highestPlatform = Math.min(...platforms.map(p => p.y));
    if (highestPlatform > player.y - 1000) {
        const newY = highestPlatform - 80;
        const newX = Math.random() * (canvas.width - 150);
        const newWidth = 100 + Math.random() * 100;
        
        let type = PLATFORM_TYPES.NORMAL;
        const rand = Math.random();
        if (rand < 0.25) type = PLATFORM_TYPES.CRUMBLING;
        else if (rand < 0.4) type = PLATFORM_TYPES.MOVING;
        else if (rand < 0.5) type = PLATFORM_TYPES.TRAP;
        
        platforms.push(new Platform(newX, newY, newWidth, type));
    }
}

// Draw player katak 🐸
function drawPlayer() {
    const px = player.x;
    const py = player.y - camera.y;
    const centerX = px + player.width / 2;
    const centerY = py + player.height / 2;

    // --- Badan hijau ---
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 35, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Perut hijau muda ---
    ctx.fillStyle = "#A5D6A7";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 8, 22, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Mata kiri ---
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(centerX - 20, centerY - 28, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX - 20, centerY - 28, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(centerX - 20, centerY - 28, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- Mata kanan ---
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(centerX + 20, centerY - 28, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX + 20, centerY - 28, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(centerX + 20, centerY - 28, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- Pipi pink ---
    ctx.fillStyle = "pink";
    ctx.beginPath();
    ctx.arc(centerX - 18, centerY - 5, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 18, centerY - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // --- Mulut senyum ---
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI);
    ctx.stroke();
}


// Draw game
function draw() {
    // Clear canvas with gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#FF6B35');
    gradient.addColorStop(1, '#DC143C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lavaScreenY = lavaHeight - camera.y;
    if (lavaScreenY < canvas.height) {
        const lavaGradient = ctx.createLinearGradient(0, lavaScreenY, 0, canvas.height);
        lavaGradient.addColorStop(0, '#FF4500');
        lavaGradient.addColorStop(0.5, '#FF6B35');
        lavaGradient.addColorStop(1, '#DC143C');
        ctx.fillStyle = lavaGradient;
        ctx.fillRect(0, Math.max(0, lavaScreenY), canvas.width, canvas.height - Math.max(0, lavaScreenY));

        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = `rgba(255, 255, 0, ${Math.random() * 0.5})`;
            const bubbleX = Math.random() * canvas.width;
            const bubbleY = Math.max(lavaScreenY, 0) + Math.random() * (canvas.height - Math.max(lavaScreenY, 0));
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, Math.random() * 10 + 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    platforms.forEach(platform => {
        if (platform.y - camera.y < canvas.height + 50 && platform.y - camera.y > -50) {
            platform.draw();
        }
    });

    drawParticles();

    // Player katak
    drawPlayer();
}

// Game over
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalTime').textContent = gameTime;
    updateLeaderboard(score, gameTime);
    document.getElementById('gameOver').style.display = 'block';
}

// Leaderboard
function getLeaderboard() {
    const saved = localStorage.getItem('lavaEscapeLeaderboard');
    return saved ? JSON.parse(saved) : [];
}

function updateLeaderboard(newScore, newTime) {
    let leaderboard = getLeaderboard();
    leaderboard.push({ score: newScore, time: newTime });
    leaderboard.sort((a, b) => {
        if (b.score === a.score) {
            return b.time - a.time;
        }
        return b.score - a.score;
    });
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem('lavaEscapeLeaderboard', JSON.stringify(leaderboard));
    displayLeaderboard();
}

function displayLeaderboard() {
    const leaderboard = getLeaderboard();
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        if (typeof entry === 'number') {
            item.innerHTML = `${index + 1}. ${entry}m`;
        } else {
            item.innerHTML = `${index + 1}. ${entry.score}m (${entry.time}s)`;
        }
        list.appendChild(item);
    });
}

// Restart
function restart() {
    gameRunning = true;
    player.x = canvas.width / 2;
    player.y = canvas.height - 200;
    player.velX = 0;
    player.velY = 0;
    player.onGround = false;
    camera.y = 0;
    lavaHeight = canvas.height;
    lavaSpeed = 0.3;
    startTime = Date.now();
    gameTime = 0;
    score = 0;
    particles = [];
    initPlatforms();
    document.getElementById('gameOver').style.display = 'none';
}

document.getElementById('restartBtn').addEventListener('click', restart);

// UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('time').textContent = gameTime;
}

// Loop
function gameLoop() {
    update();
    draw();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// Resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Init
initPlatforms();
displayLeaderboard();
gameLoop();
