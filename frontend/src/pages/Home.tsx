import { Link } from "wouter";
import { Camera, Leaf, Wifi, WifiOff, BarChart2, History, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-16">
      {/* ── Top Header Strip ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Leaf className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  AgriGuard Field Engine
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl md:text-3xl font-black text-slate-900">
                Crop Scanner & Edge AI Hub
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500">
                Multi-Plant Edge AI Disease Detection across 17 ASEAN crops — 100% offline enabled.
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full font-bold border ${isOnline ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
              {isOnline ? "Connected • Cloud sync active" : "Offline • Edge AI active"}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* ── Hero Launcher Bento ── */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] items-stretch">
          {/* Main Action Launcher */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Field Diagnosis Layer
                </span>
                <span className="text-xs font-semibold text-slate-400">Edge TensorFlow</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">
                Instant Leaf Disease Diagnosis
              </h2>
              <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
                Scan any ASEAN plant leaf with your camera. Detect 80+ diseases across 17 crop types with offline neural classification and cloud LLM follow-ups.
              </p>

              <div className="grid grid-cols-3 gap-2.5 my-5 text-center">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-2xl font-black text-emerald-700">80+</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Diseases</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-2xl font-black text-emerald-700">17</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">ASEAN Crops</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-2xl font-black text-emerald-700">100%</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Offline Ready</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Link href="/scan" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-xs md:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all">
                  <Camera className="w-4 h-4" /> Open Crop Scanner
                </button>
              </Link>
              <Link href="/history">
                <button className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl py-3 px-4 text-xs font-bold hover:bg-slate-50 transition-colors">
                  <History className="w-4 h-4 text-slate-500" /> History
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl py-3 px-4 text-xs font-bold hover:bg-slate-50 transition-colors">
                  <BarChart2 className="w-4 h-4 text-slate-500" /> Market
                </button>
              </Link>
            </div>
          </div>

          {/* Disease Coverage Summary */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Pathogen Coverage Matrix
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Fungal Diseases</span>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">30+ species</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Viral Infections</span>
                  <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">10+ strains</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Bacterial Blights</span>
                  <span className="text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-full">5+ variants</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Soil-Borne Root Rot</span>
                  <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full">5+ profiles</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 leading-normal">
              Pre-trained on regional ASEAN agricultural imagery for maximum field accuracy.
            </p>
          </div>
        </div>

        {/* ── Supported ASEAN Crops Grid (17 crops) ── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Crop Library</p>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">17 Supported ASEAN Varieties</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              80+ Diagnosable Pathogens
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {[
              { icon: "🌾", name: "Rice", count: "8 diseases" },
              { icon: "🥔", name: "Cassava", count: "5 diseases" },
              { icon: "🌽", name: "Corn", count: "5 diseases" },
              { icon: "🥥", name: "Coconut", count: "4 diseases" },
              { icon: "🍍", name: "Pineapple", count: "4 diseases" },
              { icon: "🍅", name: "Tomato", count: "5 diseases" },
              { icon: "🥬", name: "Cabbage", count: "4 diseases" },
              { icon: "🍫", name: "Cacao", count: "4 diseases" },
              { icon: "☕", name: "Coffee", count: "4 diseases" },
              { icon: "🌳", name: "Rubber", count: "4 diseases" },
              { icon: "🌾", name: "Sugarcane", count: "5 diseases" },
              { icon: "🍌", name: "Banana", count: "5 diseases" },
              { icon: "🥭", name: "Mango", count: "5 diseases" },
              { icon: "🌶️", name: "Chili", count: "5 diseases" },
              { icon: "🫘", name: "Soybean", count: "4 diseases" },
              { icon: "🍠", name: "Sweet Potato", count: "4 diseases" },
              { icon: "🌿", name: "Taro", count: "4 diseases" },
            ].map((crop) => (
              <div key={crop.name} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center hover:border-emerald-200 transition-colors">
                <div className="text-2xl mb-1">{crop.icon}</div>
                <div className="text-xs font-bold text-slate-900">{crop.name}</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">{crop.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2-Column: Key Features & Diagnostic Workflow ── */}
        <div className="grid gap-6 md:grid-cols-2 items-start">
          {/* Key Features */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" /> Platform Capabilities
            </h3>
            <div className="space-y-3.5">
              {[
                { title: "Offline-First Edge AI", desc: "Instant disease detection using on-device neural classifier — no internet required for diagnosis." },
                { title: "ASEAN Crop Calibration", desc: "Covers 17 key regional crops with localized symptoms, treatment guidance, and prevention." },
                { title: "LLM Clinical Analysis", desc: "When connected, Cloud AI enriches the scan with pharmacological recipes and yield impact analysis." },
                { title: "IndexedDB Cloud Sync", desc: "Captures persist securely in browser storage and sync seamlessly with account backends." },
                { title: "GPS Field Mapping", desc: "Records geolocation with each leaf scan to assist in spatial outbreak tracing." },
              ].map((feat) => (
                <div key={feat.title} className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{feat.title}</div>
                    <div className="text-slate-500 mt-0.5 leading-relaxed">{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" /> 5-Step Field Protocol
            </h3>
            <div className="space-y-3.5">
              {[
                { step: "1", title: "Select Plant Type", desc: "Choose your ASEAN variety or allow edge vision to detect plant family." },
                { step: "2", title: "Frame & Photograph Leaf", desc: "Capture a clear image of the lesion or symptomatic area from 20-30 cm." },
                { step: "3", title: "Edge Neural Inference", desc: "TensorFlow model computes probability vector in under 1 second." },
                { step: "4", title: "Review Actionable Guidance", desc: "Inspect immediate 24-48h steps, chemical remedies, and organic care." },
                { step: "5", title: "Export & Cloud Sync", desc: "Generate PDF field dossiers and push to national monitoring database." },
              ].map((stepItem) => (
                <div key={stepItem.step} className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {stepItem.step}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{stepItem.title}</div>
                    <div className="text-slate-500 mt-0.5 leading-relaxed">{stepItem.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
