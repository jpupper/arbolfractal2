import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Variables globales
let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false; // Variable para detectar si está corriendo
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let particles = []; // Array para almacenar las partículas
let particleSystem; // Sistema de partículas

// Sintetizadores de sonido
let successSynth, errorSynth;

// Variables del juego
let score = 0;
let lives = 3;
let gameActive = false;
let gameObjects = []; // Array para almacenar cubos del juego
const raycaster = new THREE.Raycaster(); // Para detectar colisiones

// Referencias a elementos DOM
let startScreen, gameOverScreen, scoreElement, finalScoreElement, lifeElements = [];

// Inicializar la escena cuando se cargue la página
window.addEventListener('load', () => {
    // Obtener elementos DOM
    startScreen = document.getElementById('startScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    scoreElement = document.getElementById('score');
    finalScoreElement = document.getElementById('finalScore');
    lifeElements = [
        document.getElementById('life1'),
        document.getElementById('life2'),
        document.getElementById('life3')
    ];
    
    // Configurar botones
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    // Inicializar sintetizadores de sonido
    initSynthesizers();
    
    // Inicializar escena pero no empezar el juego
    init();
    animate();
});

// Función para iniciar el juego
function startGame() {
    startScreen.style.display = 'none';
    gameActive = true;
    score = 0;
    lives = 3;
    updateUI();
    controls.lock();
    
    // Limpiar cubos existentes
    clearGameObjects();
    
    // Generar nuevos cubos
    generateGameObjects();
}

// Función para reiniciar el juego
function restartGame() {
    gameOverScreen.style.display = 'none';
    startGame();
}

// Función para inicializar los sintetizadores de sonido
function initSynthesizers() {
    // Sintetizador para sonido de acierto (cubo verde)
    successSynth = new Tone.Synth({
        oscillator: {
            type: 'sine'
        },
        envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.1,
            release: 0.3
        }
    }).toDestination();
    
    // Sintetizador para sonido de error (cubo rojo)
    errorSynth = new Tone.Synth({
        oscillator: {
            type: 'sawtooth'
        },
        envelope: {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.05,
            release: 0.2
        }
    }).toDestination();
}

// Función para terminar el juego
function gameOver() {
    gameActive = false;
    controls.unlock();
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'flex';
}

function init() {
    // Configurar cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Altura de los ojos

    // Crear escena
    scene = new THREE.Scene();
    
    // Crear skybox
    const skyboxLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = skyboxLoader.load([
        'https://threejs.org/examples/textures/cube/skybox/px.jpg',
        'https://threejs.org/examples/textures/cube/skybox/nx.jpg',
        'https://threejs.org/examples/textures/cube/skybox/py.jpg',
        'https://threejs.org/examples/textures/cube/skybox/ny.jpg',
        'https://threejs.org/examples/textures/cube/skybox/pz.jpg',
        'https://threejs.org/examples/textures/cube/skybox/nz.jpg'
    ]);
    scene.background = skyboxTexture;

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Crear plano (suelo)
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotar para que sea horizontal
    plane.position.y = 0;
    scene.add(plane);
    
    // Crear geometrías para los cubos del juego
    const cubeSize = 1;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // Configurar renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Configurar controles de cámara
    controls = new PointerLockControls(camera, document.body);
    
    // Evento de click para activar los controles
    document.addEventListener('click', function() {
        controls.lock();
    });

    // Eventos de teclado para movimiento
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Manejar cambio de tamaño de ventana
    window.addEventListener('resize', onWindowResize);
    
    // Inicializar el sistema de partículas
    initParticleSystem();
}

// Función para crear el sistema de partículas
function initParticleSystem() {
    // Crear geometría para los cubos pequeños
    const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    
    // Crear el emisor de partículas en el centro
    particleSystem = {
        createParticle: function() {
            // Colores aleatorios para las partículas
            const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
            const material = new THREE.MeshStandardMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)],
                emissive: 0x222222
            });
            
            const particle = new THREE.Mesh(particleGeometry, material);
            
            // Posición inicial (en el centro, un poco elevado)
            particle.position.set(0, 5, 0);
            
            // Velocidad y dirección aleatorias
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,  // X: -1 a 1
                -Math.random() * 2 - 1,     // Y: siempre hacia abajo (-1 a -3)
                (Math.random() - 0.5) * 2   // Z: -1 a 1
            );
            
            // Rotación aleatoria
            particle.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Tiempo de vida (entre 2 y 5 segundos)
            const lifespan = 2 + Math.random() * 3;
            
            // Añadir a la escena y al array de partículas
            scene.add(particle);
            particles.push({
                mesh: particle,
                velocity: velocity,
                lifespan: lifespan,
                age: 0
            });
        },
        
        update: function(delta) {
            // Crear nuevas partículas (2 por frame)
            if (Math.random() < 0.5) {
                this.createParticle();
            }
            
            // Actualizar partículas existentes
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                
                // Actualizar posición
                particle.mesh.position.x += particle.velocity.x * delta;
                particle.mesh.position.y += particle.velocity.y * delta;
                particle.mesh.position.z += particle.velocity.z * delta;
                
                // Actualizar rotación
                particle.mesh.rotation.x += delta;
                particle.mesh.rotation.y += delta * 0.5;
                
                // Actualizar edad
                particle.age += delta;
                
                // Eliminar partículas que han superado su tiempo de vida o han caído por debajo del suelo
                if (particle.age >= particle.lifespan || particle.mesh.position.y < 0) {
                    scene.remove(particle.mesh);
                    particles.splice(i, 1);
                }
            }
        }
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            break;
    }
}

// Función para actualizar la UI del juego
function updateUI() {
    scoreElement.textContent = score;
    
    // Actualizar vidas
    for (let i = 0; i < 3; i++) {
        if (i < lives) {
            lifeElements[i].style.display = 'block';
        } else {
            lifeElements[i].style.display = 'none';
        }
    }
}

// Función para limpiar los objetos del juego
function clearGameObjects() {
    for (let i = 0; i < gameObjects.length; i++) {
        scene.remove(gameObjects[i].mesh);
    }
    gameObjects = [];
}

// Función para generar cubos del juego
function generateGameObjects() {
    // Crear 10 cubos (5 verdes y 5 rojos)
    const cubeSize = 1;
    
    // Material para cubos verdes (dan puntos)
    const greenMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        emissive: 0x004400
    });
    
    // Material para cubos rojos (quitan vidas)
    const redMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0x440000
    });
    
    // Crear cubos
    for (let i = 0; i < 10; i++) {
        // Alternar entre cubos verdes y rojos
        const isGreen = i % 2 === 0;
        const material = isGreen ? greenMaterial : redMaterial;
        const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), material);
        
        // Posicionar aleatoriamente en el plano
        const radius = 5 + Math.random() * 15; // Entre 5 y 20 unidades del centro
        const angle = Math.random() * Math.PI * 2;
        cube.position.x = Math.cos(angle) * radius;
        cube.position.z = Math.sin(angle) * radius;
        cube.position.y = cubeSize / 2; // Colocar sobre el plano
        
        // Rotar un poco cada cubo
        cube.rotation.y = Math.random() * Math.PI;
        
        // Añadir a la escena y al array de objetos del juego
        scene.add(cube);
        gameObjects.push({
            mesh: cube,
            type: isGreen ? 'green' : 'red',
            collected: false
        });
    }
}

// Función para comprobar colisiones con los cubos
function checkCollisions() {
    if (!gameActive) return;
    
    // Crear un vector para la dirección de la vista
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    // Configurar el raycaster
    raycaster.set(camera.position, cameraDirection);
    
    // Distancia de colisión (qué tan cerca debe estar para "agarrar" el cubo)
    const collisionDistance = 2;
    
    // Comprobar colisiones con cada cubo
    for (let i = 0; i < gameObjects.length; i++) {
        const gameObject = gameObjects[i];
        
        // Saltar objetos ya recogidos
        if (gameObject.collected) continue;
        
        // Calcular distancia al cubo
        const distance = camera.position.distanceTo(gameObject.mesh.position);
        
        // Si estamos lo suficientemente cerca, "agarramos" el cubo
        if (distance < collisionDistance) {
            gameObject.collected = true;
            scene.remove(gameObject.mesh);
            
            // Efecto según el tipo de cubo
            if (gameObject.type === 'green') {
                // Sumar puntos
                score += 10;
                // Reproducir sonido de acierto
                playSuccessSound();
            } else {
                // Perder una vida
                lives--;
                // Reproducir sonido de error
                playErrorSound();
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            
            // Actualizar UI
            updateUI();
            
            // Generar un nuevo cubo para reemplazar el recogido
            setTimeout(() => {
                if (gameActive) {
                    spawnNewCube(gameObject.type);
                }
            }, 1000);
        }
    }
}

// Función para generar un nuevo cubo
function spawnNewCube(type) {
    const cubeSize = 1;
    
    // Material según el tipo
    const material = new THREE.MeshStandardMaterial({ 
        color: type === 'green' ? 0x00ff00 : 0xff0000,
        emissive: type === 'green' ? 0x004400 : 0x440000
    });
    
    const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), material);
    
    // Posicionar aleatoriamente en el plano, lejos del jugador
    let validPosition = false;
    let position = new THREE.Vector3();
    
    while (!validPosition) {
        const radius = 10 + Math.random() * 15; // Entre 10 y 25 unidades del centro
        const angle = Math.random() * Math.PI * 2;
        position.x = Math.cos(angle) * radius;
        position.z = Math.sin(angle) * radius;
        
        // Verificar que esté lo suficientemente lejos del jugador
        const distanceToPlayer = position.distanceTo(new THREE.Vector3(camera.position.x, 0, camera.position.z));
        if (distanceToPlayer > 8) {
            validPosition = true;
        }
    }
    
    cube.position.copy(position);
    cube.position.y = cubeSize / 2; // Colocar sobre el plano
    cube.rotation.y = Math.random() * Math.PI;
    
    // Añadir a la escena y al array de objetos del juego
    scene.add(cube);
    gameObjects.push({
        mesh: cube,
        type: type,
        collected: false
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000; // Tiempo en segundos
    
    // Solo actualizar movimiento si los controles están bloqueados y el juego está activo
    if (controls.isLocked && gameActive) {
        // Calcular velocidad con fricción
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        
        // Calcular dirección
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        
        // Aplicar movimiento con velocidad base más rápida y opción de sprint
        const baseSpeed = 20.0; // Velocidad base aumentada
        const sprintMultiplier = 1.8; // Multiplicador cuando se corre
        const speed = isSprinting ? baseSpeed * sprintMultiplier : baseSpeed;
        
        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
        
        // Mover la cámara
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        
        // Comprobar colisiones con cubos
        checkCollisions();
    }
    
    // Actualizar sistema de partículas
    if (particleSystem) {
        particleSystem.update(delta);
    }
    
    prevTime = time;
    renderer.render(scene, camera);
}

// Función para reproducir sonido de acierto (cubo verde)
function playSuccessSound() {
    // Secuencia de notas ascendentes para sonido alegre
    const now = Tone.now();
    successSynth.triggerAttackRelease('C5', '0.1', now);
    successSynth.triggerAttackRelease('E5', '0.1', now + 0.1);
    successSynth.triggerAttackRelease('G5', '0.2', now + 0.2);
}

// Función para reproducir sonido de error (cubo rojo)
function playErrorSound() {
    // Secuencia de notas descendentes para sonido de error
    const now = Tone.now();
    errorSynth.triggerAttackRelease('E3', '0.15', now);
    errorSynth.triggerAttackRelease('C3', '0.2', now + 0.15);
}