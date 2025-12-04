import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

// Adafruit IO Configuration
const ADAFRUIT_USERNAME = 'justwezzie';
const ADAFRUIT_IO_URL = 'https://io.adafruit.com/api/v2';
const ADAFRUIT_IO_KEY = process.env.REACT_APP_ADAFRUIT_IO_KEY;

export default function SpeciesGameUI() {
  const [activeTab, setActiveTab] = useState('species-cards');
  const [activeLiveData, setActiveLiveData] = useState('temperature');
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedOrganism, setSelectedOrganism] = useState(null);
  const [showCards, setShowCards] = useState(false);

  // Adafruit IO feed data state
  const [feedData, setFeedData] = useState({
    temperature: { value: null, history: [], lastUpdated: null, loading: true, error: null },
    humidity: { value: null, history: [], lastUpdated: null, loading: true, error: null },
    'soil-moisture': { value: null, lastUpdated: null, loading: true, error: null }
  });

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

  const species = [
    { name: 'Bacteria', icon: '🦠', description: 'Microscopic organisms that play crucial roles in decomposition and nutrient cycling.' },
    { name: 'Fungi', icon: '🍄', description: 'Thrives in moist, dark environments with neutral pH levels.' },
    { name: 'Insects', icon: '🐛', description: 'Diverse arthropods that contribute to pollination and soil aeration.' },
    { name: 'Plants', icon: '🌿', description: 'Photosynthetic organisms that form the base of most ecosystems.' }
  ];

  const organisms = [
    {
      name: 'Acidobacteriota',
      type: 'Bacteria',
      description: 'Acidophilic bacteria thriving in low pH environments.',
      image: '/cards/acidobacteriota.png'
    },
    {
      name: 'Agaricales',
      type: 'Fungi',
      description: 'Order of mushroom-forming fungi including edible species.',
      image: '/cards/agaricales.png'
    },
    {
      name: 'Asparagus',
      type: 'Plant',
      description: 'Perennial flowering plant used as a vegetable.',
      image: '/cards/asparagus.png'
    },
    {
      name: 'Bacillus',
      type: 'Bacteria',
      description: 'Soil-dwelling bacteria that form endospores for survival.',
      image: '/cards/bacillus.png'
    },
    {
      name: 'Collembola',
      type: 'Arthropod',
      description: 'Springtails that help decompose organic material.',
      image: '/cards/collembola.png'
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
          <div className="bg-neutral-800 rounded-lg p-8 max-w-2xl w-full mx-4 border-2 border-neutral-600">
            {selectedOrganism.image ? (
              // Special card layout for Procris repens with image
              <div>
                <div className="flex justify-end mb-2">
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
                  className="w-full rounded-lg"
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
            <div className="mb-8">
              <button
                onClick={() => setShowCards(!showCards)}
                className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 px-4 rounded transition-colors mb-4"
              >
                {showCards ? 'Hide Species Cards' : 'Show Species Cards'}
              </button>

              {showCards && (
                <div className="overflow-x-auto">
                  <div className="flex items-center justify-center gap-0">
                    {organisms.map((org, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedOrganism(org)}
                        className="flex-shrink-0 bg-neutral-800 hover:bg-neutral-700 overflow-hidden transition-colors border border-neutral-700 hover:border-neutral-500"
                        style={{ width: '400px', margin: '0' }}
                      >
                        {org.image ? (
                          <img
                            src={org.image}
                            alt={org.name}
                            className="w-full object-contain"
                            style={{ width: '400px', margin: '0' }}
                          />
                        ) : (
                          <div className="w-full flex flex-col items-center justify-center p-4">
                            <div className="font-medium text-center">{org.name}</div>
                            <div className="text-xs text-neutral-500 mt-1">{org.type}</div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
      <div className="w-4/6">
        <iframe
          src="https://editor.p5js.org/saragaviria99/full/YUhryLx5u"
          className="w-full h-full border-0"
          title="p5.js Editor"
        />
      </div>
    </div>
  );
}