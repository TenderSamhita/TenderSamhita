import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Navigation State
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeStandardId, setActiveStandardId] = useState('IS_1448_Part_97_2026');
  const [deepDiveTab, setDeepDiveTab] = useState('mindmap'); // Default to Mind Map (Knowledge Map) hero!
  
  // Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isStandardInfoOpen, setIsStandardInfoOpen] = useState(false);
  const [selectedMindMapNode, setSelectedMindMapNode] = useState(null);

  // Active Tender Specification Data
  const [tenderText, setTenderText] = useState(
    'Procurement of Jet Fuel Thermal Oxidation Stability Test Apparatus and consumables. Requirements: Heater tube diameter 4.737 mm, test temperature 260 deg C, operating pressure 3.45 MPa, volumetric fuel flow 3.0 mL/min for aviation turbine fuel qualification.'
  );
  const [tenderAnalysis, setTenderAnalysis] = useState(null);
  const [recommendationResult, setRecommendationResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Modal States
  const [sourceViewerState, setSourceViewerState] = useState({
    isOpen: false,
    standardId: null,
    isNumber: null,
    page: 1,
    highlight: '',
    title: '',
    property: '',
    value: '',
    section: ''
  });

  const [lightboxState, setLightboxState] = useState({
    isOpen: false,
    figure: null
  });

  // Action helpers
  const navigateTo = (view, extra = {}) => {
    setCurrentView(view);
    if (extra.standardId) setActiveStandardId(extra.standardId);
    if (extra.tab) setDeepDiveTab(extra.tab);
  };

  const openStandard = (standardId, tab = 'mindmap') => {
    setActiveStandardId(standardId);
    setDeepDiveTab(tab);
    setCurrentView('deepdive');
    setSelectedMindMapNode(null);
  };

  const openSourcePage = (standardId, page = 1, highlight = '', isNumber = '', extraDetails = {}) => {
    setSourceViewerState({
      isOpen: true,
      standardId,
      isNumber: isNumber || standardId.replace(/_/g, ' '),
      page: Number(page) || 1,
      highlight,
      title: extraDetails.title || '',
      property: extraDetails.property || '',
      value: extraDetails.value || '',
      section: extraDetails.section || ''
    });
  };

  const closeSourcePage = () => {
    setSourceViewerState(prev => ({ ...prev, isOpen: false }));
  };

  const openFigureLightbox = (figure) => {
    setLightboxState({
      isOpen: true,
      figure
    });
  };

  const closeFigureLightbox = () => {
    setLightboxState({
      isOpen: false,
      figure: null
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <AppContext.Provider value={{
      currentView,
      setCurrentView,
      activeStandardId,
      setActiveStandardId,
      deepDiveTab,
      setDeepDiveTab,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      isStandardInfoOpen,
      setIsStandardInfoOpen,
      selectedMindMapNode,
      setSelectedMindMapNode,
      tenderText,
      setTenderText,
      tenderAnalysis,
      setTenderAnalysis,
      recommendationResult,
      setRecommendationResult,
      comparisonResult,
      setComparisonResult,
      sourceViewerState,
      lightboxState,
      navigateTo,
      openStandard,
      openSourcePage,
      closeSourcePage,
      openFigureLightbox,
      closeFigureLightbox
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
