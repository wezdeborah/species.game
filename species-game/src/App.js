import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';

// Adafruit IO Configuration
const ADAFRUIT_USERNAME = 'justwezzie';
const ADAFRUIT_IO_URL = 'https://io.adafruit.com/api/v2';
const ADAFRUIT_IO_KEY = process.env.REACT_APP_ADAFRUIT_IO_KEY;

export default function SpeciesGameUI() {
  const [activeTab, setActiveTab] = useState('species-cards');
  const [activeLiveData, setActiveLiveData] = useState('temperature');
  const [pH, setPH] = useState(7);
  const [temp, setTemp] = useState(20);
  const [humi, setHumi] = useState(50);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedOrganism, setSelectedOrganism] = useState(null);
  const p5ContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);

  // Adafruit IO feed data state
  const [feedData, setFeedData] = useState({
    temperature: { value: null, history: [], lastUpdated: null, loading: true, error: null },
    humidity: { value: null, history: [], lastUpdated: null, loading: true, error: null },
    'soil-moisture': { value: null, lastUpdated: null, loading: true, error: null }
  });

  useEffect(() => {
    // Load p5.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js';
    script.async = true;
    
    script.onload = () => {
      if (p5ContainerRef.current && window.p5 && !p5InstanceRef.current) {
        // Create p5 sketch in instance mode
        const sketch = (p) => {
          let creatures = [];
          let foodSources = [];
          let environment = {
            temperature: 22,
            humidity: 70,
            pH: 6.5
          };
          
          let optimalRanges = {
            tempMin: 18,
            tempMax: 26,
            humidityMin: 60,
            humidityMax: 80,
            pHMin: 6,
            pHMax: 7
          };
          
          let gameState = "cover";
          let startTime;
          let gameDuration = 60000;
          
          const SPECIES = {
            ACIDOBACTERIA: 0, BACILLUS: 1, PSEUDOMONAS: 2, RHIZOBIUM: 3,
            STREPTOMYCES: 4, AGARICALES: 5, COLLEMBOLA: 6, EISENIA: 7,
            HYPNALES: 8, POLYPODIOPSIDA: 9, ASPARAGUS: 10, PROCRIS: 11
          };
          
          const COLORS = {
            BACTERIA: [110, 241, 249],
            FUNGI: [255, 147, 231],
            INSECTS: [253, 56, 6],
            PLANTS: [55, 245, 135]
          };
          
          class Creature {
            constructor(x, y, type) {
              this.x = x;
              this.y = y;
              this.type = type;
              this.size = p.random(25, 40);
              this.energy = 150;
              this.baseSpeed = p.random(0.8, 2);
              this.vx = p.random(-0.5, 0.5);
              this.vy = p.random(-0.5, 0.5);
              this.angle = p.random(p.TWO_PI);
              this.rotationSpeed = p.random(-0.02, 0.02);
              this.hunger = 0;
            }
            
            update(conditions) {
              let energyLoss = 0.05 + (0.1 * (1 - conditions));
              this.energy -= energyLoss;
              this.hunger += energyLoss;
              
              let nearestFood = null;
              let minDistance = Infinity;
              
              for (let food of foodSources) {
                let d = p.dist(this.x, this.y, food.x, food.y);
                if (d < minDistance && food.energy > 0) {
                  minDistance = d;
                  nearestFood = food;
                }
              }
              
              if (nearestFood && minDistance < 250) {
                let angleToFood = p.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
                let attractionStrength = p.map(this.hunger, 0, 50, 0.1, 0.3);
                attractionStrength += p.map(minDistance, 0, 250, 0.2, 0);
                
                this.vx += p.cos(angleToFood) * attractionStrength * conditions;
                this.vy += p.sin(angleToFood) * attractionStrength * conditions;
                
                if (minDistance < this.size/2 + 10) {
                  let energyGained = 30;
                  this.energy += energyGained;
                  this.hunger = p.max(0, this.hunger - energyGained/2);
                  nearestFood.energy -= 40;
                  this.energy = p.min(this.energy, 200);
                }
              } else {
                this.vx += p.random(-0.1, 0.1) * (0.5 + conditions);
                this.vy += p.random(-0.1, 0.1) * (0.5 + conditions);
              }
              
              let effectiveSpeed = this.baseSpeed * conditions;
              let speed = p.sqrt(this.vx * this.vx + this.vy * this.vy);
              if (speed > effectiveSpeed) {
                this.vx = (this.vx / speed) * effectiveSpeed;
                this.vy = (this.vy / speed) * effectiveSpeed;
              }
              
              this.vx *= 0.95;
              this.vy *= 0.95;
              this.x += this.vx;
              this.y += this.vy;
              this.x = p.constrain(this.x, 0, p.width);
              this.y = p.constrain(this.y, 0, p.height);
              this.angle += this.rotationSpeed;
              
              if (this.energy > 170 && conditions > 0.6 && p.random() < 0.002 * conditions) {
                this.energy -= 50;
                creatures.push(new Creature(
                  this.x + p.random(-20, 20),
                  this.y + p.random(-20, 20),
                  this.type
                ));
              }
            }
            
            display() {
              p.push();
              p.translate(this.x, this.y);
              p.rotate(this.angle);
              
              let visualSize = this.size * (this.energy / 150);
              let alphaValue = p.map(this.energy, 0, 150, 100, 255);
              
              p.noStroke();
              
              if (this.type >= SPECIES.ACIDOBACTERIA && this.type <= SPECIES.STREPTOMYCES) {
                p.fill(COLORS.BACTERIA[0], COLORS.BACTERIA[1], COLORS.BACTERIA[2], alphaValue);
              } else if (this.type === SPECIES.AGARICALES) {
                p.fill(COLORS.FUNGI[0], COLORS.FUNGI[1], COLORS.FUNGI[2], alphaValue);
              } else if (this.type >= SPECIES.COLLEMBOLA && this.type <= SPECIES.EISENIA) {
                p.fill(COLORS.INSECTS[0], COLORS.INSECTS[1], COLORS.INSECTS[2], alphaValue);
              } else {
                p.fill(COLORS.PLANTS[0], COLORS.PLANTS[1], COLORS.PLANTS[2], alphaValue);
              }
              
              p.ellipse(0, 0, visualSize);
              p.pop();
            }
          }
          
          class FoodSource {
            constructor(x, y) {
              this.x = x;
              this.y = y;
              this.energy = 100;
              this.size = 12;
            }
            
            update() {
              this.energy -= 0.15;
            }
            
            display() {
              let visualSize = this.size * (this.energy / 100);
              let brightness = 255 * (this.energy / 100);
              
              p.fill(255, 165, 0, brightness * 0.3);
              p.noStroke();
              p.ellipse(this.x, this.y, visualSize * 2);
              
              p.fill(255, 140, 0, brightness);
              p.ellipse(this.x, this.y, visualSize);
              
              p.fill(255, 200, 100, brightness * 0.6);
              p.ellipse(this.x, this.y, visualSize * 0.5);
            }
          }
          
          p.setup = () => {
            const canvas = p.createCanvas(p5ContainerRef.current.offsetWidth, p5ContainerRef.current.offsetHeight);
            canvas.parent(p5ContainerRef.current);
            
            for (let i = 0; i < 60; i++) {
              creatures.push(new Creature(p.random(p.width), p.random(p.height), p.floor(p.random(12))));
            }
          };
          
          p.draw = () => {
            let conditions = calculateEnvironmentalConditions();
            
            let r = 10 + environment.temperature * 0.5;
            let g = 10 + environment.humidity * 0.3;
            let b = 20 + (environment.pH - 6) * 8;
            p.background(r, g, b);
            
            if (gameState === "cover") {
              displayCover();
            } else if (gameState === "menu") {
              displayMenu();
            } else if (gameState === "playing") {
              updateGame(conditions);
              
              if (creatures.length === 0) {
                gameState = "gameOverAllDead";
              }
              
              if (p.millis() - startTime > gameDuration) {
                gameState = "gameOverTimeUp";
              }
            } else if (gameState === "gameOverAllDead") {
              displayGameOverAllDead();
            } else if (gameState === "gameOverTimeUp") {
              displayGameOverTimeUp();
            }
          };
          
          p.mousePressed = () => {
            if (gameState === "cover") {
              gameState = "menu";
            } else if (gameState === "menu") {
              gameState = "playing";
              startTime = p.millis();
            } else if (gameState === "playing") {
              foodSources.push(new FoodSource(p.mouseX, p.mouseY));
            } else if (gameState === "gameOverAllDead" || gameState === "gameOverTimeUp") {
              resetGame();
            }
          };
          
          function updateGame(conditions) {
            for (let i = foodSources.length - 1; i >= 0; i--) {
              foodSources[i].update();
              foodSources[i].display();
              if (foodSources[i].energy <= 0) {
                foodSources.splice(i, 1);
              }
            }
            
            for (let i = creatures.length - 1; i >= 0; i--) {
              creatures[i].update(conditions);
              creatures[i].display();
              
              if (creatures[i].energy <= 0) {
                creatures.splice(i, 1);
              }
            }
            
            displayGameInformation();
          }
          
          function displayCover() {
            p.fill(0, 0, 0, 200);
            p.rect(0, 0, p.width, p.height);
            
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(36);
            p.text("Artificial Life Ecosystem", p.width/2, p.height/2 - 40);
            
            p.textSize(18);
            p.fill(100, 255, 100);
            p.text("CLICK TO CONTINUE", p.width/2, p.height/2 + 40);
          }
          
          function displayMenu() {
            p.fill(0, 0, 0, 200);
            p.rect(0, 0, p.width, p.height);
            
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(28);
            p.text("Artificial Life Ecosystem", p.width/2, p.height/2 - 80);
            
            p.textSize(14);
            p.text("Click to add food and help creatures survive", p.width/2, p.height/2 - 20);
            p.text("You have 1 minute to maintain the ecosystem", p.width/2, p.height/2 + 10);
            
            p.fill(100, 255, 100);
            p.text("CLICK TO START THE GAME", p.width/2, p.height/2 + 70);
          }
          
          function displayGameInformation() {
            p.fill(255);
            p.noStroke();
            p.textAlign(p.LEFT, p.TOP);
            
            if (gameState === "playing") {
              let elapsed = p.millis() - startTime;
              let remaining = p.max(0, (gameDuration - elapsed) / 1000);
              p.textSize(14);
              p.text("Time: " + p.ceil(remaining) + "s", 10, 20);
            }
            
            p.textSize(14);
            p.text("Total creatures: " + creatures.length, 10, 45);
            p.text("Food sources: " + foodSources.length, 10, 65);
            
            p.textSize(12);
            p.text("Click to add food", 10, p.height - 20);
          }
          
          function displayGameOverAllDead() {
            p.fill(0, 0, 0, 200);
            p.rect(0, 0, p.width, p.height);
            
            p.fill(255, 100, 100);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(36);
            p.text("GAME OVER", p.width/2, p.height/2 - 40);
            
            p.textSize(18);
            p.fill(255);
            p.text("All creatures have died", p.width/2, p.height/2 + 10);
            
            p.fill(100, 200, 100);
            p.textSize(16);
            p.text("CLICK TO PLAY AGAIN", p.width/2, p.height/2 + 60);
          }
          
          function displayGameOverTimeUp() {
            p.fill(0, 0, 0, 200);
            p.rect(0, 0, p.width, p.height);
            
            p.fill(100, 255, 100);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(36);
            p.text("TIME'S UP!", p.width/2, p.height/2 - 40);
            
            p.textSize(18);
            p.fill(255);
            p.text("Creatures survived: " + creatures.length, p.width/2, p.height/2 + 10);
            
            p.fill(100, 200, 100);
            p.textSize(16);
            p.text("CLICK TO PLAY AGAIN", p.width/2, p.height/2 + 60);
          }
          
          function calculateEnvironmentalConditions() {
            let tempCondition = 1 - p.abs(environment.temperature - (optimalRanges.tempMin + optimalRanges.tempMax)/2) / 10;
            let humidityCondition = 1 - p.abs(environment.humidity - (optimalRanges.humidityMin + optimalRanges.humidityMax)/2) / 50;
            let pHCondition = 1 - p.abs(environment.pH - (optimalRanges.pHMin + optimalRanges.pHMax)/2) / 4;
            
            return p.max(0, (tempCondition + humidityCondition + pHCondition) / 3);
          }

            p.updateEnvironment = (newTemp, newHumidity, newPH) => {
              environment.temperature = newTemp;
              environment.humidity = newHumidity;
              environment.pH = newPH;
            };
 
          
          function resetGame() {
            creatures = [];
            foodSources = [];
            for (let i = 0; i < 60; i++) {
              creatures.push(new Creature(p.random(p.width), p.random(p.height), p.floor(p.random(12))));
            }
            
            environment.temperature = 22;
            environment.humidity = 70;
            environment.pH = 6.5;
            
            gameState = "cover";
          }
          
          p.windowResized = () => {
            if (p5ContainerRef.current) {
              p.resizeCanvas(p5ContainerRef.current.offsetWidth, p5ContainerRef.current.offsetHeight);
            }
          };
        };
        
        p5InstanceRef.current = new window.p5(sketch);
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
    
  }, []);

  // Fetch Adafruit IO feed data
  useEffect(() => {
    const feedConfigs = [
      { key: 'temperature', limit: 25 },
      { key: 'humidity', limit: 25 },
      { key: 'soil-moisture', limit: 1 }
    ];

    const fetchFeedData = async (feedKey, limit) => {
      try {
        const headers = {};
        if (ADAFRUIT_IO_KEY) {
          headers['X-AIO-Key'] = ADAFRUIT_IO_KEY;
        }

        const response = await fetch(
          `${ADAFRUIT_IO_URL}/${ADAFRUIT_USERNAME}/feeds/${feedKey}/data?limit=${limit}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${feedKey}: ${response.status}`);
        }

        const dataArray = await response.json();

        if (dataArray.length === 0) {
          throw new Error(`No data available for ${feedKey}`);
        }

        const latestData = dataArray[0];

        if (limit > 1) {
          // For temperature and humidity, store history (reverse to show oldest first)
          const history = dataArray.map(d => parseFloat(d.value)).reverse();
          setFeedData(prev => ({
            ...prev,
            [feedKey]: {
              value: parseFloat(latestData.value),
              history: history,
              lastUpdated: new Date(latestData.created_at),
              loading: false,
              error: null
            }
          }));
        } else {
          // For soil-moisture, just store the single value
          setFeedData(prev => ({
            ...prev,
            [feedKey]: {
              value: parseFloat(latestData.value),
              lastUpdated: new Date(latestData.created_at),
              loading: false,
              error: null
            }
          }));
        }
      } catch (error) {
        console.error(`Error fetching ${feedKey}:`, error);
        setFeedData(prev => ({
          ...prev,
          [feedKey]: {
            ...prev[feedKey],
            loading: false,
            error: error.message
          }
        }));
      }
    };

    const fetchAllFeeds = () => {
      feedConfigs.forEach(({ key, limit }) => fetchFeedData(key, limit));
    };

    // Initial fetch
    fetchAllFeeds();

    // Refresh every 30 seconds
    const intervalId = setInterval(fetchAllFeeds, 30000);

    return () => clearInterval(intervalId);
  }, []);
  useEffect(() => {
    if (p5InstanceRef.current && p5InstanceRef.current.updateEnvironment) {
      p5InstanceRef.current.updateEnvironment(temp, humi, pH);
    }
  }, [pH, temp, humi]);

  const species = [
    { name: 'Bacteria', icon: '🦠', description: 'Microscopic organisms that play crucial roles in decomposition and nutrient cycling.' },
    { name: 'Fungi', icon: '🍄', description: 'Thrives in moist, dark environments with neutral pH levels.' },
    { name: 'Insects', icon: '🐛', description: 'Diverse arthropods that contribute to pollination and soil aeration.' },
    { name: 'Plants', icon: '🌿', description: 'Photosynthetic organisms that form the base of most ecosystems.' }
  ];

  const organisms = [
    {
      name: 'Bacillus',
      type: 'Bacteria',
      description: 'Soil-dwelling bacteria that form endospores for survival.',
      image: '/cards/Bacillus.png'
    },
    {
      name: 'Streptomyces',
      type: 'Bacteria',
      description: 'Antibiotic-producing bacteria found in soil.',
      image: '/cards/Streptomyces.png'
    },
    {
      name: 'Acidobacteriota',
      type: 'Bacteria',
      description: 'Acidophilic bacteria thriving in low pH environments.',
      image: '/cards/Acidobacteriota.png'
    },
    {
      name: 'Pseudomonas',
      type: 'Bacteria',
      description: 'Versatile bacteria with diverse metabolic capabilities.',
      image: '/cards/Pseudomonas.png'
    },
    {
      name: 'Rhizobium',
      type: 'Bacteria',
      description: 'Nitrogen-fixing bacteria forming symbiosis with legumes.',
      image: '/cards/Rhizobium.png'
    },
    {
      name: 'Agaricales',
      type: 'Fungi',
      description: 'Order of mushroom-forming fungi including edible species.',
      image: '/cards/Agaricales.png'
    },
    {
      name: 'Eisenia Fetida',
      type: 'Worm',
      description: 'Composting worms important for soil aeration and decomposition.',
      image: '/cards/Eisenia-Fetida.png'
    },
    {
      name: 'Collembola',
      type: 'Arthropod',
      description: 'Springtails that help decompose organic material.',
      image: '/cards/Collembola.png'
    },
    {
      name: 'Hypnales',
      type: 'Moss',
      description: 'Order of pleurocarpous mosses growing in mats.',
      image: '/cards/Hypnales.png'
    },
    {
      name: 'Polypodiopsida',
      type: 'Fern',
      description: 'Class of true ferns with diverse species.',
      image: '/cards/Polypodiopsida.png'
    },
    {
      name: 'Asparagus',
      type: 'Plant',
      description: 'Perennial flowering plant used as a vegetable.',
      image: '/cards/Asparagus.png'
    },
    {
      name: 'Procris repens',
      type: 'Plant',
      description: 'Creeping herbaceous plant found in tropical regions.',
      image: '/cards/Procris-Repens.png'
    }
  ];

  const tabs = [
    { id: 'species-cards', label: 'Species Cards' },
    { id: 'how-to-play', label: 'How to Play' }
  ];

  const liveDataTabs = [
    { id: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️' },
    { id: 'humidity', label: 'Humidity', unit: '%', icon: '💧' },
    { id: 'soil-moisture', label: 'Soil Moisture', unit: '%', icon: '🌱' }
  ];

  // Helper function to format the last updated time
  const formatLastUpdated = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get current tab info
  const getCurrentTabInfo = () => {
    return liveDataTabs.find(tab => tab.id === activeLiveData) || liveDataTabs[0];
  };

  // Simple line graph component
  const LineGraph = ({ data, color = '#6ef1f9' }) => {
    if (!data || data.length === 0) return null;

    const width = 280;
    const height = 60;
    const padding = 5;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    const points = data.map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="w-full">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        {data.map((val, i) => {
          const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-white relative overflow-hidden m-0 p-0 gap-0">
      {/* Organism Card Modal */}
      {selectedOrganism && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-neutral-800 rounded-lg w-full border-2 border-neutral-600 ${selectedOrganism.image ? 'p-2 mx-2' : 'p-8 mx-4 max-w-2xl'}`}>
            {selectedOrganism.image ? (
              // Card layout with centered image at 300px height
              <div className="flex flex-col items-center">
                <div className="w-full flex justify-end mb-1">
                  <button
                    onClick={() => setSelectedOrganism(null)}
                    className="text-neutral-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                <img
                  src={selectedOrganism.image}
                  alt={selectedOrganism.name}
                  className="rounded-lg object-contain"
                  style={{ height: '300px', width: 'auto' }}
                />
              </div>
            ) : (
              // Standard card layout for other organisms
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{selectedOrganism.name}</h2>
                    <span className="inline-block bg-neutral-700 text-neutral-300 px-3 py-1 rounded-full text-sm">
                      {selectedOrganism.type}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedOrganism(null)}
                    className="text-neutral-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-neutral-300">Description</h3>
                    <p className="text-neutral-400">{selectedOrganism.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-neutral-300">Environmental Preferences</h3>
                    <div className="space-y-2 text-neutral-400">
                      <div className="flex justify-between">
                        <span>pH Range:</span>
                        <span className="font-mono">5.5 - 8.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Temperature:</span>
                        <span className="font-mono">15°C - 30°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Humidity:</span>
                        <span className="font-mono">40% - 90%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrganism(null)}
                    className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 rounded mt-4 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Species Card Modal */}
      {selectedSpecies && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-neutral-600">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <span className="text-6xl">{selectedSpecies.icon}</span>
                <h2 className="text-3xl font-bold">{selectedSpecies.name}</h2>
              </div>
              <button
                onClick={() => setSelectedSpecies(null)}
                className="text-neutral-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-neutral-300">Description</h3>
                <p className="text-neutral-400">{selectedSpecies.description}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-neutral-300">Optimal Conditions</h3>
                <div className="space-y-2 text-neutral-400">
                  <div className="flex justify-between">
                    <span>pH Level:</span>
                    <span className="font-mono">6.0 - 7.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Temperature:</span>
                    <span className="font-mono">18°C - 24°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humidity:</span>
                    <span className="font-mono">60% - 80%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedSpecies(null)}
                className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 rounded mt-4 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="w-2/6 p-6 flex flex-col overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-2 overflow-y-auto pr-2 pb-4">
          {/* Species Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Species</h2>
            <div className="flex gap-4">
              {species.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSpecies(s)}
                  className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>{s.name}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 mb-6 border-b border-neutral-700">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'species-cards' && (
            <div className="mb-8 overflow-y-auto max-h-96">
              <div className="grid grid-cols-3 gap-2">
                {organisms.map((org, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOrganism(org)}
                    className="bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded text-sm text-left transition-colors border border-neutral-700 hover:border-neutral-600"
                  >
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-neutral-500">{org.type}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'how-to-play' && (
            <div className="mb-6 text-neutral-400 space-y-4 overflow-y-auto max-h-48 pr-2">
              <p>
                In this game, you'll manage environmental 
                parameters to create optimal conditions for various organisms to thrive.
              </p>
              <p>
                Adjust the pH, temperature, and humidity levels using the sliders in the Parameters 
                tab. Each organism has its own preferred environmental conditions.
              </p>
              <p>
                Explore different species and organisms by clicking on them to learn more about their 
                characteristics and optimal living conditions. 
              </p>
            </div>
          )}
        </div>

        {/* Fixed Live Data Section */}
        <div className="mt-1 pt-4 border-t border-neutral-800">
          <h3 className="text-xl font-bold mb-3">Live Data</h3>
          
          {/* Live Data Navigation */}
          <div className="flex gap-4 mb-4">
            {liveDataTabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveLiveData(tab.id)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeLiveData === tab.id
                    ? 'bg-neutral-700 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-neutral-800 h-36 rounded p-4">
            {feedData[activeLiveData]?.loading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="animate-pulse text-neutral-400">Loading...</div>
              </div>
            ) : feedData[activeLiveData]?.error ? (
              <div className="h-full flex flex-col items-center justify-center">
                <span className="text-red-400 text-sm">Error loading data</span>
                <span className="text-neutral-500 text-xs mt-1">{feedData[activeLiveData].error}</span>
              </div>
            ) : activeLiveData === 'soil-moisture' ? (
              // Single value display for soil moisture
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm">{getCurrentTabInfo().label}</span>
                  <span className="text-neutral-500 text-xs">
                    {formatLastUpdated(feedData[activeLiveData]?.lastUpdated)}
                  </span>
                </div>
                <div className="flex items-center justify-center flex-1">
                  <span className="text-5xl font-bold text-white">
                    {feedData[activeLiveData]?.value?.toFixed(1) ?? '--'}
                  </span>
                  <span className="text-2xl text-neutral-400 ml-2">
                    {getCurrentTabInfo().unit}
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-neutral-500 text-xs">
                    Data from Adafruit IO - Auto-refreshes every 30s
                  </span>
                </div>
              </div>
            ) : (
              // Graph display for temperature and humidity
              <div className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-sm">{getCurrentTabInfo().label}</span>
                    <span className="text-lg font-bold text-white">
                      {feedData[activeLiveData]?.value?.toFixed(1) ?? '--'}{getCurrentTabInfo().unit}
                    </span>
                  </div>
                  <span className="text-neutral-500 text-xs">
                    {formatLastUpdated(feedData[activeLiveData]?.lastUpdated)}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <LineGraph
                    data={feedData[activeLiveData]?.history}
                    color={activeLiveData === 'temperature' ? '#f87171' : '#60a5fa'}
                  />
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-xs">
                  <span>Last 25 readings</span>
                  <span>Auto-refreshes every 30s</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-4/6 bg-neutral-200 flex items-center justify-center">
        <div ref={p5ContainerRef} className="w-full h-full"></div>
      </div>
    </div>
  );
}