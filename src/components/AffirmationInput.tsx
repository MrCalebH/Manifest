'use client';

import { useState, useRef, useEffect } from 'react';
import { Affirmation, AudioRecorder, TTSSettings } from '@/types';
import VoiceSelector from './VoiceSelector';
import SavedAffirmations from './SavedAffirmations';
import { AudioCache } from '@/utils/cache';
import TTSPreview from './TTSPreview';

interface Props {
  affirmation: Affirmation | null;
  onAffirmationChange: (affirmation: Affirmation) => void;
}

export default function AffirmationInput({ affirmation, onAffirmationChange }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder>({
    mediaRecorder: null,
    audioChunks: [],
    stream: null
  });
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID!,
    stability: 0.5,
    similarityBoost: 0.75,
    modelId: 'eleven_monolingual_v1'
  });
  const [previewAffirmation, setPreviewAffirmation] = useState<Affirmation | null>(null);
  const [localTimestamp] = useState(() => Date.now());

  // Create a local affirmation if none is provided
  const currentAffirmation = affirmation || {
    text: '',
    timestamp: localTimestamp
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onAffirmationChange({
      ...currentAffirmation,
      text: e.target.value
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current.stream = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current.mediaRecorder = mediaRecorder;
      recorderRef.current.audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderRef.current.audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recorderRef.current.audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onAffirmationChange({
          ...currentAffirmation,
          audioUrl,
          isRecorded: true
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current.mediaRecorder) {
      recorderRef.current.mediaRecorder.stop();
      recorderRef.current.stream?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const generateTTS = async () => {
    if (!currentAffirmation.text) return;
    
    setIsGeneratingTTS(true);
    setTtsError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentAffirmation.text,
          ...ttsSettings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      if (audioBlob.size > 0) {
        const audioUrl = URL.createObjectURL(audioBlob);
        setPreviewAffirmation({
          ...currentAffirmation,
          audioUrl,
          ttsSettings,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('TTS generation error:', error);
      setTtsError(error instanceof Error ? error.message : 'Failed to generate speech');
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      if (currentAffirmation.text) {
        await generateTTS();
      }
    }
  };

  const handleTTSSettingsChange = (newSettings: TTSSettings) => {
    console.log('Updating TTS settings:', newSettings);
    setTTSSettings(newSettings);
    onAffirmationChange({
      ...currentAffirmation,
      ttsSettings: newSettings
    });
  };

  const saveAffirmation = (affirmation: Affirmation) => {
    try {
      console.log('Trying to save affirmation:', affirmation);
      
      // Ensure we have required fields and include TTS settings
      const affToSave = {
        ...affirmation,
        timestamp: Date.now(),
        ttsSettings: ttsSettings // Include current TTS settings
      };

      const saved = localStorage.getItem('saved_affirmations');
      const savedAffirmations: Affirmation[] = saved ? JSON.parse(saved) : [];

      // Find existing affirmation index
      const existingIndex = savedAffirmations.findIndex(
        (a) => a.text === affirmation.text
      );

      if (existingIndex !== -1) {
        console.log('Updating existing affirmation at index:', existingIndex);
        savedAffirmations[existingIndex] = affToSave;
      } else {
        console.log('Adding new affirmation');
        savedAffirmations.unshift(affToSave);
      }

      console.log('Saving affirmations:', savedAffirmations);
      localStorage.setItem('saved_affirmations', JSON.stringify(savedAffirmations));
      
      window.dispatchEvent(new CustomEvent('custom-storage', {
        detail: { affirmations: savedAffirmations }
      }));
    } catch (e) {
      console.error('Failed to save affirmation:', e);
    }
  };

  // Update the effect that checks for cached TTS
  useEffect(() => {
    if (currentAffirmation.text && !currentAffirmation.audioUrl) {
      const cacheKey = AudioCache.getTTSKey(currentAffirmation.text);
      const cachedUrl = AudioCache.getTTSItem(cacheKey);
      if (cachedUrl) {
        console.log('Found cached TTS audio on mount');
        onAffirmationChange({
          ...currentAffirmation,
          audioUrl: cachedUrl
        });
      }
    }
  }, [currentAffirmation.text]);

  // Add a manual save button handler
  const handleManualSave = () => {
    if (!currentAffirmation.text) return;
    
    const affToSave = {
      ...currentAffirmation,
      id: currentAffirmation.id || crypto.randomUUID(),
      timestamp: Date.now()
    };
    
    saveAffirmation(affToSave);
  };

  // Add handlers for preview actions
  const handleSavePreview = async (previewAff: Affirmation) => {
    // Cache the audio blob
    const audioBlob = await fetch(previewAff.audioUrl).then(r => r.blob());
    const cacheKey = AudioCache.getTTSKey(previewAff.text);
    await AudioCache.setTTSItem(cacheKey, audioBlob);

    // Save the affirmation
    saveAffirmation(previewAff);
    onAffirmationChange(previewAff);
    setPreviewAffirmation(null);
  };

  const handleDiscardPreview = () => {
    if (previewAffirmation?.audioUrl) {
      URL.revokeObjectURL(previewAffirmation.audioUrl);
    }
    setPreviewAffirmation(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Your Affirmation</h2>
        <textarea
          className="w-full p-4 rounded-lg bg-purple-800 bg-opacity-50 text-white placeholder-purple-300"
          rows={4}
          placeholder="Enter your affirmation here..."
          value={currentAffirmation.text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
        />
        <div className="flex gap-4">
          <button
            onClick={toggleRecording}
            disabled={isGeneratingTTS}
            className={`px-4 py-2 rounded-lg ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-purple-600 hover:bg-purple-700'
            } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? 'Stop Recording' : 'Record Voice'}
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={generateTTS}
            disabled={!currentAffirmation.text || isGeneratingTTS || isRecording}
          >
            {isGeneratingTTS ? 'Generating...' : 'Generate TTS'}
          </button>
        </div>
      </div>

      <VoiceSelector
        settings={ttsSettings}
        onSettingsChange={handleTTSSettingsChange}
        disabled={isGeneratingTTS || isRecording}
      />
      
      {ttsError && (
        <div className="text-red-500 text-sm mt-2">
          Error: {ttsError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleManualSave}
          disabled={!currentAffirmation.text}
          className="text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
        >
          <span>💾</span> Save Affirmation
        </button>
      </div>

      <SavedAffirmations 
        onSelect={(saved) => {
          const settingsToUse = saved.ttsSettings || ttsSettings;
          setTTSSettings(settingsToUse);
          onAffirmationChange({
            ...saved,
            ttsSettings: settingsToUse
          });
        }}
      />

      {previewAffirmation && (
        <TTSPreview
          affirmation={previewAffirmation}
          onSave={handleSavePreview}
          onDiscard={handleDiscardPreview}
        />
      )}
    </div>
  );
} 