// Variables globales
let trees = [];
let birds = [];
let numBirds = 5;
let sunY;
let sunRadius;
let sunSizeSlider;
let sunPositionSlider;
let birdColorPicker;
let birdHue = 220; // Valor inicial para el tono de los pájaros
let monkey; // Variable para el mono animado

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Inicializar el sol
  sunRadius = width * 0.05;
  sunY = sunRadius * 2;
  
  // Configurar controles de la interfaz
  sunSizeSlider = select('#sunSize');
  sunPositionSlider = select('#sunPosition');
  birdColorPicker = select('#birdColor');
  
  // Establecer valores iniciales
  sunSizeSlider.value(sunRadius * 10);
  sunPositionSlider.value(sunY);
  
  // Agregar eventos para los controles
  sunSizeSlider.input(updateSunSize);
  sunPositionSlider.input(updateSunPosition);
  birdColorPicker.input(updateBirdColor);
  
  // Crear pájaros iniciales
  for (let i = 0; i < numBirds; i++) {
    birds.push(new Bird());
  }
  
  // Crear un árbol inicial en el centro
  let initialTree = new Tree(width / 2, height, 120, 4);
  trees.push(initialTree);
  
  // Inicializar el mono
  monkey = new Monkey();
  
  // Fondo degradado
  colorMode(HSB, 360, 100, 100, 1);
}

// Funciones para actualizar elementos visuales según los controles
function updateSunSize() {
  sunRadius = sunSizeSlider.value() / 10;
}

function updateSunPosition() {
  sunY = sunPositionSlider.value();
}

function updateBirdColor() {
  // Convertir el valor hexadecimal del color a HSB
  let c = color(birdColorPicker.value());
  colorMode(RGB);
  let r = red(c);
  let g = green(c);
  let b = blue(c);
  colorMode(HSB, 360, 100, 100, 1);
  
  // Actualizar el color de los pájaros existentes
  for (let bird of birds) {
    bird.updateColor(c);
  }
}

function draw() {
  // Fondo degradado de cielo
  setGradientBackground();
  
  // Dibujar sol
  drawSun();
  
  // Dibujar y actualizar pájaros
  for (let bird of birds) {
    bird.update();
    bird.display();
  }
  
  // Dibujar suelo
  noStroke();
  fill(30, 70, 40);
  rect(0, height - 20, width, 20);
  
  // Dibujar árboles
  for (let tree of trees) {
    tree.grow();
    tree.display();
  }
  
  // Actualizar y mostrar el mono
  monkey.update();
  monkey.display();
}

function mousePressed() {
  // Crear un nuevo árbol donde se hizo clic
  let newTree = new Tree(mouseX, height, random(80, 150), int(random(3, 6)));
  trees.push(newTree);
  
  // Limitar el número de árboles para mantener el rendimiento
  if (trees.length > 10) {
    trees.shift(); // Eliminar el árbol más antiguo
  }
}

function setGradientBackground() {
  // Crear un degradado de cielo
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let skyColor = lerpColor(
      color(210, 80, 95), // Azul claro arriba
      color(180, 40, 100), // Azul más claro abajo
      inter
    );
    stroke(skyColor);
    line(0, y, width, y);
  }
}

function drawSun() {
  // Dibujar el sol con resplandor
  push();
  
  // Resplandor del sol
  for (let i = 5; i > 0; i--) {
    fill(40, 100, 100, 0.1);
    noStroke();
    ellipse(width * 0.8, sunY, sunRadius * (i + 1) * 1.5);
  }
  
  // Sol
  fill(40, 100, 100);
  noStroke();
  ellipse(width * 0.8, sunY, sunRadius);
  
  // Mostrar valores actuales en la interfaz
  sunSizeSlider.value(sunRadius * 10);
  sunPositionSlider.value(sunY);
  
  pop();
}

class Tree {
  constructor(x, y, len, depth) {
    this.x = x;
    this.y = y;
    this.initialLen = len;
    this.len = 0; // Comienza con longitud 0 para la animación
    this.targetLen = len;
    this.angle = PI / 2; // Ángulo inicial (hacia arriba)
    this.branchFactor = 0.67; // Factor de reducción de longitud
    this.maxDepth = depth;
    this.branches = [];
    this.growthSpeed = 0.5;
    this.fruits = [];
    this.fruitProbability = 0.3;
    this.growthComplete = false;
    this.baseHue = random(20, 40); // Tonos marrones/verdes
    
    // Colores para el tronco y las ramas
    this.trunkColor = color(this.baseHue, 70, 40);
    this.leafColor = color(random(90, 140), 80, 70);
  }
  
  grow() {
    if (this.len < this.targetLen) {
      this.len += this.growthSpeed;
    } else if (!this.growthComplete) {
      this.growthComplete = true;
      // Generar ramas cuando el tronco principal está completo
      this.generateBranches(this.x, this.y - this.len, this.len * this.branchFactor, this.angle, 1);
    }
    
    // Hacer crecer las ramas existentes
    for (let branch of this.branches) {
      if (branch.currentLength < branch.targetLength) {
        branch.currentLength += this.growthSpeed * 0.8;
      } else if (!branch.hasGeneratedChildren && branch.depth < this.maxDepth) {
        branch.hasGeneratedChildren = true;
        
        // Generar ramas hijas
        let newX = branch.startX + cos(branch.angle) * branch.currentLength;
        let newY = branch.startY - sin(branch.angle) * branch.currentLength;
        
        // Generar ramas a la izquierda y derecha
        let newLength = branch.targetLength * this.branchFactor;
        let angleVariation = random(0.3, 0.5);
        
        this.generateBranches(newX, newY, newLength, branch.angle + angleVariation, branch.depth + 1);
        this.generateBranches(newX, newY, newLength, branch.angle - angleVariation, branch.depth + 1);
        
        // Posibilidad de generar una rama central
        if (random() > 0.7) {
          this.generateBranches(newX, newY, newLength, branch.angle + random(-0.1, 0.1), branch.depth + 1);
        }
        
        // Posibilidad de generar frutos en las ramas finales
        if (branch.depth >= this.maxDepth - 1 && random() < this.fruitProbability) {
          this.fruits.push({
            x: newX,
            y: newY,
            size: random(5, 10),
            color: color(random(0, 40), 100, 100) // Colores de frutos: rojos, naranjas, amarillos
          });
        }
      }
    }
  }
  
  generateBranches(x, y, length, angle, depth) {
    this.branches.push({
      startX: x,
      startY: y,
      targetLength: length,
      currentLength: 0,
      angle: angle,
      depth: depth,
      hasGeneratedChildren: false
    });
  }
  
  display() {
    push();
    
    // Dibujar tronco principal
    stroke(this.trunkColor);
    strokeWeight(map(this.initialLen, 0, 150, 1, 15));
    line(this.x, this.y, this.x, this.y - this.len);
    
    // Dibujar ramas
    for (let branch of this.branches) {
      if (branch.currentLength > 0) {
        // Calcular grosor de la rama según su profundidad
        let thickness = map(branch.depth, 1, this.maxDepth, 10, 1);
        strokeWeight(thickness);
        
        // Color de la rama: más oscuro para las ramas, más verde para las puntas
        let branchColor = lerpColor(
          this.trunkColor,
          this.leafColor,
          map(branch.depth, 1, this.maxDepth, 0, 1)
        );
        stroke(branchColor);
        
        // Dibujar la rama
        let endX = branch.startX + cos(branch.angle) * branch.currentLength;
        let endY = branch.startY - sin(branch.angle) * branch.currentLength;
        line(branch.startX, branch.startY, endX, endY);
        
        // Dibujar hojas en las ramas finales
        if (branch.depth >= this.maxDepth - 1 && branch.currentLength >= branch.targetLength * 0.9) {
          noStroke();
          fill(this.leafColor);
          ellipse(endX, endY, 15, 15);
        }
      }
    }
    
    // Dibujar frutos
    for (let fruit of this.fruits) {
      noStroke();
      fill(fruit.color);
      ellipse(fruit.x, fruit.y, fruit.size, fruit.size);
    }
    
    pop();
  }
}

class Bird {
  constructor() {
    this.x = random(width);
    this.y = random(height * 0.1, height * 0.4);
    this.size = random(5, 10);
    this.speed = random(1, 3);
    this.wingAngle = 0;
    this.wingSpeed = random(0.1, 0.2);
    this.color = color(random(200, 240), 30, 100);
  }
  
  update() {
    this.x += this.speed;
    this.wingAngle += this.wingSpeed;
    
    // Reiniciar posición cuando sale de la pantalla
    if (this.x > width + 20) {
      this.x = -20;
      this.y = random(height * 0.1, height * 0.4);
    }
  }
  
  // Método para actualizar el color del pájaro
  updateColor(newColor) {
    this.color = newColor;
  }
  
  display() {
    push();
    translate(this.x, this.y);
    
    // Cuerpo del pájaro
    noStroke();
    fill(this.color);
    ellipse(0, 0, this.size * 2, this.size);
    
    // Alas
    let wingY = sin(this.wingAngle) * this.size * 0.5;
    triangle(0, 0, -this.size, wingY, this.size, wingY);
    
    // Cabeza
    ellipse(this.size, 0, this.size * 0.8, this.size * 0.8);
    
    // Pico
    fill(40, 100, 100);
    triangle(this.size * 1.4, 0, this.size * 1.8, -this.size * 0.2, this.size * 1.8, this.size * 0.2);
    
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  sunRadius = width * 0.05;
  sunY = sunRadius * 2;
}

class Monkey {
  constructor() {
    // Inicializar el mono en el horizonte (lado derecho)
    this.x = width + 100;
    this.y = height - 60; // Justo encima del suelo
    this.size = 40;
    this.speed = 1.5;
    this.swingAngle = 0;
    this.swingSpeed = 0.1;
    this.armAngle = 0;
    this.legAngle = 0;
    this.tailAngle = 0;
    
    // Colores del mono
    this.bodyColor = color(30, 80, 60); // Marrón
    this.faceColor = color(20, 60, 80); // Marrón claro
  }
  
  update() {
    // Mover el mono de derecha a izquierda
    this.x -= this.speed;
    
    // Animar las extremidades mientras camina
    this.armAngle = sin(frameCount * 0.1) * 0.3;
    this.legAngle = sin(frameCount * 0.1) * 0.2;
    this.tailAngle = sin(frameCount * 0.05) * 0.5;
    
    // Si el mono sale de la pantalla, reiniciar su posición
    if (this.x < -100) {
      this.x = width + 100;
    }
  }
  
  display() {
    push();
    translate(this.x, this.y);
    
    // Dibujar cola
    push();
    rotate(sin(frameCount * 0.05) * 0.3 + PI/4);
    stroke(this.bodyColor);
    strokeWeight(5);
    noFill();
    bezier(0, 0, 10, -20, 30, -10, 40, -30);
    pop();
    
    // Cuerpo
    noStroke();
    fill(this.bodyColor);
    ellipse(0, 0, this.size, this.size * 1.2);
    
    // Piernas
    push();
    translate(0, this.size * 0.5);
    // Pierna izquierda
    push();
    rotate(this.legAngle - 0.2);
    rect(-this.size * 0.3, 0, this.size * 0.2, this.size * 0.5, 5);
    pop();
    
    // Pierna derecha
    push();
    rotate(-this.legAngle - 0.2);
    rect(this.size * 0.1, 0, this.size * 0.2, this.size * 0.5, 5);
    pop();
    pop();
    
    // Brazos
    push();
    // Brazo izquierdo
    push();
    translate(-this.size * 0.4, -this.size * 0.1);
    rotate(this.armAngle - 0.5);
    rect(-this.size * 0.15, 0, this.size * 0.15, this.size * 0.4, 5);
    pop();
    
    // Brazo derecho
    push();
    translate(this.size * 0.4, -this.size * 0.1);
    rotate(-this.armAngle - 0.5);
    rect(0, 0, this.size * 0.15, this.size * 0.4, 5);
    pop();
    pop();
    
    // Cabeza
    fill(this.faceColor);
    ellipse(0, -this.size * 0.6, this.size * 0.8, this.size * 0.7);
    
    // Orejas
    fill(this.bodyColor);
    ellipse(-this.size * 0.3, -this.size * 0.8, this.size * 0.2, this.size * 0.3);
    ellipse(this.size * 0.3, -this.size * 0.8, this.size * 0.2, this.size * 0.3);
    
    // Ojos
    fill(255);
    ellipse(-this.size * 0.15, -this.size * 0.65, this.size * 0.15, this.size * 0.15);
    ellipse(this.size * 0.15, -this.size * 0.65, this.size * 0.15, this.size * 0.15);
    
    // Pupilas
    fill(0);
    ellipse(-this.size * 0.15, -this.size * 0.65, this.size * 0.05, this.size * 0.05);
    ellipse(this.size * 0.15, -this.size * 0.65, this.size * 0.05, this.size * 0.05);
    
    // Hocico
    fill(this.faceColor);
    ellipse(0, -this.size * 0.5, this.size * 0.3, this.size * 0.2);
    
    // Boca
    noFill();
    stroke(0);
    strokeWeight(1);
    arc(0, -this.size * 0.45, this.size * 0.2, this.size * 0.1, 0, PI);
    
    pop();
  }
}