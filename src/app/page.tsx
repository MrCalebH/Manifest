'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner';
import ClientLayout from '@/components/ClientLayout';
import type { Affirmation, MusicSettings } from '@/types';

// Import components with no SSR
const AffirmationInput = dynamic(() => import('@/components/AffirmationInput'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

const AudioControls = dynamic(() => import('@/components/AudioControls'), {
  ssr: false
});

const MusicGenerator = dynamic(() => import('@/components/MusicGenerator'), {
  ssr: false
});

const defaultMusicSettings: MusicSettings = {
  style: 'Ambient',
  volume: 0.7,
  tempo: 'Medium',
  mood: 'Uplifting',
  intensity: 'Balanced',
  duration: 30
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [affirmation, setAffirmation] = useState<Affirmation>({
    text: '',
    timestamp: Date.now()
  });
  const [musicSettings, setMusicSettings] = useState<MusicSettings>(defaultMusicSettings);
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMusicGenerated = (url: string) => {
    setGeneratedMusicUrl(url);
  };

  if (!mounted) {
    return null;
  }

  return (
    <ClientLayout>
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-center mb-12">Manifest</h1>
        
        <AffirmationInput 
          affirmation={affirmation}
          onAffirmationChange={setAffirmation}
        />
        
        {affirmation.text && (
          <div className="space-y-6">
            <MusicGenerator
              onMusicGenerated={handleMusicGenerated}
              settings={musicSettings}
              onSettingsChange={setMusicSettings}
              selectedAffirmation={affirmation}
            />

            {generatedMusicUrl && (
              <AudioControls 
                affirmation={affirmation}
                musicSettings={musicSettings}
                onSettingsChange={setMusicSettings}
                musicUrl={generatedMusicUrl}
              />
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
