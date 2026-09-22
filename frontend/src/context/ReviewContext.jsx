import React, { createContext, useContext, useState, useEffect } from 'react';

const ReviewContext = createContext();

const STORAGE_KEY = 'bis_officer_review_workspace_v1';

export function ReviewProvider({ children }) {
  const [savedStandards, setSavedStandards] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_standards`);
      return saved ? JSON.parse(saved) : ['IS_1448_Part_97_2026'];
    } catch {
      return ['IS_1448_Part_97_2026'];
    }
  });

  const [pinnedEvidence, setPinnedEvidence] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_evidence`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'ev-seed-1',
          standard_id: 'IS_1448_Part_97_2026',
          is_number: 'IS 1448 (Part 97):2026',
          section: '6.1 Apparatus Specifications',
          clause: '6.1.1',
          page: 6,
          text: 'The test section heater tube shall have an overall length of 161.925 ± 0.254 mm and outside diameter of 4.737 ± 0.025 mm.',
          pinned_at: new Date().toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  const [officerNotes, setOfficerNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_notes`);
      return saved ? JSON.parse(saved) : {
        'IS_1448_Part_97_2026': 'Heater tube dimensional tolerances match technical tender specification paragraph 4.2. Verify calibration certificate during dispatch.'
      };
    } catch {
      return {};
    }
  });

  const [standardStatuses, setStandardStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_statuses`);
      return saved ? JSON.parse(saved) : {
        'IS_1448_Part_97_2026': 'REVIEWED'
      };
    } catch {
      return {};
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_standards`, JSON.stringify(savedStandards));
      localStorage.setItem(`${STORAGE_KEY}_evidence`, JSON.stringify(pinnedEvidence));
      localStorage.setItem(`${STORAGE_KEY}_notes`, JSON.stringify(officerNotes));
      localStorage.setItem(`${STORAGE_KEY}_statuses`, JSON.stringify(standardStatuses));
    } catch (e) {
      console.warn('Storage sync failed:', e);
    }
  }, [savedStandards, pinnedEvidence, officerNotes, standardStatuses]);

  const toggleSaveStandard = (standardId) => {
    setSavedStandards(prev => 
      prev.includes(standardId) ? prev.filter(id => id !== standardId) : [...prev, standardId]
    );
  };

  const isStandardSaved = (standardId) => savedStandards.includes(standardId);

  const pinEvidenceItem = (item) => {
    setPinnedEvidence(prev => {
      const exists = prev.some(e => e.text === item.text && e.standard_id === item.standard_id);
      if (exists) return prev;
      return [
        {
          id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...item,
          pinned_at: new Date().toISOString()
        },
        ...prev
      ];
    });
  };

  const unpinEvidenceItem = (id) => {
    setPinnedEvidence(prev => prev.filter(item => item.id !== id));
  };

  const isEvidencePinned = (text, standardId) => {
    return pinnedEvidence.some(e => e.text === text && (!standardId || e.standard_id === standardId));
  };

  const updateNote = (standardId, note) => {
    setOfficerNotes(prev => ({ ...prev, [standardId]: note }));
  };

  const setOfficerReviewStatus = (standardId, status) => {
    // Valid values: 'REVIEWED' | 'NEEDS_CLARIFICATION' | 'RELEVANT' | 'NOT_RELEVANT'
    setStandardStatuses(prev => ({ ...prev, [standardId]: status }));
  };

  const clearDossier = () => {
    setSavedStandards([]);
    setPinnedEvidence([]);
    setOfficerNotes({});
    setStandardStatuses({});
  };

  return (
    <ReviewContext.Provider value={{
      savedStandards,
      pinnedEvidence,
      officerNotes,
      standardStatuses,
      toggleSaveStandard,
      isStandardSaved,
      pinEvidenceItem,
      unpinEvidenceItem,
      isEvidencePinned,
      updateNote,
      setOfficerReviewStatus,
      clearDossier
    }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  return useContext(ReviewContext);
}
