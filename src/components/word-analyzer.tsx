"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CheckSquare, XSquare } from 'lucide-react';
import _ from 'lodash';

const WordAnalyzer = () => {
  // Get word from URL
  const word = new URLSearchParams(window.location.search).get('word')?.toLowerCase() || 'example';

  // State management
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [activeFilter, setActiveFilter] = useState('definition');
  const [filterResult, setFilterResult] = useState('');
  const [wordData, setWordData] = useState({});  // Changed to store multiple words
  const [wordlist, setWordlist] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch word data from Wordnik
  const fetchWordData = async (wordToFetch) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const API_KEY = process.env.NEXT_PUBLIC_WORDNIK_API_KEY;
      const baseUrl = 'https://api.wordnik.com/v4/word.json';
      
      // Fetch definitions
      const definitionResponse = await fetch(
        `${baseUrl}/${wordToFetch}/definitions?limit=5&api_key=${API_KEY}`
      );
      const definitions = await definitionResponse.json();
      
      // Fetch related words (including synonyms)
      const relatedResponse = await fetch(
        `${baseUrl}/${wordToFetch}/relatedWords?relationshipTypes=synonym&limitPerRelationshipType=10&api_key=${API_KEY}`
      );
      const relatedWords = await relatedResponse.json();
    
      setWordData(prevData => ({
        ...prevData,
        [wordToFetch]: {
          definitions: definitions.map(def => ({
            partOfSpeech: def.partOfSpeech,
            text: def.text
          })),
          synonyms: relatedWords.find(rel => rel.relationshipType === 'synonym')?.words || []
        }
      }));
      
      return true;  // Success
    } catch (err) {
      if (err.response?.status === 404) {
        return false;  // Word not found
      }
      setError('Failed to fetch word data. Please check your API key.');
      console.error('Error fetching word data:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Available filters
  const filters = [
    { id: 'definition', label: 'Definition' },
    { id: 'synonyms', label: 'Synonyms' },
    { id: 'cryptic', label: 'Cryptic Abbreviations' },
    { id: 'anagrams', label: 'Anagrams' },
    { id: 'wordplay', label: 'Word Play' }
  ];

  // Select/deselect all letters
  const selectAll = () => {
    setSelectedLetters([...Array(word.length).keys()]);
  };

  const clearSelection = () => {
    setSelectedLetters([]);
  };

  // Toggle letter selection
  const toggleLetter = (index) => {
    if (selectedLetters.includes(index)) {
      setSelectedLetters(selectedLetters.filter(i => i !== index));
    } else {
      setSelectedLetters([...selectedLetters, index]);
    }
  };

  // Get selected letters as string
  const getSelectedString = () => {
    return selectedLetters
      .sort((a, b) => a - b)
      .map(index => word[index])
      .join('');
  };

  // Generate anagrams
  const generateAnagrams = (str) => {
    if (str.length <= 1) return [str];
    const result = new Set();
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const remainingChars = str.slice(0, i) + str.slice(i + 1);
      const anagrams = generateAnagrams(remainingChars);
      
      for (const anagram of anagrams) {
        result.add(char + anagram);
      }
    }
    
    return Array.from(result);
  };

  // Cryptic abbreviations dictionary
  const crypticDict = {
    "A": ["Accepted", "Afternoon", "Answer", "Area", "Army"],
    "AM": ["Morning", "Amplitude Modulation", "Before Noon"],
    "APT": ["Apartment", "Appropriate", "Aptitude"],
    "ART": ["Article", "Artificial", "Artistic"],
    "BE": ["Being", "Belgium", "Beryllium"],
    "BED": ["Bedroom", "Base Edge Distance", "Basic Engineering Design"],
    "CAT": ["Feline", "Computerized Axial Tomography", "Clear Air Turbulence"],
    "DOG": ["Domestic Operating Guide", "Direction Of Growth", "Deed Of Gift"],
    "EXAM": ["Examination", "Example", "Exercise And Movement"],
    "EX": ["Former", "Exercise", "Example"],
    "LAB": ["Laboratory", "Labor", "Launch Approval Board"],
    "LED": ["Light Emitting Diode", "Lead", "Leadership Education Development"],
    "ME": ["Maine", "Mechanical Engineer", "Middle East"],
    "MED": ["Medical", "Mediterranean", "Medieval"],
    "PLE": ["Please", "Plural", "Personal Learning Environment"],
    "PRO": ["Professional", "Procedure", "Program"],
    "RAM": ["Random Access Memory", "Battering Force", "Royal Air Maroc"],
    "RED": ["Reduce", "Reference Exchange Data", "Research and Engineering Development"],
    "SAT": ["Saturday", "Scholastic Assessment Test", "Satellite"],
    "SUB": ["Submarine", "Substitute", "Subordinate"],
    "TAB": ["Tabulate", "Technical Advisory Board", "Tactical Air Base"],
    "TEST": ["Testing", "Testosterone", "Technical Evaluation Support Team"],
    "THE": ["Theory", "Thermal", "Therapeutic"],
    "USE": ["Utilize", "User Support Environment", "Universal Stock Exchange"]
  };

  // Fetch initial word data
  useEffect(() => {
    fetchWordData(word);
  }, [word]);

  // Display word data based on active filter
  const displayWordData = (wordToDisplay) => {
    const data = wordData[wordToDisplay];
    
    if (!data) return null;

    if (activeFilter === 'definition') {
      return data.definitions.map((def, i) => 
        `${i + 1}. (${def.partOfSpeech}) ${def.text}`
      ).join('\n');
    } else if (activeFilter === 'synonyms') {
      return data.synonyms.join(', ');
    }
  };

  // Update results when filter or selection changes
  useEffect(() => {
    const selected = getSelectedString();
    
    if (selected.length === 0) {
      setFilterResult('Select some letters to see results');
      return;
    }

    switch (activeFilter) {
      case 'definition':
      case 'synonyms':
        if (selected === word && wordData[word]) {
          setFilterResult(
            isLoading ? `Loading ${activeFilter}...` :
            error ? error :
            displayWordData(word) || `No ${activeFilter} found`
          );
        } else if (selected !== word) {
          // Show lookup button for substrings
          setFilterResult(
            <div className="flex flex-col items-center gap-4">
              <p>Selected letters form: <strong>{selected}</strong></p>
              {wordData[selected] ? (
                displayWordData(selected) || `No ${activeFilter} found for "${selected}"`
              ) : (
                <button
                  onClick={() => fetchWordData(selected)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  Look up "{selected}"
                </button>
              )}
            </div>
          );
        }
        break;
      case 'cryptic':
        const upperSelected = selected.toUpperCase();
        const crypticResult = crypticDict[upperSelected];
        setFilterResult(
          crypticResult 
            ? (
                <div className="flex flex-col gap-2">
                  {crypticResult.map((result, index) => (
                    <div key={index} className="text-gray-700">
                      {index + 1}. {result}
                    </div>
                  ))}
                </div>
              )
            : `No cryptic abbreviations found for "${selected}"`
        );
        break;
      case 'anagrams':
        if (!wordlist || wordlist.size === 0) {
          setFilterResult('Loading wordlist...');
          break;
        }
        
        const anagrams = generateAnagrams(selected)
          .filter(anagram => wordlist.has(anagram.toLowerCase()));
        
        setFilterResult(
          anagrams.length > 0 
            ? (
                <div className="flex flex-col gap-2">
                  {anagrams.map((anagram, index) => (
                    <div key={index} className="text-gray-700">
                      {index + 1}. {anagram}
                    </div>
                  ))}
                </div>
              )
            : `No valid anagrams found for "${selected}"`
        );
        break;
      case 'wordplay':
        setFilterResult(`Selected letters can be used in: ${selected.split('').join(' + ')}`);
        break;
      default:
        setFilterResult('Select a filter to see results');
    }
  }, [activeFilter, selectedLetters]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="p-6">
        {/* Word display with selectable letters */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={selectAll}
            className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
            title="Select all letters"
          >
            <CheckSquare size={24} />
          </button>

          <div className="flex flex-wrap justify-center">
            {word.split('').map((letter, index) => (
            <button
              key={index}
              onClick={() => toggleLetter(index)}
              className={`
                w-12 h-12 text-xl font-bold
                transition-colors duration-200
                flex items-center justify-center
                border-t border-b border-gray-300
                ${index === 0 ? 'border-l' : ''}
                ${index === word.length - 1 ? 'border-r' : ''}
                ${selectedLetters.includes(index)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
              `}
            >
              {letter}
            </button>
                      ))}
          </div>

          <button
            onClick={clearSelection}
            className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
            title="Clear selection"
          >
            <XSquare size={24} />
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-colors duration-200
                ${activeFilter === filter.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-gray-700 leading-relaxed">
            {filterResult}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WordAnalyzer;