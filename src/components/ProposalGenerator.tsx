/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  Building2, 
  MapPin, 
  BarChart3, 
  Maximize2, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronDown,
  Sparkles,
  Download,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";

interface CompanyProfile {
  logo: string;
  aeName: string;
  aePhoto: string;
  aePhone: string;
  aeEmail: string;
  website: string;
  companyPhone: string;
  brandColor: string;
  backgroundImage: string;
}

interface BillboardLocation {
  id: string;
  name: string;
  type: 'Digital' | 'Static';
  size: string;
  trafficCount: string;
  weeklyImpressions: string;
  location: string;
  photo: string;
}

interface AdvertiserInfo {
  businessName: string;
  businessType: string;
  zipCode: string;
  address: string;
}

const STORAGE_KEY_PROFILE = 'billboard_pilot_company_profile';
const STORAGE_KEY_LOCATIONS = 'billboard_pilot_locations';

export default function ProposalGenerator() {
  const [profile, setProfile] = useState<CompanyProfile>({
    logo: '',
    aeName: '',
    aePhoto: '',
    aePhone: '',
    aeEmail: '',
    website: '',
    companyPhone: '',
    brandColor: '#0f172a',
    backgroundImage: ''
  });

  const [advertiser, setAdvertiser] = useState<AdvertiserInfo>({
    businessName: '',
    businessType: '',
    zipCode: '',
    address: ''
  });

  const [locations, setLocations] = useState<BillboardLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<BillboardLocation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiPitch, setAiPitch] = useState('');
  const [locationBenefits, setLocationBenefits] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
      setShowProfileForm(false);
    }

    const savedLocations = localStorage.getItem(STORAGE_KEY_LOCATIONS);
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    }
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      const loc = locations.find(l => l.id === selectedLocationId);
      if (loc) {
        setCurrentLocation({ ...loc });
        setIsSaved(true);
      }
    } else {
      setCurrentLocation(null);
    }
  }, [selectedLocationId, locations]);

  const saveProfile = (newProfile: CompanyProfile) => {
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
  };

  const persistLocations = (newLocations: BillboardLocation[]) => {
    setLocations(newLocations);
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(newLocations));
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 1;
          canvas.height = 1;
          ctx?.drawImage(img, 0, 0, 1, 1);
          const data = ctx?.getImageData(0, 0, 1, 1).data;
          if (data) {
            const hex = rgbToHex(data[0], data[1], data[2]);
            saveProfile({ ...profile, logo: dataUrl, brandColor: hex });
          } else {
            saveProfile({ ...profile, logo: dataUrl });
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const handleAEPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        saveProfile({ ...profile, aePhoto: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        saveProfile({ ...profile, backgroundImage: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBillboardPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentLocation) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCurrentLocation({ ...currentLocation, photo: event.target?.result as string });
        setIsSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addNewLocation = () => {
    const newLoc: BillboardLocation = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'Digital',
      size: '',
      trafficCount: '',
      weeklyImpressions: '',
      location: '',
      photo: ''
    };
    setCurrentLocation(newLoc);
    setSelectedLocationId(newLoc.id);
    setIsSaved(false);
  };

  const updateCurrentLocation = (field: keyof BillboardLocation, value: string) => {
    if (currentLocation) {
      setCurrentLocation({ ...currentLocation, [field]: value });
      setIsSaved(false);
    }
  };

  const saveCurrentLocation = () => {
    if (currentLocation) {
      const exists = locations.find(l => l.id === currentLocation.id);
      let updated;
      if (exists) {
        updated = locations.map(l => l.id === currentLocation.id ? currentLocation : l);
      } else {
        updated = [...locations, currentLocation];
      }
      persistLocations(updated);
      setIsSaved(true);
    }
  };

  const deleteLocation = (id: string) => {
    const updated = locations.filter(loc => loc.id !== id);
    persistLocations(updated);
    if (selectedLocationId === id) {
      setSelectedLocationId('');
      setCurrentLocation(null);
    }
  };

  const generateAIProposalCopy = async () => {
    if (!advertiser.businessType || !selectedLocationId) {
      alert("Please enter a business type and select a billboard location first.");
      return;
    }

    const loc = locations.find(l => l.id === selectedLocationId);
    if (!loc) return;

    setIsAILoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Part 1: Sales Pitch
      const pitchPrompt = `Write a professional, persuasive sales pitch for a billboard proposal.
      The advertiser is a "${advertiser.businessType}" named "${advertiser.businessName || 'our client'}".
      Explain why outdoor advertising (billboards) is specifically effective for this industry.
      Focus on high-frequency visibility, local targeting, and brand authority.
      STRICT REQUIREMENT: Keep it very short and to the point. Do NOT exceed 45 words.
      Ready to be printed on a proposal sheet.
      Do not include placeholders like [Name]. Use the provided business name if available.`;

      const pitchResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: pitchPrompt,
      });

      setAiPitch(pitchResponse.text || '');

      // Part 2: Location Benefits
      const benefitsPrompt = `Analyze the synergy between this billboard location and this advertiser.
      Billboard Location: ${loc.location}
      Advertiser: ${advertiser.businessName} (${advertiser.businessType}) located at ${advertiser.address || advertiser.zipCode}.
      Explain specifically why THIS billboard location will work well for THIS advertiser.
      Mention things like proximity to their business (if known or likely), demographic fit of people driving by that location for their service, or general local relevance.
      Keep it to 2-3 professional sentences. Max 60 words.`;

      const benefitsResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: benefitsPrompt,
      });

      setLocationBenefits(benefitsResponse.text || '');
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("AI copy generation failed. You can still write your own.");
    } finally {
      setIsAILoading(false);
    }
  };

  const cropImage = async (base64: string, targetWidth: number, targetHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }

        const imgAspectRatio = img.width / img.height;
        const targetAspectRatio = targetWidth / targetHeight;

        let renderWidth, renderHeight, xOffset, yOffset;

        if (imgAspectRatio > targetAspectRatio) {
          renderHeight = img.height;
          renderWidth = img.height * targetAspectRatio;
          xOffset = (img.width - renderWidth) / 2;
          yOffset = 0;
        } else {
          renderWidth = img.width;
          renderHeight = img.width / targetAspectRatio;
          xOffset = 0;
          yOffset = (img.height - renderHeight) / 2;
        }

        ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const generatePDF = async () => {
    if (!selectedLocationId) {
      alert("Please select a billboard location first.");
      return;
    }

    const loc = locations.find(l => l.id === selectedLocationId);
    if (!loc) return;

    setIsGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const accentColor = profile.brandColor || '#FF0000';
      
      // Scaling factor from SVG (612x792) to Letter (215.9x279.4 mm)
      const k = 215.9 / 612;

      // Helper to render SVG to Data URL (PNG)
      const renderSvg = async (svgStr: string): Promise<string> => {
        return new Promise((resolve) => {
          const svg = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svg);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1224; // High DPI (2x 612)
            canvas.height = 1584; // High DPI (2x 792)
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 1224, 1584);
              const dataUrl = canvas.toDataURL('image/png');
              resolve(dataUrl);
            } else {
              resolve('');
            }
            URL.revokeObjectURL(url);
          };
          img.onerror = () => resolve('');
          img.src = url;
        });
      };

      // 1. BACKGROUND LAYER
      if (profile.backgroundImage) {
        try {
          doc.addImage(profile.backgroundImage, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        } catch (e) {
          doc.setFillColor(248, 250, 252);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
      } else {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      }

      const headerSvg = `
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
           width="612px" height="792px" viewBox="0 0 612 792" style="enable-background:new 0 0 612 792;" xml:space="preserve">
        <style type="text/css">
          .st0{fill:#FFFFFF;}
          .st1{fill:${accentColor};}
        </style>
        <path class="st0" d="M543.1,162.3H69.15c-7.16,0-12.96-5.8-12.96-12.96V48.03c0-7.16,5.8-12.96,12.96-12.96H543.1
          c7.16,0,12.96,5.8,12.96,12.96v101.31C556.06,156.49,550.26,162.3,543.1,162.3z"/>
        <g>
          <polygon class="st1" points="397.97,30.66 396.3,40.58 399.7,40.58 398.03,30.66 	"/>
          <path class="st1" d="M371.52,30.27h-1.18v5.5h1.22v-0.01c0.87,0,1.52-0.26,1.93-0.77c0.41-0.51,0.62-1.18,0.62-2.01
            c0-0.98-0.2-1.68-0.61-2.09C373.1,30.48,372.44,30.27,371.52,30.27z"/>
          <path class="st1" d="M355.45,31.19c-0.14-0.61-0.35-1.04-0.62-1.28c-0.27-0.24-0.64-0.36-1.1-0.36c-0.46,0-0.82,0.12-1.1,0.36
            c-0.28,0.24-0.48,0.67-0.62,1.28s-0.23,1.43-0.28,2.47c-0.04,1.04-0.07,2.34-0.07,3.91c0.01,1.57,0.03,2.87,0.07,3.91
            c0.04,1.04,0.14,1.86,0.28,2.47c0.14,0.61,0.35,1.04,0.62,1.28c0.27,0.24,0.64,0.36,1.1,0.36c0.46,0,0.82-0.12,1.1-0.36
            c0.27-0.24,0.48-0.67,0.62-1.28c0.14-0.61,0.23-1.43,0.28-2.47c0.04-1.04,0.07-2.34,0.07-3.91s-0.02-2.88-0.07-3.91
            C355.69,32.62,355.59,31.8,355.45,31.19z"/>
          <path class="st1" d="M418.05,31.53c-0.19-0.52-0.45-0.87-0.8-1.03s-0.82-0.25-1.41-0.25h-1.21v14.6h1.21v0.01
            c0.59,0,1.06-0.08,1.41-0.25c0.35-0.16,0.62-0.51,0.8-1.03c0.18-0.52,0.3-1.27,0.36-2.23c0.06-0.96,0.08-2.23,0.08-3.8
            s-0.03-2.84-0.08-3.8S418.24,32.05,418.05,31.53z"/>
          <path class="st1" d="M266.96,31.19c-0.14-0.61-0.35-1.04-0.62-1.28c-0.27-0.24-0.64-0.36-1.1-0.36c-0.46,0-0.82,0.12-1.1,0.36
            c-0.27,0.24-0.48,0.67-0.62,1.28c-0.14,0.61-0.23,1.43-0.28,2.47c-0.04,1.04-0.07,2.34-0.07,3.91c0.01,1.57,0.03,2.87,0.07,3.91
            c0.04,1.04,0.14,1.86,0.28,2.47s0.35,1.04,0.62,1.28c0.27,0.24,0.64,0.36,1.1,0.36c0.46,0,0.82-0.12,1.1-0.36
            c0.27-0.24,0.48-0.67,0.62-1.28s0.23-1.43,0.28-2.47c0.04-1.04,0.07-2.34,0.07-3.91s-0.02-2.88-0.07-3.91
            C267.2,32.62,267.1,31.8,266.96,31.19z"/>
          <path class="st1" d="M468.01,35.76c0.87,0,1.52-0.26,1.93-0.77c0.41-0.51,0.62-1.18,0.62-2.01c0-0.98-0.2-1.68-0.61-2.09
            c-0.4-0.41-1.06-0.62-1.98-0.62h-1.18v5.5h1.22V35.76z"/>
          <path class="st1" d="M318.6,31.53c-0.19-0.52-0.45-0.87-0.8-1.03c-0.35-0.16-0.82-0.25-1.41-0.25h-1.21v14.6h1.21v0.01
            c0.59,0,1.06-0.08,1.41-0.25c0.35-0.16,0.62-0.51,0.8-1.03c0.19-0.52,0.31-1.27,0.36-2.23c0.05-0.96,0.08-2.23,0.08-3.8
            s-0.03-2.84-0.08-3.8S318.79,32.05,318.6,31.53z"/>
          <path class="st1" d="M335.69,60.98c-0.28-0.21-1.27,0.04-2.98,0.73c-0.31,0.14-0.5,0.24-0.58,0.31c-0.07,0.07-0.07,0.13,0,0.18
            s0.23,0.13,0.47,0.24c0.14,0.08,0.26,0.13,0.37,0.16c0.49,0.25,0.85,0.44,1.1,0.58c0.35,0.25,0.65,0.42,0.89,0.52
            c0.21-0.28,0.43-0.76,0.65-1.44C335.84,61.58,335.86,61.15,335.69,60.98z"/>
          <path class="st1" d="M341.22,59.06c-0.38,0.1-0.71,0.22-0.97,0.34s-0.47,0.23-0.63,0.31c-0.16,0.09-0.29,0.24-0.39,0.47
            c-0.1,0.23-0.18,0.4-0.24,0.52c-0.05,0.12-0.13,0.38-0.24,0.76s-0.19,0.7-0.26,0.94c0.02,0.06-0.5,1.77-1.55,5.12
            c-1.12,3.45-1.66,5.23-1.62,5.33c0,0.1,0.05,0.17,0.16,0.21c0.1,0.04,0.24,0.04,0.39,0.03c0.16-0.02,0.3-0.04,0.44-0.08
            c0.14-0.03,0.3-0.08,0.47-0.13c0.17-0.05,0.28-0.1,0.31-0.13c4.64-1.22,7.9-2.16,9.78-2.82c7.63-2.79,11.21-5.86,10.72-9.2
            C357.03,57.04,351.58,56.48,341.22,59.06z"/>
          <path class="st1" d="M333.82,43.95c0.14,0.61,0.35,1.04,0.62,1.28c0.27,0.24,0.64,0.36,1.1,0.36c0.46,0,0.82-0.12,1.1-0.36
            c0.27-0.24,0.48-0.67,0.62-1.28c0.14-0.61,0.23-1.43,0.28-2.47c0.04-1.04,0.07-2.34,0.07-3.91s-0.02-2.88-0.07-3.91
            c-0.04-1.04-0.14-1.86-0.28-2.47s-0.35-1.04-0.62-1.28c-0.27-0.24-0.64-0.36-1.1-0.36c-0.46,0-0.82,0.12-1.1,0.36
            c-0.28,0.24-0.48,0.67-0.62,1.28s-0.23,1.43-0.28,2.47c-0.04,1.04-0.07,2.34-0.07,3.91s0.02,2.87,0.07,3.91
            C333.58,42.52,333.68,43.34,333.82,43.95z"/>
          <path class="st1" d="M429.95,81.42c-0.31,0.63-0.36,0.91-0.15,0.84c0.91-0.45,1.76-1.52,2.56-3.19c0.42-0.91,0.49-1.32,0.21-1.25
            c-0.17,0.07-0.54,0.49-1.1,1.25C431.12,79.42,430.62,80.2,429.95,81.42z"/>
          <path class="st1" d="M429.85,71.98c-0.84,0-1.64,0.35-2.41,1.05c-1.08,1.05-2.05,2.56-2.9,4.55c-0.85,1.99-1.28,3.76-1.28,5.33
            c0,0.63,0.11,0.99,0.34,1.1c0.23,0.11,0.61-0.07,1.13-0.49c0.56-0.45,1.1-1.05,1.62-1.78c0.52-0.73,1.08-1.59,1.67-2.59
            c0.59-0.99,1.03-1.72,1.31-2.17c0.14-0.21,0.29-0.4,0.44-0.58c0.16-0.17,0.28-0.32,0.37-0.44c0.09-0.12,0.24-0.27,0.44-0.44
            c0.21-0.17,0.35-0.3,0.42-0.37c0.07-0.07,0.24-0.22,0.52-0.44c0.28-0.23,0.47-0.37,0.58-0.44c0.28-0.24,0.41-0.42,0.39-0.52
            c-0.02-0.1-0.15-0.28-0.39-0.52C431.44,72.39,430.69,71.98,429.85,71.98z"/>
          <path class="st1" d="M400.83,83.99c4.5-2.13,7.9-4.88,10.2-8.26c1.12-1.67,0.98-2.47-0.42-2.41c-0.94,0.04-1.95,0.37-3.03,0.99
            c-2.41,1.39-4.97,4.44-7.69,9.15c-0.31,0.56-0.36,0.86-0.13,0.89C399.99,84.39,400.34,84.27,400.83,83.99z"/>
          <path class="st1" d="M385.93,75.52c0.21-0.17,0.35-0.3,0.42-0.37c0.07-0.07,0.24-0.22,0.52-0.44c0.28-0.23,0.47-0.37,0.58-0.44
            c0.28-0.24,0.41-0.42,0.39-0.52c-0.02-0.1-0.15-0.28-0.39-0.52c-0.66-0.84-1.41-1.25-2.25-1.25c-0.84,0-1.64,0.35-2.41,1.05
            c-1.08,1.05-2.05,2.56-2.9,4.55c-0.85,1.99-1.28,3.76-1.28,5.33c0,0.63,0.11,0.99,0.34,1.1c0.23,0.11,0.6-0.07,1.13-0.49
            c0.56-0.45,1.1-1.05,1.62-1.78c0.52-0.73,1.08-1.59,1.67-2.59c0.59-0.99,1.03-1.72,1.31-2.17c0.14-0.21,0.29-0.4,0.44-0.58
            c0.16-0.17,0.28-0.32,0.37-0.44C385.58,75.84,385.73,75.69,385.93,75.52z"/>
          <path class="st1" d="M385.15,82.26c0.91-0.45,1.76-1.52,2.56-3.19c0.42-0.91,0.49-1.32,0.21-1.25c-0.17,0.07-0.54,0.49-1.1,1.25
            c-0.35,0.35-0.85,1.13-1.52,2.35C384.99,82.05,384.94,82.33,385.15,82.26z"/>
          <path class="st1" d="M0.3,0.33v110.08c24.53,7.49,97.24,18.83,293.65-4.79c36.37-4.37,68.74-7.36,97.52-9.26
            c0.4-1.28,1.17-3.75,2.3-7.4c0.17-0.56,0.88-2.75,2.12-6.59c0.88-2.71,1.59-4.96,2.14-6.77c-1.45,0.5-3.35,0.75-5.72,0.75
            c-0.52,0-0.87,0.1-1.05,0.31c-0.18,0.21-0.26,0.6-0.26,1.16c-0.42,1.95-1.12,3.5-2.09,4.65c-0.84,1.25-1.95,2.23-3.35,2.93
            l-0.42,0.21c-0.91,0.45-1.97,0.8-3.19,1.04c-1.22,0.25-2.34,0.31-3.35,0.21c-0.84-0.03-1.5-0.32-1.99-0.86s-0.78-1.23-0.86-2.07
            c-0.09-0.84-0.1-1.64-0.05-2.41c0.05-0.77,0.17-1.52,0.34-2.25c0.03-0.09,0.07-0.19,0.09-0.28c-0.35,0.18-0.72,0.36-1.1,0.52
            c-1.5,0.63-2.88,0.75-4.13,0.37c-0.28-0.1-0.52-0.24-0.73-0.39c-0.21-0.16-0.38-0.3-0.5-0.45c-0.12-0.14-0.21-0.33-0.26-0.58
            c-0.05-0.24-0.1-0.44-0.13-0.6c-0.04-0.16-0.03-0.37,0.03-0.65c0.05-0.28,0.1-0.5,0.13-0.65c0.03-0.16,0.11-0.39,0.24-0.71
            c0.12-0.31,0.21-0.53,0.26-0.65c0.05-0.12,0.16-0.35,0.31-0.68c0.16-0.33,0.24-0.53,0.24-0.6c0.42-0.73,0.55-1.27,0.39-1.62
            c-0.16-0.35-0.72-0.37-1.7-0.05c-0.59,0.17-1.18,0.4-1.75,0.68c-0.58,0.28-1.12,0.65-1.65,1.1c-0.52,0.45-0.99,0.86-1.39,1.2
            c-0.4,0.35-0.84,0.85-1.31,1.52c-0.47,0.67-0.84,1.17-1.1,1.52c-0.26,0.35-0.62,0.92-1.07,1.73c-0.45,0.8-0.76,1.35-0.92,1.65
            c-0.16,0.3-0.47,0.89-0.94,1.78c-0.47,0.89-0.74,1.44-0.81,1.65c-0.04,0.04-0.1,0.13-0.18,0.29c-0.09,0.16-0.15,0.27-0.18,0.34
            c-0.04,0.07-0.1,0.17-0.18,0.31c-0.09,0.14-0.16,0.25-0.21,0.31c-0.05,0.07-0.12,0.16-0.21,0.26c-0.09,0.1-0.18,0.17-0.29,0.21
            c-0.11,0.04-0.21,0.08-0.31,0.13c-0.1,0.05-0.22,0.07-0.34,0.05c-0.12-0.02-0.27-0.04-0.44-0.08c-0.87-0.28-1.17-0.94-0.89-1.99
            c0.21-0.77,0.55-1.86,1.02-3.29c0.49-1.47,0.76-2.34,0.83-2.65c1.32-4.22,2.2-6.94,2.61-8.16c0.14-0.42,0.28-0.75,0.42-0.99
            s0.36-0.45,0.65-0.63c0.29-0.18,0.65-0.19,1.07-0.05c0.35,0.14,0.61,0.28,0.78,0.42c0.17,0.14,0.26,0.32,0.26,0.55
            c0,0.23-0.01,0.4-0.03,0.52c-0.02,0.12-0.1,0.36-0.24,0.71c-0.14,0.35-0.23,0.56-0.26,0.63c-0.63,1.81-0.89,2.75-0.78,2.82
            c0.07,0.04,0.16,0.02,0.26-0.05c0.1-0.07,0.24-0.18,0.39-0.34c0.16-0.16,0.29-0.3,0.42-0.44c0.12-0.14,0.25-0.29,0.39-0.44
            c0.14-0.16,0.23-0.24,0.26-0.24c0.98-1.05,2.04-1.92,3.19-2.61c0.7-0.45,1.4-0.82,2.12-1.1c0.71-0.28,1.52-0.47,2.41-0.57
            c0.89-0.11,1.65,0.03,2.27,0.42c0.7,0.38,1.1,0.92,1.2,1.62c0.1,0.7,0.02,1.38-0.26,2.04c-0.28,0.66-0.58,1.39-0.92,2.2
            c-0.33,0.8-0.51,1.4-0.55,1.78c0,1.12,1.46,0.31,4.39-2.41c0.17-0.14,0.29-0.26,0.37-0.37c0.66-0.59,1.17-1.08,1.52-1.46
            c0.5-0.57,0.93-0.95,1.31-1.15c0.35-0.39,0.72-0.76,1.1-1.08c0.84-0.7,1.77-1.19,2.8-1.49c1.03-0.29,2.1-0.2,3.22,0.29
            c0.98,0.42,1.72,0.95,2.22,1.59c0.5,0.65,0.84,1.19,1.02,1.65c0.17,0.45,0.35,0.71,0.52,0.79c1.22,0.35,2.36,0.38,3.42,0.1
            c1.06-0.28,2.12-0.63,3.16-1.05c0.73-0.27,1.23-0.44,1.54-0.52c0.1-0.34,0.19-0.65,0.26-0.87c0.1-0.35,0.28-0.73,0.52-1.15
            s0.5-0.68,0.78-0.78c0.56-0.24,1.02-0.17,1.39,0.21s0.53,0.85,0.5,1.41v0.16c-0.07,0.35-0.39,1.32-0.97,2.9
            c-0.58,1.59-0.83,2.5-0.76,2.75c0.07,0.24,0.66-0.33,1.78-1.73c1.29-1.46,2.81-2.64,4.55-3.53s3.43-1.14,5.07-0.76
            c1.29,0.31,2.09,1.02,2.41,2.12c0.31,1.1,0.17,2.21-0.42,3.32c-0.31,0.73-0.82,1.55-1.52,2.46c-0.63,0.77-1.52,1.71-2.67,2.82
            c-1.08,1.01-0.77,1.1,0.94,0.26c0.1-0.03,0.26-0.1,0.47-0.21c0.14-0.1,0.23-0.16,0.26-0.16c2.23-1.12,4.12-2.16,5.67-3.14
            c1.55-0.98,3.09-2.18,4.63-3.61c0.31-0.31,0.57-0.55,0.76-0.71c0.19-0.16,0.46-0.33,0.81-0.52c0.01,0,0.01,0,0.02-0.01
            c0.69-1.04,1.44-1.91,2.27-2.6c0.84-0.7,1.77-1.19,2.8-1.49c1.03-0.29,2.1-0.2,3.22,0.29c0.98,0.42,1.72,0.95,2.22,1.59
            c0.5,0.65,0.84,1.19,1.02,1.65c0.17,0.45,0.35,0.71,0.52,0.79c1.22,0.35,2.36,0.38,3.42,0.1c1.06-0.28,2.12-0.63,3.16-1.05
            c0.55-0.2,0.98-0.35,1.29-0.44c0.66-0.66,1.66-1.34,2.99-2.03c1.41-0.73,2.5-0.99,3.27-0.78l0.1,0.05
            c0.59,0.28,0.86,0.71,0.81,1.28c-0.05,0.58-0.38,1.04-0.97,1.39c-0.07,0.04-0.46,0.18-1.18,0.44c-0.71,0.26-1.28,0.53-1.7,0.81
            c-0.42,0.28-0.63,0.58-0.63,0.89c0,0.28,0.18,0.59,0.55,0.94c0.37,0.35,0.82,0.71,1.36,1.07c0.54,0.37,0.88,0.64,1.02,0.81
            c0.28,0.28,0.56,0.63,0.84,1.05c0.52,0.8,0.79,1.65,0.81,2.54c0.02,0.89-0.27,1.72-0.86,2.48c-0.77,0.87-2.05,1.67-3.84,2.41
            c-1.8,0.73-3.41,1.24-4.84,1.52c-0.63,0.1-1.18,0.07-1.65-0.1c-0.47-0.17-0.69-0.58-0.65-1.2c0-0.28,0.1-0.53,0.29-0.76
            c0.19-0.23,0.46-0.42,0.81-0.58c0.35-0.16,0.66-0.28,0.94-0.37c0.28-0.09,0.64-0.18,1.1-0.29c0.46-0.13,0.74-0.19,0.84-0.23
            c0.28-0.07,0.51-0.13,0.71-0.18c0.19-0.05,0.47-0.14,0.84-0.26s0.69-0.24,0.97-0.37c0.28-0.12,0.58-0.26,0.89-0.42
            c0.31-0.16,0.58-0.33,0.78-0.52s0.38-0.4,0.52-0.63c0.14-0.23,0.2-0.47,0.18-0.73c-0.02-0.26-0.11-0.51-0.29-0.76
            c-0.24-0.38-0.66-0.82-1.25-1.31c-0.59-0.49-1.16-0.93-1.7-1.33c-0.54-0.4-1.02-0.84-1.44-1.33c-0.02-0.02-0.04-0.05-0.06-0.08
            c-1.49,0.6-3.52,0.91-6.11,0.91c-0.52,0-0.87,0.1-1.05,0.31c-0.18,0.21-0.26,0.59-0.26,1.15c-0.42,1.95-1.12,3.5-2.09,4.65
            c-0.84,1.25-1.95,2.23-3.35,2.93l-0.42,0.21c-0.91,0.45-1.97,0.8-3.19,1.04c-1.22,0.25-2.34,0.31-3.35,0.21
            c-0.84-0.03-1.5-0.32-1.99-0.86c-0.49-0.54-0.78-1.23-0.86-2.07c-0.09-0.84-0.1-1.64-0.05-2.41c0.05-0.73,0.16-1.44,0.32-2.13
            c-2.43,1.78-4.92,3.24-7.46,4.35c-3.4,1.5-7.29,2.7-11.69,3.61c-0.17,0-0.53,0.04-1.07,0.13c-0.54,0.09-0.97,0.16-1.28,0.21
            s-0.67,0.17-1.07,0.34c-0.4,0.17-0.69,0.38-0.86,0.63c-0.21,0.24-0.42,0.61-0.63,1.1c-0.21,0.49-0.38,0.94-0.52,1.36
            c-0.14,0.42-0.29,0.93-0.44,1.54c-0.16,0.61-0.27,1.02-0.34,1.23c-0.25,0.82-0.48,1.58-0.7,2.27
            c178.54-11.4,217.03,19.43,217.03,19.43V0.33H0.3z M327.61,31.99c0.28-1.54,0.75-2.79,1.41-3.76c0.65-0.97,1.52-1.68,2.58-2.13
            c1.07-0.45,2.38-0.67,3.93-0.67s2.86,0.22,3.93,0.67c1.07,0.45,1.93,1.16,2.59,2.13c0.65,0.97,1.12,2.23,1.41,3.76
            c0.28,1.54,0.43,3.4,0.43,5.58s-0.14,4.04-0.43,5.58c-0.28,1.54-0.75,2.79-1.41,3.76c-0.66,0.97-1.52,1.66-2.59,2.08
            c-1.07,0.41-2.38,0.62-3.93,0.62s-2.86-0.21-3.93-0.62c-1.07-0.41-1.93-1.11-2.58-2.08c-0.65-0.97-1.12-2.23-1z"/>
        </g>
        </svg>
      `;
      // We manually center text shift because the provided matrix is absolute to 612 width
      const headerDataUrl = await renderSvg(headerSvg);
      if (headerDataUrl) {
        doc.addImage(headerDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      // 3. LOGO PLACEMENT (Within white box: x:56, y:35, w:500, h:127)
      if (profile.logo) {
        const logoX = (69.15) * k;
        const logoY = (48.03) * k;
        const logoW = (474) * k;
        const logoH = (101) * k;
        const pad = 4;
        // fit image in white box
        doc.addImage(profile.logo, 'PNG', logoX + pad, logoY + pad, logoW - (pad * 2), logoH - (pad * 2), undefined, 'FAST', 0);
      }

      // 4. PREPARED FOR BAR
      const barY = 175 * k;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth * 0.05, barY, pageWidth * 0.9, 14, 2, 2, 'F');
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      const bizStr = advertiser.businessName || 'Valued Partner';
      const prepStr = 'PREPARED FOR: ';
      const totalW = doc.getTextWidth(prepStr) + doc.getTextWidth(bizStr);
      const startX = (pageWidth - totalW) / 2;
      doc.text(prepStr, startX, barY + 9);
      doc.setFont('helvetica', 'bold');
      doc.text(bizStr, startX + doc.getTextWidth(prepStr), barY + 9);

      // 5. AI SALES PITCH (16-18pt left justified)
      const pitchY = barY + 25;
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14); // Adjusted for fit
      const pitchLines = doc.splitTextToSize(aiPitch || 'Advertising on this billboard provides exceptional visibility and brand authority for your business in this high-traffic area.', pageWidth - 30);
      doc.text(pitchLines, 15, pitchY, { align: 'left', lineHeightFactor: 1.25 });

      // 6. PHOTO LAYER (Targeted at precisely 325x226 points)
      const phW = 325 * k; 
      const phH = 226 * k;
      const phX = (pageWidth - phW) / 2; // Centered
      const midY = 105;

      if (loc.photo) {
        const croppedPhoto = await cropImage(loc.photo, 325, 226);
        doc.addImage(croppedPhoto, 'JPEG', phX, midY, phW, phH, undefined, 'FAST');
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(phX, midY, phW, phH, 'F');
      }

      // 7. INFO BUBBLES
      const bubblesSvg = `
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
           width="612px" height="792px" viewBox="0 0 612 792" style="enable-background:new 0 0 612 792;" xml:space="preserve">
        <style type="text/css">
          .st0{fill:${accentColor};}
          .st1{fill:#FFFFFF;}
        </style>
        <path class="st0" d="M571.66,342.15h-194.2c-12.53,0-22.69-10.16-22.69-22.69v0c0-12.53,10.16-22.69,22.69-22.69h194.2
          c12.53,0,22.69,10.16,22.69,22.69v0C594.35,331.99,584.19,342.15,571.66,342.15z"/>
        <g>
          <g>
            <path class="st1" d="M380.5,309.1v14.82h6.04v4.01H375.6V309.1H380.5z"/>
            <path class="st1" d="M387.6,314.02c0.23-1.24,0.61-2.25,1.13-3.03c0.53-0.78,1.22-1.35,2.08-1.71c0.86-0.36,1.92-0.54,3.16-0.54
              s2.3,0.18,3.16,0.54s1.56,0.93,2.08,1.71c0.53,0.78,0.91,1.79,1.13,3.03s0.34,2.74,0.34,4.5c0,1.76-0.11,3.26-0.34,4.5
              s-0.61,2.25-1.13,3.03s-1.22,1.34-2.08,1.67c-0.86,0.33-1.92,0.5-3.16,0.5s-2.3-0.17-3.16-0.5c-0.86-0.33-1.56-0.89-2.08-1.67
              c-0.53-0.78-0.91-1.79-1.13-3.03s-0.34-2.74-0.34-4.5C387.25,316.76,387.37,315.26,387.6,314.02z M392.37,321.67
              c0.04,0.83,0.11,1.5,0.22,1.99c0.11,0.49,0.28,0.84,0.5,1.03c0.22,0.19,0.51,0.29,0.88,0.29s0.66-0.1,0.88-0.29
              c0.22-0.19,0.39-0.54,0.5-1.03c0.11-0.49,0.19-1.16,0.22-1.99s0.05-1.89,0.05-3.15s-0.02-2.32-0.05-3.15
              c-0.04-0.83-0.11-1.5-0.22-1.99c-0.12-0.49-0.28-0.83-0.5-1.03c-0.22-0.19-0.51-0.29-0.88-0.29s-0.66,0.1-0.88,0.29
              s-0.39,0.54-0.5,1.03s-0.19,1.16-0.22,1.99c-0.04,0.84-0.05,1.89-0.05,3.15S392.33,320.83,392.37,321.67z"/>
            <path class="st1" d="M409.67,312.64c-0.21-0.39-0.55-0.58-1.03-0.58c-0.37,0-0.66,0.1-0.88,0.29s-0.39,0.54-0.5,1.03
              s-0.19,1.16-0.22,1.99c-0.04,0.84-0.05,1.89-0.05,3.15s0.02,2.32,0.05,3.15s0.11,1.5,0.22,1.99c0.11,0.49,0.28,0.84,0.5,1.03
              c0.22,0.19,0.51,0.29,0.88,0.29c0.3,0,0.54-0.07,0.74-0.22c0.19-0.15,0.34-0.4,0.45-0.75c0.11-0.35,0.18-0.82,0.22-1.41
              c0.04-0.59,0.07-1.33,0.07-2.23h4.75v1.4c0,1.32-0.18,2.4-0.53,3.24c-0.35,0.84-0.82,1.51-1.4,1.99s-1.24,0.81-1.99,0.98
              s-1.52,0.25-2.31,0.25c-1.37,0-2.5-0.17-3.38-0.5c-0.88-0.33-1.56-0.89-2.06-1.67s-0.83-1.79-1.02-3.03s-0.28-2.74-0.28-4.5
              c0-1.79,0.11-3.31,0.33-4.56c0.22-1.25,0.59-2.26,1.12-3.03c0.53-0.77,1.22-1.33,2.08-1.67s1.92-0.51,3.19-0.51
              c1.11,0,2.05,0.14,2.82,0.42s1.4,0.68,1.89,1.2c0.48,0.52,0.83,1.14,1.05,1.87c0.22,0.73,0.33,1.55,0.33,2.47v1.19h-4.75v-1.05
              C409.98,313.75,409.88,313.02,409.67,312.64z"/>
            <path class="st1" d="M425.88,309.1l4.59,18.83h-5.22l-0.5-3.3h-3.9l-0.5,3.3h-5.14l4.51-18.83H425.88z M422.77,312.95l-1.35,7.99
              h2.74l-1.34-7.99H422.77z"/>
            <path class="st1" d="M430.13,313.27v-4.17h12.24v4.17h-3.69v14.66h-4.91v-14.66H430.13z"/>
            <path class="st1" d="M448.19,309.1v18.83h-4.9V309.1H448.19z"/>
            <path class="st1" d="M450.12,314.02c0.23-1.24,0.61-2.25,1.13-3.03c0.53-0.78,1.22-1.35,2.08-1.71c0.86-0.36,1.92-0.54,3.16-0.54
              s2.3,0.18,3.16,0.54s1.56,0.93,2.08,1.71c0.53,0.78,0.91,1.79,1.13,3.03s0.34,2.74,0.34,4.5c0,1.76-0.11,3.26-0.34,4.5
              s-0.61,2.25-1.13,3.03s-1.22,1.34-2.08,1.67c-0.86,0.33-1.92,0.5-3.16,0.5s-2.3-0.17-3.16-0.5c-0.86-0.33-1.56-0.89-2.08-1.67
              c-0.53-0.78-0.91-1.79-1.13-3.03s-0.34-2.74-0.34-4.5C449.78,316.76,449.89,315.26,450.12,314.02z M454.89,321.67
              c0.04,0.83,0.11,1.5,0.22,1.99c0.11,0.49,0.28,0.84,0.5,1.03c0.22,0.19,0.51,0.29,0.88,0.29s0.66-0.1,0.88-0.29
              c0.22-0.19,0.39-0.54,0.5-1.03c0.11-0.49,0.19-1.16,0.22-1.99s0.05-1.89,0.05-3.15s-0.02-2.32-0.05-3.15
              c-0.04-0.83-0.11-1.5-0.22-1.99c-0.12-0.49-0.28-0.83-0.5-1.03c-0.22-0.19-0.51-0.29-0.88-0.29s-0.66,0.1-0.88,0.29
              s-0.39,0.54-0.5,1.03s-0.19,1.16-0.22,1.99c-0.04,0.84-0.05,1.89-0.05,3.15S454.86,320.83,454.89,321.67z"/>
            <path class="st1" d="M470.48,309.1l3.17,11.6h0.05v-11.6h4.59v18.83h-5.38l-3.27-11.63h-0.05v11.63h-4.59V309.1H470.48z"/>
            <path class="st1" d="M494.58,309.1c1.42,0,2.53,0.26,3.32,0.78c0.79,0.52,1.38,1.21,1.78,2.08c0.4,0.87,0.64,1.87,0.73,3.01
              s0.13,2.32,0.13,3.55s-0.04,2.41-0.13,3.55c-0.09,1.13-0.33,2.14-0.73,3.01c-0.4,0.87-0.99,1.56-1.78,2.08
              c-0.79,0.52-1.9,0.78-3.32,0.78h-7.12V309.1H494.58z M493.34,324.4c0.47,0,0.85-0.07,1.13-0.2s0.5-0.41,0.65-0.83
              c0.15-0.42,0.25-1.02,0.29-1.79c0.04-0.77,0.07-1.79,0.07-3.06s-0.02-2.29-0.07-3.06c-0.04-0.77-0.14-1.37-0.29-1.79
              c-0.15-0.42-0.37-0.7-0.65-0.83s-0.66-0.2-1.13-0.2h-0.98v11.76H493.34z"/>
            <path class="st1" d="M513.75,309.1v4.01h-6.25v3.22h5.85v3.85h-5.85v3.74h6.49v4.01h-11.39V309.1H513.75z"/>
            <path class="st1" d="M514.62,313.27v-4.17h12.24v4.17h-3.69v14.66h-4.91v-14.66H514.62z"/>
            <path class="st1" d="M537.22,309.1l4.59,18.83h-5.22l-0.5-3.3h-3.9l-0.5,3.3h-5.14l4.51-18.83H537.22z M534.11,312.95l-1.34,7.99
              h2.74l-1.34-7.99H534.11z"/>
            <path class="st1" d="M547.34,309.1v18.83h-4.9V309.1H547.34z"/>
            <path class="st1" d="M554.38,309.1v14.82h6.04v4.01h-10.94V309.1H554.38z"/>
            <path class="st1" d="M569.02,314.09c0-0.56-0.12-1.04-0.34-1.44c-0.23-0.4-0.58-0.59-1.05-0.59c-0.53,0-0.92,0.17-1.16,0.51
              c-0.25,0.34-0.37,0.73-0.37,1.15c0,0.62,0.2,1.1,0.59,1.46c0.4,0.36,0.89,0.67,1.49,0.94c0.6,0.26,1.24,0.53,1.92,0.8
              s1.33,0.63,1.92,1.07s1.09,1.02,1.49,1.73s0.59,1.64,0.59,2.78c0,2-0.57,3.46-1.71,4.36c-1.14,0.91-2.79,1.36-4.96,1.36
              c-1.02,0-1.92-0.08-2.7-0.25c-0.78-0.17-1.44-0.46-1.98-0.87s-0.94-0.95-1.23-1.62c-0.28-0.67-0.42-1.49-0.42-2.48v-0.66h4.75
              v0.45c0,0.81,0.15,1.38,0.45,1.7c0.3,0.33,0.69,0.49,1.16,0.49c0.51,0,0.9-0.18,1.17-0.53c0.27-0.35,0.41-0.78,0.41-1.29
              c0-0.62-0.19-1.1-0.57-1.46s-0.85-0.67-1.42-0.92c-0.57-0.25-1.19-0.51-1.86-0.78s-1.29-0.61-1.86-1.03
              c-0.57-0.42-1.05-0.98-1.42-1.66c-0.38-0.69-0.57-1.58-0.57-2.69c0-1.92,0.51-3.38,1.53-4.38s2.57-1.5,4.64-1.5
              c2.14,0,3.7,0.46,4.65,1.38c0.96,0.92,1.44,2.4,1.44,4.42h-4.59V314.09z"/>
          </g>
        </g>
        <path class="st0" d="M251.76,582.15H46.33c-13.25,0-24-10.16-24-22.69v0c0-12.53,10.74-22.69,24-22.69h205.43
          c13.25,0,24,10.16,24,22.69v0C275.76,571.99,265.02,582.15,251.76,582.15z"/>
        <g>
          <g>
            <path class="st1" d="M48.06,550.1v14.82h6.04v4.01H43.15V550.1H48.06z"/>
            <path class="st1" d="M55.15,555.02c0.23-1.24,0.61-2.25,1.13-3.03c0.53-0.78,1.22-1.35,2.08-1.71c0.86-0.36,1.92-0.54,3.16-0.54
              c1.25,0,2.3,0.18,3.16,0.54s1.56,0.93,2.08,1.71c0.53,0.78,0.91,1.79,1.13,3.03s0.34,2.74,0.34,4.5s-0.11,3.26-0.34,4.5
              s-0.61,2.25-1.13,3.03s-1.22,1.34-2.08,1.67c-0.86,0.33-1.92,0.5-3.16,0.5c-1.25,0-2.3-0.17-3.16-0.5
              c-0.86-0.33-1.56-0.89-2.08-1.67c-0.53-0.78-0.91-1.79-1.13-3.03s-0.34-2.74-0.34-4.5S54.92,556.26,55.15,555.02z M59.93,562.67
              c0.04,0.83,0.11,1.5,0.22,1.99c0.11,0.49,0.28,0.84,0.5,1.03c0.22,0.19,0.51,0.29,0.88,0.29s0.66-0.1,0.88-0.29
              c0.22-0.19,0.39-0.54,0.5-1.03c0.11-0.49,0.19-1.16,0.22-1.99c0.04-0.83,0.05-1.89,0.05-3.15s-0.02-2.32-0.05-3.15
              c-0.04-0.83-0.11-1.5-0.22-1.99c-0.11-0.49-0.28-0.83-0.5-1.03c-0.22-0.19-0.51-0.29-0.88-0.29s-0.66,0.1-0.88,0.29
              s-0.39,0.54-0.5,1.03s-0.19,1.16-0.22,1.99s-0.05,1.89-0.05,3.15S59.89,561.83,59.93,562.67z"/>
            <path class="st1" d="M77.22,553.64c-0.21-0.39-0.55-0.58-1.03-0.58c-0.37,0-0.66,0.1-0.88,0.29s-0.39,0.54-0.5,1.03
              s-0.19,1.16-0.22,1.99s-0.05,1.89-0.05,3.15s0.02,2.32,0.05,3.15s0.11,1.5,0.22,1.99c0.11,0.49,0.28,0.84,0.5,1.03
              c0.22,0.19,0.51,0.29,0.88,0.29c0.3,0,0.54-0.07,0.74-0.22c0.19-0.15,0.34-0.4,0.45-0.75c0.11-0.35,0.18-0.82,0.22-1.41
              c0.04-0.59,0.07-1.33,0.07-2.23h4.75v1.4c0,1.32-0.18,2.4-0.53,3.24c-0.35,0.84-0.82,1.51-1.4,1.99
              c-0.58,0.48-1.24,0.81-1.99,0.98c-0.75,0.17-1.52,0.25-2.31,0.25c-1.37,0-2.5-0.17-3.38-0.5c-0.88-0.33-1.56-0.89-2.06-1.67
              s-0.83-1.79-1.02-3.03s-0.28-2.74-0.28-4.5c0-1.79,0.11-3.31,0.33-4.56c0.22-1.25,0.59-2.26,1.12-3.03
              c0.53-0.77,1.22-1.33,2.08-1.67c0.86-0.34,1.92-0.51,3.19-0.51c1.11,0,2.05,0.14,2.82,0.42s1.4,0.68,1.89,1.2
              c0.48,0.52,0.83,1.14,1.05,1.87c0.22,0.73,0.33,1.55,0.33,2.47v1.19h-4.75v-1.05C77.54,554.75,77.44,554.02,77.22,553.64z"/>
            <path class="st1" d="M93.44,550.1l4.59,18.83h-5.22l-0.5-3.3h-3.9l-0.5,3.3h-5.14l4.51-18.83H93.44z M90.33,553.95l-1.35,7.99
              h2.74l-1.34-7.99H90.33z"/>
            <path class="st1" d="M97.69,554.27v-4.17h12.24v4.17h-3.69v14.66h-4.9v-14.66H97.69z"/>
            <path class="st1" d="M115.75,550.1v18.83h-4.9V550.1H115.75z"/>
            <path class="st1" d="M117.67,555.02c0.23-1.24,0.61-2.25,1.13-3.03c0.53-0.78,1.22-1.35,2.08-1.71c0.86-0.36,1.92-0.54,3.16-0.54
              c1.25,0,2.3,0.18,3.16,0.54s1.56,0.93,2.08,1.71c0.53,0.78,0.91,1.79,1.13,3.03s0.34,2.74,0.34,4.5s-0.11,3.26-0.34,4.5
              s-0.61,2.25-1.13,3.03s-1.22,1.34-2.08,1.67c-0.86,0.33-1.92,0.5-3.16,0.5c-1.25,0-2.3-0.17-3.16-0.5
              c-0.86-0.33-1.56-0.89-2.08-1.67c-0.53-0.78-0.91-1.79-1.13-3.03s-0.34-2.74-0.34-4.5S117.45,556.26,117.67,555.02z
               M122.45,562.67c0.04,0.83,0.11,1.5,0.22,1.99c0.11,0.49,0.28,0.84,0.5,1.03c0.22,0.19,0.51,0.29,0.88,0.29s0.66-0.1,0.88-0.29
              c0.22-0.19,0.39-0.54,0.5-1.03c0.11-0.49,0.19-1.16,0.22-1.99c0.04-0.83,0.05-1.89,0.05-3.15s-0.02-2.32-0.05-3.15
              c-0.04-0.83-0.11-1.5-0.22-1.99c-0.11-0.49-0.28-0.83-0.5-1.03c-0.22-0.19-0.51-0.29-0.88-0.29s-0.66,0.1-0.88,0.29
              s-0.39,0.54-0.5,1.03s-0.19,1.16-0.22,1.99s-0.05,1.89-0.05,3.15S122.41,561.83,122.45,562.67z"/>
            <path class="st1" d="M138.03,550.1l3.16,11.6h0.05v-11.6h4.59v18.83h-5.38l-3.27-11.63h-0.05v11.63h-4.59V550.1H138.03z"/>
            <path class="st1" d="M162.58,550.1c1.76,0,3.05,0.43,3.89,1.28c0.83,0.85,1.25,1.99,1.25,3.42c0,0.49-0.06,0.97-0.17,1.44
              c-0.11,0.47-0.29,0.89-0.53,1.27s-0.54,0.7-0.91,0.96s-0.82,0.45-1.35,0.55v0.05c0.62,0.05,1.14,0.21,1.58,0.49
              c0.44,0.27,0.8,0.61,1.08,1.02s0.49,0.85,0.62,1.33c0.13,0.48,0.2,0.97,0.2,1.46c0,0.81-0.11,1.56-0.32,2.24s-0.54,1.28-0.99,1.77
              s-1.03,0.87-1.75,1.15c-0.72,0.27-1.59,0.41-2.61,0.41h-7.41V550.1H162.58z M161.26,557.49c0.51,0,0.9-0.19,1.16-0.57
              s0.4-0.82,0.4-1.33c0-0.53-0.13-0.98-0.4-1.37s-0.65-0.58-1.16-0.58h-1.19v3.85H161.26z M161.45,565.4c0.46,0,0.86-0.19,1.21-0.57
              c0.35-0.38,0.53-0.96,0.53-1.75c0-0.74-0.18-1.3-0.53-1.69c-0.35-0.39-0.76-0.58-1.21-0.58h-1.37v4.59H161.45z"/>
            <path class="st1" d="M181.31,550.1v4.01h-6.25v3.22h5.85v3.85h-5.85v3.74h6.49v4.01h-11.39V550.1H181.31z"/>
            <path class="st1" d="M188.82,550.1l3.16,11.6h0.05v-11.6h4.59v18.83h-5.38l-3.27-11.63h-0.05v11.63h-4.59V550.1H188.82z"/>
            <path class="st1" d="M210.1,550.1v4.01h-6.25v3.22h5.85v3.85h-5.85v3.74h6.49v4.01h-11.39V550.1H210.1z"/>
            <path class="st1" d="M223.29,550.1v4.01h-6.25v3.22h5.85v3.85h-5.85v7.75h-4.9V550.1H223.29z"/>
            <path class="st1" d="M229.54,550.1v18.83h-4.9V550.1H229.54z"/>
            <path class="st1" d="M230.51,554.27v-4.17h12.24v4.17h-3.69v14.66h-4.9v-14.66H230.51z"/>
            <path class="st1" d="M251.19,555.09c0-0.56-0.11-1.04-0.34-1.44c-0.23-0.4-0.58-0.59-1.05-0.59c-0.53,0-0.91,0.17-1.16,0.51
              c-0.25,0.34-0.37,0.72-0.37,1.15c0,0.62,0.2,1.1,0.59,1.46s0.89,0.67,1.49,0.94c0.6,0.26,1.24,0.53,1.92,0.8s1.33,0.63,1.93,1.07
              c0.6,0.44,1.09,1.01,1.49,1.73s0.59,1.64,0.59,2.78c0,2-0.57,3.46-1.71,4.36c-1.14,0.91-2.8,1.36-4.96,1.36
              c-1.02,0-1.92-0.08-2.7-0.25c-0.78-0.17-1.44-0.46-1.98-0.87s-0.94-0.95-1.23-1.62c-0.28-0.67-0.42-1.49-0.42-2.48v-0.66h4.75
              v0.45c0,0.81,0.15,1.38,0.45,1.7s0.69,0.49,1.16,0.49c0.51,0,0.9-0.17,1.17-0.53c0.27-0.35,0.41-0.78,0.41-1.29
              c0-0.62-0.19-1.1-0.57-1.46c-0.38-0.36-0.85-0.67-1.42-0.92c-0.57-0.25-1.19-0.51-1.86-0.78c-0.67-0.26-1.29-0.61-1.86-1.03
              c-0.57-0.42-1.05-0.98-1.42-1.66c-0.38-0.69-0.57-1.58-0.57-2.69c0-1.92,0.51-3.38,1.53-4.38c1.02-1,2.57-1.5,4.64-1.5
              c2.14,0,3.7,0.46,4.65,1.38c0.96,0.92,1.44,2.4,1.44,4.42h-4.59V555.09z"/>
          </g>
        </g>
        </svg>
      `;
      const bubblesDataUrl = await renderSvg(bubblesSvg);
      if (bubblesDataUrl) {
        doc.addImage(bubblesDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      // DATA PLACEMENT
      const detX = phX + phW + 6;
      const detY = (342.15) * k + 8; // Align with bubble center
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const dy = 5;
      doc.text(`Unit: ${loc.name}`, detX, detY);
      doc.text(`Type: ${loc.type}`, detX, detY + dy);
      doc.text(`Size: ${loc.size}`, detX, detY + dy * 2);
      doc.text(`Traffic: ${loc.trafficCount}`, detX, detY + dy * 3);
      doc.text(`Impressions: ${loc.weeklyImpressions}`, detX, detY + dy * 4);
      const addrLines = doc.splitTextToSize(`Address: ${loc.location}`, 60);
      doc.text(addrLines, detX, detY + dy * 5);

      // AI Location Benefits copy
      const benY = (582.15) * k + 10;
      doc.setFontSize(11);
      const benLines = doc.splitTextToSize(locationBenefits || 'This strategic location captures high-intent traffic near key commercial zones, ensuring your message reaches primary target demographics.', pageWidth - 30);
      doc.text(benLines, 15, benY, { lineHeightFactor: 1.3 });

      // 8. FOOTER SVG LAYER
      const footerSvg = `
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
           width="612px" height="792px" viewBox="0 0 612 792" style="enable-background:new 0 0 612 792;" xml:space="preserve">
        <style type="text/css">
          .st0{fill:${accentColor};}
        </style>
        <g>
          <path class="st0" d="M172.57,751.88c-0.13,0.05-0.4,0.36-0.81,0.93c-0.26,0.26-0.63,0.84-1.12,1.74c-0.23,0.46-0.27,0.67-0.12,0.62
            c0.67-0.34,1.3-1.12,1.9-2.36C172.73,752.14,172.78,751.83,172.57,751.88z"/>
          <path class="st0" d="M170.77,750.5c0.06-0.09,0.17-0.2,0.33-0.33c0.15-0.13,0.26-0.22,0.31-0.27c0.05-0.05,0.18-0.16,0.39-0.33
            c0.21-0.17,0.35-0.28,0.43-0.33c0.21-0.18,0.3-0.31,0.29-0.39c-0.01-0.08-0.11-0.21-0.29-0.39c-0.49-0.62-1.05-0.93-1.67-0.93
            c-0.62,0-1.21,0.26-1.78,0.77c-0.8,0.77-1.52,1.9-2.15,3.37c-0.63,1.47-0.95,2.79-0.95,3.95c0,0.46,0.08,0.74,0.25,0.81
            c0.17,0.08,0.45-0.04,0.83-0.35c0.41-0.33,0.81-0.77,1.2-1.32s0.8-1.18,1.24-1.92c0.44-0.74,0.76-1.27,0.97-1.61
            c0.1-0.16,0.21-0.3,0.33-0.43C170.62,750.7,170.71,750.59,170.77,750.5z"/>
          <path class="st0" d="M68.34,751.45c0.72-0.15,1.43-0.45,2.13-0.89c0.7-0.44,1.24-0.93,1.63-1.47s0.48-0.94,0.29-1.2
            c-0.19-0.26-0.61-0.27-1.26-0.04c-1.45,0.44-2.84,1.43-4.18,2.98c-0.1,0-0.19,0.03-0.25,0.1s-0.1,0.14-0.1,0.21
            c-0.39,0.44-0.27,0.65,0.35,0.62C67.51,751.74,67.98,751.63,68.34,751.45z"/>
          <path class="st0" d="M196.5,750.83c-0.1,0-0.19,0.03-0.25,0.1s-0.1,0.14-0.1,0.21c-0.39,0.44-0.27,0.65,0.35,0.62
            c0.57-0.03,1.03-0.13,1.39-0.31c0.72-0.15,1.43-0.45,2.13-0.89c0.7-0.44,1.24-0.93,1.63-1.47s0.48-0.94,0.29-1.2
            c-0.19-0.26-0.61-0.27-1.26-0.04C199.24,748.29,197.84,749.28,196.5,750.83z"/>
          <path class="st0" d="M317.02,694.67C51.61,726.59-0.67,684.71-0.67,684.71v107.25h611.34v-0.01V689.88
            C586.14,682.39,513.43,671.05,317.02,694.67z M59.63,757.86c-0.26,0.27-0.65,0.41-1.16,0.41c-0.21-0.03-0.52-0.05-0.95-0.08
            c-0.43-0.03-0.75-0.05-0.99-0.08c-2.63-0.05-5.32,0.15-8.05,0.62c-2.74,0.46-5.01,1.25-6.81,2.36c-0.08,0.05-0.25,0.17-0.5,0.35
            c-0.26,0.18-0.46,0.32-0.62,0.41c-0.16,0.09-0.35,0.18-0.58,0.27c-0.23,0.09-0.45,0.11-0.66,0.06c-0.21-0.05-0.37-0.18-0.5-0.39
            c-0.21-0.28-0.27-0.57-0.19-0.87c0.08-0.3,0.26-0.55,0.54-0.75l0.12-0.08c0.08-0.05,0.43-0.25,1.05-0.58
            c0.62-0.33,1.08-0.64,1.37-0.91c0.3-0.27,0.51-0.6,0.64-0.99c0.1-0.21,0.21-0.55,0.33-1.03s0.19-0.75,0.21-0.83
            c0.36-1.16,0.89-2.84,1.59-5.03c0.7-2.19,1.12-3.55,1.28-4.07c1.83-5.81,2.83-8.97,2.98-9.49c0.03-0.05,0.07-0.19,0.14-0.41
            c0.06-0.22,0.11-0.37,0.14-0.46c0.03-0.09,0.08-0.23,0.17-0.41c0.09-0.18,0.18-0.31,0.27-0.39c0.09-0.08,0.2-0.15,0.33-0.21
            c0.13-0.06,0.28-0.08,0.46-0.06c0.39,0.03,0.66,0.19,0.81,0.48c0.16,0.3,0.19,0.63,0.12,0.99c-0.05,0.18-0.12,0.39-0.19,0.64
            c-0.08,0.25-0.17,0.52-0.27,0.81c-0.1,0.3-0.17,0.51-0.19,0.64c-0.18,0.57-0.89,2.81-2.13,6.74c-1.24,3.92-2.18,6.92-2.83,8.98
            c-0.03,0.05-0.08,0.2-0.17,0.45c-0.09,0.25-0.17,0.46-0.23,0.66c-0.06,0.19-0.14,0.43-0.23,0.7c-0.09,0.27-0.14,0.48-0.16,0.62
            c-0.01,0.14-0.01,0.26,0.02,0.37c0.08,0.13,0.62,0.03,1.63-0.31c2.56-0.77,5.69-1.12,9.41-1.05c2.04,0.03,3.23,0.13,3.56,0.31
            c0.31,0.15,0.5,0.39,0.56,0.72C59.98,757.29,59.89,757.59,59.63,757.86z M137.22,748.93c-0.05,0.1-0.13,0.23-0.23,0.37
            c-0.1,0.14-0.19,0.26-0.25,0.35c-0.06,0.09-0.16,0.21-0.29,0.35c-0.13,0.14-0.21,0.24-0.23,0.29c-0.05,0.05-0.37,0.43-0.95,1.14
            c-0.58,0.71-0.96,1.16-1.12,1.36c-0.17,0.19-0.54,0.61-1.1,1.24c-0.57,0.63-1,1.08-1.3,1.34c-0.3,0.26-0.72,0.62-1.26,1.08
            c-0.54,0.46-1.02,0.81-1.43,1.03c-0.41,0.22-0.88,0.44-1.39,0.66c-0.52,0.22-1.02,0.37-1.51,0.45c-1.34,0.15-2.25-0.14-2.71-0.87
            c-0.46-0.74-0.59-1.78-0.39-3.12c0.08-0.57,0.33-1.52,0.76-2.87c0.43-1.34,0.65-2.34,0.68-2.98c0.1-1.5-0.84-1.59-2.83-0.27
            c-0.72,0.46-1.32,0.94-1.78,1.43c-1.91,1.86-3.54,4.29-4.88,7.28c-0.41,0.93-0.96,1.37-1.63,1.32c-0.36-0.03-0.61-0.19-0.76-0.48
            c-0.14-0.3-0.16-0.63-0.06-0.99c0.15-0.52,0.4-1.3,0.74-2.34c0.34-1.05,0.52-1.62,0.54-1.72c0.1-0.29,0.2-0.61,0.31-0.94
            c-0.59,0.42-1.25,0.79-1.97,1.09c-1.11,0.46-2.13,0.56-3.06,0.27c-0.21-0.08-0.39-0.17-0.54-0.29c-0.15-0.12-0.28-0.23-0.37-0.33
            c-0.09-0.1-0.15-0.25-0.19-0.43c-0.04-0.18-0.07-0.33-0.1-0.45c-0.03-0.12-0.02-0.28,0.02-0.48c0.04-0.21,0.07-0.37,0.1-0.48
            c0.03-0.12,0.08-0.29,0.17-0.52c0.09-0.23,0.15-0.39,0.19-0.48c0.04-0.09,0.12-0.26,0.23-0.5s0.17-0.39,0.17-0.45
            c0.31-0.54,0.41-0.94,0.29-1.2s-0.54-0.27-1.26-0.04c-0.44,0.13-0.87,0.3-1.3,0.5c-0.43,0.21-0.83,0.48-1.22,0.81
            c-0.39,0.34-0.73,0.63-1.03,0.89c-0.3,0.26-0.62,0.63-0.97,1.12c-0.35,0.49-0.62,0.87-0.81,1.12c-0.19,0.26-0.46,0.68-0.79,1.28
            c-0.34,0.59-0.56,1-0.68,1.22c-0.12,0.22-0.35,0.66-0.7,1.32c-0.35,0.66-0.55,1.06-0.6,1.22c-0.03,0.03-0.07,0.1-0.14,0.21
            c-0.06,0.12-0.11,0.2-0.14,0.25c-0.03,0.05-0.07,0.13-0.14,0.23c-0.06,0.1-0.12,0.18-0.15,0.23c-0.04,0.05-0.09,0.12-0.16,0.19
            c-0.06,0.08-0.14,0.13-0.21,0.15c-0.08,0.03-0.15,0.06-0.23,0.1c-0.08,0.04-0.16,0.05-0.25,0.04c-0.09-0.01-0.2-0.03-0.33-0.06
            c-0.65-0.21-0.87-0.7-0.66-1.47c0.15-0.57,0.41-1.38,0.75-2.44c0.24-0.73,0.4-1.24,0.5-1.58c-0.24,0.27-0.45,0.5-0.58,0.63
            c-0.19,0.19-0.49,0.5-0.89,0.91c-0.4,0.41-0.72,0.73-0.97,0.95c-0.25,0.22-0.56,0.49-0.95,0.81c-0.39,0.32-0.74,0.58-1.05,0.77
            c-0.31,0.19-0.65,0.39-1.03,0.58c-0.37,0.19-0.74,0.34-1.1,0.45c-1.6,0.59-2.79,0.59-3.56,0c-0.46-0.33-0.77-1.01-0.93-2.01
            c0-0.31-0.05-0.52-0.15-0.62c-0.1,0-0.53,0.36-1.28,1.08c-0.8,0.57-1.71,1.01-2.73,1.34c-1.02,0.32-1.98,0.45-2.88,0.37
            c-0.62-0.03-1.1-0.22-1.43-0.58c-0.34-0.36-0.52-0.81-0.54-1.34c-0.03-0.53,0.01-1.05,0.12-1.57c0.07-0.33,0.16-0.66,0.27-0.98
            c-1.16,0.68-2.41,1.33-3.76,1.97c-4.1,1.92-7.63,2.85-10.57,2.77c-0.96,0-1.65-0.25-2.09-0.75c-0.44-0.5-0.63-1.13-0.58-1.88
            c0.05-0.75,0.19-1.48,0.41-2.21c0.22-0.72,0.51-1.39,0.87-2.01c0.9-1.57,2.07-2.94,3.5-4.08c1.43-1.15,2.96-1.86,4.59-2.15
            c1.11-0.16,1.95,0.05,2.52,0.62c0.57,0.57,0.77,1.39,0.62,2.48c-0.1,0.77-0.45,1.48-1.05,2.13s-1.31,1.16-2.15,1.55
            c-0.84,0.39-1.68,0.69-2.52,0.91c-0.84,0.22-1.65,0.36-2.42,0.41c-0.67,0.08-1.13,0.22-1.37,0.43c-0.25,0.21-0.41,0.63-0.48,1.28
            c-0.15,0.93,0.54,1.32,2.09,1.16c2.35-0.26,5.45-1.39,9.29-3.41c2.73-1.43,4.82-2.83,6.3-4.2c0.17-0.18,0.35-0.35,0.53-0.52
            c0.11-0.12,0.23-0.24,0.34-0.35c0.19-0.19,0.37-0.34,0.55-0.46c0.08-0.06,0.14-0.14,0.22-0.2c1.06-0.85,2.17-1.45,3.35-1.8
            c1.17-0.35,2.36-0.34,3.54,0.02c0.52,0.18,0.95,0.46,1.3,0.85c0.35,0.39,0.48,0.83,0.41,1.32c-0.1,0.52-0.46,0.68-1.08,0.5
            c-0.23-0.08-0.5-0.19-0.79-0.33c-0.3-0.14-0.56-0.24-0.79-0.29c-0.23-0.05-0.53-0.06-0.89-0.04c-1.25,0-2.47,0.48-3.66,1.43
            c-0.07,0.14-0.14,0.28-0.25,0.43c-0.57,0.56-1.19,1.11-1.85,1.65c-0.39,0.47-0.76,0.97-1.09,1.49c-0.23,0.41-0.43,0.81-0.6,1.18
            c-0.17,0.38-0.32,0.81-0.46,1.3c-0.14,0.49-0.09,0.85,0.15,1.06c0.25,0.22,0.7,0.24,1.37,0.06c1.47-0.49,2.71-1.33,3.72-2.52
            c0.33-0.36,0.64-0.73,0.91-1.1c0.27-0.37,0.46-0.67,0.58-0.89c0.12-0.22,0.31-0.58,0.58-1.08c0.27-0.5,0.47-0.87,0.6-1.1
            c0.8-1.08,1.47-1.29,2.01-0.62c0.31,0.34,0.19,1.55-0.35,3.64c-0.57,2.14-0.75,3.43-0.54,3.87c0.28,0.54,1.1,0.37,2.44-0.5
            c0.62-0.44,1.28-0.99,1.99-1.67c0.71-0.67,1.29-1.26,1.74-1.78c0.45-0.52,1.06-1.23,1.84-2.15s1.32-1.54,1.63-1.88
            c0.03-0.03,0.13-0.11,0.31-0.25c0.18-0.14,0.3-0.23,0.37-0.27c0,0,0.01-0.01,0.02-0.01c0.16-0.49,0.29-0.89,0.39-1.17
            c0.1-0.31,0.21-0.55,0.31-0.74c0.1-0.18,0.26-0.33,0.48-0.46c0.22-0.13,0.48-0.14,0.79-0.04c0.26,0.1,0.45,0.21,0.58,0.31
            c0.13,0.1,0.19,0.24,0.19,0.41c0,0.17-0.01,0.3-0.02,0.39c-0.01,0.09-0.07,0.26-0.17,0.52c-0.1,0.26-0.17,0.41-0.19,0.46
            c-0.46,1.34-0.66,2.04-0.58,2.09c0.05,0.03,0.12,0.01,0.19-0.04c0.08-0.05,0.17-0.14,0.29-0.25s0.22-0.23,0.31-0.33
            c0.09-0.1,0.19-0.21,0.29-0.33c0.1-0.12,0.17-0.17,0.19-0.17c0.72-0.77,1.51-1.42,2.36-1.94c0.52-0.33,1.04-0.61,1.57-0.81
            c0.53-0.21,1.12-0.35,1.78-0.43c0.66-0.08,1.22,0.03,1.68,0.31c0.52,0.28,0.81,0.68,0.89,1.2c0.08,0.52,0.01,1.02-0.19,1.51
            c-0.21,0.49-0.43,1.03-0.68,1.63c-0.25,0.59-0.38,1.03-0.41,1.32c0,0.83,1.08,0.23,3.25-1.78c0.13-0.1,0.22-0.19,0.27-0.27
            c0.49-0.44,0.86-0.8,1.12-1.08c0.22-0.25,0.42-0.44,0.6-0.6c0.1-0.33,0.19-0.62,0.25-0.84c0.41-1.26,1.02-1.69,1.82-1.28
            c0.21,0.1,0.35,0.23,0.44,0.37c0.09,0.14,0.13,0.31,0.12,0.5c-0.01,0.19-0.04,0.35-0.08,0.48c-0.04,0.13-0.11,0.32-0.21,0.56
            c-0.1,0.25-0.18,0.42-0.23,0.52c-0.41,1.24-0.48,1.81-0.19,1.7c0.18-0.1,0.5-0.41,0.97-0.93c0.46-0.52,0.76-0.83,0.89-0.93
            c0.88-0.8,1.9-1.46,3.06-1.97s2.19-0.61,3.1-0.27c0.59,0.23,0.95,0.74,1.08,1.51c0.13,0.77,0.11,1.54-0.06,2.3
            s-0.41,1.66-0.72,2.69c-0.31,1.03-0.49,1.68-0.54,1.94c-0.26,1.29-0.2,2.1,0.17,2.44c0.37,0.33,1.15,0.14,2.34-0.58l0.15-0.12
            c0.75-0.49,1.5-1.12,2.27-1.9c0.76-0.77,1.68-1.81,2.77-3.1c1.08-1.29,1.74-2.05,1.97-2.28c0.9-1.01,1.64-1.2,2.21-0.58
            c0.08,0.13,0.14,0.25,0.17,0.37c0.04,0.12,0.04,0.25,0.02,0.39C137.31,748.71,137.27,748.83,137.22,748.93z M162.35,747.5
            c-0.08,0.18-0.42,1.01-1.03,2.48c-0.61,1.47-1.02,2.48-1.24,3.04c-0.22,0.56-0.52,1.38-0.91,2.46s-0.7,2.04-0.93,2.87
            c-0.21,0.72-0.37,1.6-0.5,2.63c-0.05,0.41-0.19,0.74-0.43,0.97c-0.23,0.23-0.54,0.28-0.93,0.16c-0.77-0.21-0.96-1.21-0.54-3.02
            c0.03-0.05,0.04-0.09,0.04-0.12c0.44-2.01,1.57-5.21,3.41-9.6c0.1-0.26,0.31-0.77,0.62-1.53c0.31-0.76,0.54-1.32,0.7-1.68
            c0.15-0.36,0.37-0.89,0.64-1.59c0.27-0.7,0.48-1.28,0.64-1.74c0.15-0.46,0.33-0.99,0.52-1.57c0.19-0.58,0.35-1.13,0.48-1.65
            c0.39-1.63,0.32-2.38-0.19-2.25c-0.18,0.05-0.44,0.23-0.77,0.54c-0.23,0.23-0.5,0.55-0.81,0.95c-0.31,0.4-0.6,0.79-0.87,1.16
            s-0.6,0.87-0.99,1.47s-0.7,1.1-0.95,1.47c-0.25,0.38-0.57,0.92-0.99,1.63c-0.41,0.71-0.69,1.2-0.83,1.47
            c-0.14,0.27-0.41,0.75-0.81,1.43c-0.4,0.68-0.61,1.05-0.64,1.1c-0.05,0.1-0.2,0.38-0.45,0.83c-0.25,0.45-0.45,0.81-0.6,1.06
            c-0.15,0.26-0.38,0.63-0.68,1.12c-0.3,0.49-0.56,0.9-0.79,1.22c-0.23,0.32-0.5,0.7-0.81,1.12c-0.31,0.43-0.61,0.77-0.89,1.04
            c-0.28,0.27-0.58,0.54-0.89,0.79c-0.31,0.26-0.62,0.43-0.93,0.52c-0.31,0.09-0.61,0.12-0.89,0.1c-1.63-0.23-2.25-2.37-1.86-6.43
            c0.03-0.18,0.04-0.32,0.04-0.41c0-0.09,0.01-0.19,0.02-0.31c0.01-0.12,0.01-0.2,0-0.25c-0.01-0.05-0.03-0.08-0.06-0.08
            c-0.08,0.05-0.65,1.19-1.7,3.41c-0.41,0.83-1.08,2.2-2.01,4.12c-0.93,1.92-1.64,3.4-2.13,4.43c-0.15,0.31-0.28,0.54-0.39,0.7
            c-0.1,0.16-0.27,0.29-0.5,0.41s-0.49,0.13-0.77,0.06c-0.18-0.08-0.33-0.17-0.45-0.29s-0.19-0.26-0.21-0.43
            c-0.03-0.17-0.03-0.32-0.02-0.45c0.01-0.13,0.06-0.3,0.14-0.5c0.08-0.21,0.14-0.37,0.19-0.48c0.05-0.12,0.14-0.28,0.25-0.48
            c0.12-0.21,0.2-0.33,0.25-0.39c0.21-0.44,1.19-2.45,2.94-6.04c3.72-7.67,5.87-12.12,6.47-13.36c0-0.03,0.07-0.19,0.21-0.5
            c0.14-0.31,0.25-0.54,0.33-0.68c0.08-0.14,0.19-0.31,0.33-0.5c0.14-0.19,0.28-0.33,0.41-0.41c0.39-0.21,0.75-0.18,1.1,0.08
            c0.35,0.26,0.48,0.63,0.41,1.12c-0.03,0.16-0.08,0.37-0.15,0.64c-0.08,0.27-0.17,0.57-0.29,0.89c-0.12,0.32-0.19,0.55-0.21,0.68
            c-0.85,2.87-1.51,5.47-1.97,7.82c-0.72,3.85-0.68,5.67,0.12,5.46c0.36-0.08,0.85-0.55,1.47-1.43c0.41-0.57,0.85-1.23,1.3-1.97
            c0.45-0.75,0.83-1.41,1.14-1.97s0.7-1.3,1.18-2.19c0.48-0.89,0.85-1.56,1.1-1.99c3.25-5.86,5.85-9.02,7.78-9.49
            c0.85-0.18,1.54-0.06,2.05,0.37c0.52,0.43,0.79,1.09,0.81,1.99c0.03,1.68-0.92,4.81-2.83,9.41
            C162.48,747.19,162.4,747.37,162.35,747.5z M214.43,749.44c-2.38,2.35-5.61,4.49-9.72,6.41c-4.1,1.92-7.63,2.85-10.57,2.77
            c-0.96,0-1.65-0.25-2.09-0.75c-0.44-0.5-0.63-1.13-0.58-1.88c0.05-0.75,0.19-1.48,0.41-2.21c0.04-0.15,0.11-0.28,0.16-0.43
            c-0.85,0.25-1.65,0.27-2.38,0.04c-0.21-0.08-0.39-0.17-0.54-0.29c-0.15-0.12-0.28-0.23-0.37-0.33c-0.09-0.1-0.15-0.25-0.19-0.43
            c-0.04-0.18-0.07-0.33-0.1-0.45c-0.03-0.12-0.02-0.28,0.02-0.48c0.04-0.21,0.07-0.37,0.1-0.48c0.03-0.12,0.08-0.29,0.17-0.52
            c0.09-0.23,0.15-0.39,0.19-0.48c0.04-0.09,0.12-0.26,0.23-0.5s0.17-0.39,0.17-0.45c0.31-0.54,0.41-0.94,0.29-1.2
            s-0.54-0.27-1.26-0.04c-0.44,0.13-0.87,0.3-1.3,0.5c-0.43,0.21-0.83,0.48-1.22,0.81c-0.39,0.34-0.73,0.63-1.03,0.89
            c-0.3,0.26-0.62,0.63-0.97,1.12c-0.35,0.49-0.62,0.87-0.81,1.12c-0.19,0.26-0.46,0.68-0.79,1.28c-0.34,0.59-0.56,1-0.68,1.22
            c-0.12,0.22-0.35,0.66-0.7,1.32c-0.35,0.66-0.55,1.06-0.6,1.22c-0.03,0.03-0.07,0.1-0.14,0.21c-0.06,0.12-0.11,0.2-0.14,0.25
            c-0.03,0.05-0.07,0.13-0.14,0.23c-0.06,0.1-0.12,0.18-0.15,0.23c-0.04,0.05-0.09,0.12-0.16,0.19c-0.06,0.08-0.14,0.13-0.21,0.15
            c-0.08,0.03-0.15,0.06-0.23,0.1c-0.08,0.04-0.16,0.05-0.25,0.04c-0.09-0.01-0.2-0.03-0.33-0.06c-0.65-0.21-0.87-0.7-0.66-1.47
            c0.15-0.57,0.41-1.38,0.75-2.44c0.35-1.06,0.55-1.7,0.6-1.94c0.29-0.93,0.55-1.74,0.78-2.47c-1.06,0.36-2.46,0.54-4.19,0.54
            c-0.39,0-0.65,0.08-0.77,0.23c-0.13,0.16-0.19,0.44-0.19,0.85c-0.31,1.45-0.83,2.59-1.55,3.45c-0.62,0.93-1.45,1.65-2.48,2.17
            l-0.31,0.16c-0.67,0.34-1.46,0.59-2.36,0.77c-0.9,0.18-1.73,0.23-2.48,0.16c-0.62-0.03-1.11-0.24-1.47-0.64
            c-0.36-0.4-0.57-0.91-0.64-1.53c-0.06-0.62-0.08-1.21-0.04-1.78c0.04-0.57,0.12-1.12,0.25-1.66c0.21-0.7,0.48-1.42,0.83-2.17
            c0.35-0.75,0.78-1.52,1.3-2.3c0.52-0.79,1.08-1.44,1.7-1.96c0.62-0.52,1.31-0.88,2.07-1.1c0.76-0.22,1.55-0.15,2.38,0.21
            c0.72,0.31,1.27,0.7,1.65,1.18c0.37,0.48,0.63,0.88,0.75,1.22c0.13,0.34,0.26,0.53,0.39,0.58c0.9,0.26,1.75,0.28,2.54,0.08
            c0.79-0.21,1.57-0.46,2.34-0.77c0.55-0.22,0.93-0.35,1.15-0.4c0.11-0.34,0.21-0.62,0.28-0.84c0.1-0.31,0.21-0.55,0.31-0.74
            c0.1-0.18,0.26-0.33,0.48-0.46c0.22-0.13,0.48-0.14,0.79-0.04c0.26,0.1,0.45,0.21,0.58,0.31c0.13,0.1,0.19,0.24,0.19,0.41
            c0,0.17-0.01,0.3-0.02,0.39c-0.01,0.09-0.07,0.26-0.17,0.52c-0.1,0.26-0.17,0.41-0.19,0.46c-0.46,1.34-0.66,2.04-0.58,2.09
            c0.05,0.03,0.12,0.01,0.19-0.04c0.08-0.05,0.17-0.14,0.29-0.25s0.22-0.23,0.31-0.33c0.09-0.1,0.19-0.21,0.29-0.33
            c0.1-0.12,0.17-0.17,0.19-0.17c0.72-0.77,1.51-1.42,2.36-1.94c0.52-0.33,1.04-0.61,1.57-0.81c0.53-0.21,1.12-0.35,1.78-0.43
            c0.66-0.08,1.22,0.03,1.68,0.31c0.52,0.28,0.81,0.68,0.89,1.2c0.08,0.52,0.01,1.02-0.19,1.51c-0.21,0.49-0.43,1.03-0.68,1.63
            c-0.25,0.59-0.38,1.03-0.41,1.32c0,0.83,1.08,0.23,3.25-1.78c0.13-0.1,0.22-0.19,0.27-0.27c0.49-0.44,0.86-0.8,1.12-1.08
            c0.52-0.59,0.94-0.92,1.28-0.97c0.05,0,0.09,0.01,0.14,0.01c1.24-0.86,2.55-1.43,3.92-1.67c1.11-0.16,1.95,0.05,2.52,0.62
            c0.57,0.57,0.77,1.39,0.62,2.48c-0.1,0.77-0.45,1.48-1.05,2.13s-1.31,1.16-2.15,1.55c-0.84,0.39-1.68,0.69-2.52,0.91
            c-0.84,0.22-1.65,0.36-2.42,0.41c-0.67,0.08-1.13,0.22-1.37,0.43c-0.25,0.21-0.41,0.63-0.48,1.28c-0.15,0.93,0.54,1.32,2.09,1.16
            c2.35-0.26,5.45-1.39,9.29-3.41c3.3-1.73,5.69-3.42,7.16-5.07c0.77-0.77,1.46-0.93,2.05-0.46
            C215.05,748,214.99,748.64,214.43,749.44z"/>
        </g>
        </svg>
      `;
      const footerDataUrl = await renderSvg(footerSvg);
      if (footerDataUrl) {
        doc.addImage(footerDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      // 9. AE INFO OVERLAY (White text in footer)
      const infoX = pageWidth - 65;
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(profile.aeName || 'Your Name', infoX, pageHeight - 20, { align: 'right' });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${profile.aePhone} | ${profile.aeEmail}`, infoX, pageHeight - 15, { align: 'right' });
      doc.text(`${profile.website} | ${profile.companyPhone}`, infoX, pageHeight - 11, { align: 'right' });

      // Circular AE Photo
      if (profile.aePhoto) {
        const photoSize = 22;
        const photoX = pageWidth - 35;
        const photoY = pageHeight - 35;
        // Circular clipping via jsPDF
        doc.setFillColor(255, 255, 255);
        doc.circle(photoX + (photoSize/2), photoY + (photoSize/2), photoSize/2, 'F');
        // Actually jsPDF doesn't natively clip images to complex shapes easily without plugin, 
        // but we can place the image. To look circular we'd need a canvas pre-crop.
        const circularPhoto = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.beginPath();
              ctx.arc(256, 256, 256, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(img, 0, 0, 512, 512);
              resolve(canvas.toDataURL('image/png'));
            } else resolve('');
          };
          img.onerror = () => resolve('');
          img.src = profile.aePhoto!;
        });
        if (circularPhoto) {
          doc.addImage(circularPhoto, 'PNG', photoX, photoY, photoSize, photoSize, undefined, 'FAST');
        } else {
          doc.addImage(profile.aePhoto, 'JPEG', photoX, photoY, photoSize, photoSize, undefined, 'FAST');
        }
      }

      doc.save(`Proposal_${advertiser.businessName || 'Billboard'}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Proposal Generator</h1>
          <p className="text-slate-500 text-lg">Create professional PDF proposals for your advertisers.</p>
        </div>
        <button 
          onClick={() => setShowProfileForm(!showProfileForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <User className="w-4 h-4" />
          {showProfileForm ? 'Hide Profile' : 'Edit Company Profile'}
        </button>
      </div>

      <AnimatePresence>
        {showProfileForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-400" />
                Company Profile
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo & AE Photo */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                    <div className="relative group">
                      <div className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${profile.logo ? 'border-slate-200' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {profile.logo ? (
                          <img src={profile.logo} alt="Logo" className="max-h-24 object-contain" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-2" />
                            <span className="text-xs text-slate-500">Upload Logo</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Colors will be extracted from your logo.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">AE Photo</label>
                    <div className="relative group">
                      <div className={`w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-colors ${profile.aePhoto ? 'border-slate-200' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {profile.aePhoto ? (
                          <img src={profile.aePhoto} alt="AE" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAEPhotoUpload}
                        className="absolute inset-0 w-16 h-16 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Proposal Background Image</label>
                    <div className="relative group">
                      <div className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${profile.backgroundImage ? 'border-slate-200' : 'border-slate-300 group-hover:border-slate-400'}`}>
                        {profile.backgroundImage ? (
                          <img src={profile.backgroundImage} alt="Background" className="max-h-20 object-contain" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-500 text-center px-4">Upload Proposal Template Background Image.jpg</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBackgroundUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* AE Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Executive Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={profile.aeName}
                        onChange={(e) => saveProfile({ ...profile, aeName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">AE Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={profile.aePhone}
                        onChange={(e) => saveProfile({ ...profile, aePhone: e.target.value })}
                        placeholder="(555) 000-0000"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">AE Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={profile.aeEmail}
                        onChange={(e) => saveProfile({ ...profile, aeEmail: e.target.value })}
                        placeholder="john@company.com"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={profile.website}
                        onChange={(e) => saveProfile({ ...profile, website: e.target.value })}
                        placeholder="www.billboardcompany.com"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={profile.companyPhone}
                        onChange={(e) => saveProfile({ ...profile, companyPhone: e.target.value })}
                        placeholder="(555) 111-2222"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm"
                        style={{ backgroundColor: profile.brandColor }}
                      />
                      <input 
                        type="color" 
                        value={profile.brandColor}
                        onChange={(e) => saveProfile({ ...profile, brandColor: e.target.value })}
                        className="flex-1 h-10 rounded-lg border border-slate-200 p-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Advertiser & AI */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Advertiser Info
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                <input 
                  type="text" 
                  value={advertiser.businessName}
                  onChange={(e) => setAdvertiser({ ...advertiser, businessName: e.target.value })}
                  placeholder="e.g. Smith Law Firm"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
                <input 
                  type="text" 
                  value={advertiser.businessType}
                  onChange={(e) => setAdvertiser({ ...advertiser, businessType: e.target.value })}
                  placeholder="e.g. Personal Injury Attorney"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Zip Code</label>
                <input 
                  type="text" 
                  value={advertiser.zipCode}
                  onChange={(e) => setAdvertiser({ ...advertiser, zipCode: e.target.value })}
                  placeholder="60601"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Address (Optional)</label>
                <input 
                  type="text" 
                  value={advertiser.address}
                  onChange={(e) => setAdvertiser({ ...advertiser, address: e.target.value })}
                  placeholder="123 Coffee Lane, Chicago, IL"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={generateAIProposalCopy}
                  disabled={isAILoading || !advertiser.businessType || !selectedLocationId}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-200"
                >
                  {isAILoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Generate AI Copy
                </button>
              </div>

              {aiPitch && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">AI Sales Pitch (45 words max)</label>
                    <textarea 
                      value={aiPitch}
                      onChange={(e) => setAiPitch(e.target.value)}
                      className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm text-slate-600 leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">AI Location Benefits</label>
                    <textarea 
                      value={locationBenefits}
                      onChange={(e) => setLocationBenefits(e.target.value)}
                      className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm text-slate-600 leading-relaxed"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Billboard Locations */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-400" />
                Billboard Locations
              </h2>
              <button 
                onClick={addNewLocation}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Location for Proposal</label>
              <div className="relative">
                <select 
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all appearance-none pr-10"
                >
                  <option value="">-- Choose a location --</option>
                  {sortedLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name || 'Unnamed Location'}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {currentLocation ? (
                <motion.div 
                  key={currentLocation.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Location Editor */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Billboard Name / Unit #</label>
                        <input 
                          type="text" 
                          value={currentLocation.name}
                          onChange={(e) => updateCurrentLocation('name', e.target.value)}
                          placeholder="e.g. Main St & 5th - Unit 102"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select 
                          value={currentLocation.type}
                          onChange={(e) => updateCurrentLocation('type', e.target.value as any)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        >
                          <option value="Digital">Digital</option>
                          <option value="Static">Static</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Size (ft/in)</label>
                        <input 
                          type="text" 
                          value={currentLocation.size}
                          onChange={(e) => updateCurrentLocation('size', e.target.value)}
                          placeholder="14' x 48'"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Traffic Count</label>
                        <input 
                          type="text" 
                          value={currentLocation.trafficCount}
                          onChange={(e) => updateCurrentLocation('trafficCount', e.target.value)}
                          placeholder="45,000 daily"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Weekly Impressions</label>
                        <input 
                          type="text" 
                          value={currentLocation.weeklyImpressions}
                          onChange={(e) => updateCurrentLocation('weeklyImpressions', e.target.value)}
                          placeholder="250,000"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address / GPS</label>
                        <input 
                          type="text" 
                          value={currentLocation.location}
                          onChange={(e) => updateCurrentLocation('location', e.target.value)}
                          placeholder="123 Main St, Chicago, IL"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Billboard Photo</label>
                      <div className="relative group">
                        <div className={`w-[325px] h-[226px] mx-auto rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${currentLocation.photo ? 'border-slate-200' : 'border-slate-300 group-hover:border-slate-400'}`}>
                          {currentLocation.photo ? (
                            <img src={currentLocation.photo} alt="Billboard" className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm text-slate-500">Upload Billboard Photo</span>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBillboardPhotoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                      <div className="flex justify-between items-center">
                        <button 
                          onClick={() => deleteLocation(currentLocation.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Location
                        </button>
                        <button 
                          onClick={saveCurrentLocation}
                          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${isSaved ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'}`}
                        >
                          {isSaved ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Saved
                            </>
                          ) : (
                            'Save Location'
                          )}
                        </button>
                      </div>
                      
                      <button 
                        onClick={generatePDF}
                        disabled={isGenerating || !isSaved}
                        className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                        Download PDF Proposal
                      </button>
                      {!isSaved && (
                        <p className="text-center text-xs text-amber-600 font-medium">Please save your changes before downloading.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <FileText className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-slate-400 max-w-xs">Select an existing location or add a new one to start your proposal.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
