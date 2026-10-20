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
    <div className="min-h-screen bg-[#f7f9f4] pb-32">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#163a24] via-[#1a4731] to-[#2d7a4f] text-white px-4 pt-8 pb-14">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">FarmGPT</div>
              <div className="text-xs text-white/60">Multi-Plant Edge AI Disease Detection</div>
            </div>
          </div>
          <h1 className="text-3xl font-black leading-tight mb-3">
            Crop Scanner for<br />
            <span className="text-yellow-400">Field Diagnosis</span>
          </h1>
          <p className="text-sm text-white/80 leading-relaxed max-w-sm">
            Scan any ASEAN crop leaf with your phone camera. Detect 80+ diseases across 17 crop types with AI-powered analysis — works completely offline with Edge AI.
          </p>

          {/* Status pill */}
          <div className={`mt-4 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${isOnline ? "bg-white/20 text-white" : "bg-amber-500/30 text-amber-200"}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Connected · Cloud sync active" : "Offline · Local mode active"}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 space-y-4">
        {/* Main Feature */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-3 flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-200 bg-white/20 px-2 py-0.5 rounded-full">Field Layer</span>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Crop Scanner</h2>
                <p className="text-sm text-gray-500 mt-0.5">Scan any plant leaf to detect diseases instantly — works offline with Edge AI. Get LLM-powered analysis when online.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-emerald-50 rounded-xl p-2">
                <div className="text-lg font-black text-emerald-700">80+</div>
                <div className="text-xs text-emerald-600">Diseases</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2">
                <div className="text-lg font-black text-emerald-700">17</div>
                <div className="text-xs text-emerald-600">ASEAN Crops</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2">
                <div className="text-lg font-black text-emerald-700">100%</div>
                <div className="text-xs text-emerald-600">Offline</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/scan" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  <Camera className="w-4 h-4" /> Open Crop Scanner
                </button>
              </Link>
              <Link href="/history">
                <button className="flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 rounded-xl py-2.5 px-3 text-sm font-medium hover:bg-emerald-50 transition-colors">
                  <History className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 rounded-xl py-2.5 px-3 text-sm font-medium hover:bg-emerald-50 transition-colors">
                  <BarChart2 className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Supported ASEAN Crops */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">ASEAN Crop Types Supported (17 crops)</h3>
          <div className="grid grid-cols-6 gap-2">
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🌾</div>
              <div className="text-xs font-semibold text-emerald-900">Rice</div>
              <div className="text-xs text-emerald-700 mt-0.5">8 diseases</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🥔</div>
              <div className="text-xs font-semibold text-orange-900">Cassava</div>
              <div className="text-xs text-orange-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🌽</div>
              <div className="text-xs font-semibold text-yellow-900">Corn</div>
              <div className="text-xs text-yellow-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🥥</div>
              <div className="text-xs font-semibold text-amber-900">Coconut</div>
              <div className="text-xs text-amber-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🍍</div>
              <div className="text-xs font-semibold text-yellow-900">Pineapple</div>
              <div className="text-xs text-yellow-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🍅</div>
              <div className="text-xs font-semibold text-red-900">Tomato</div>
              <div className="text-xs text-red-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🥬</div>
              <div className="text-xs font-semibold text-green-900">Cabbage</div>
              <div className="text-xs text-green-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🍫</div>
              <div className="text-xs font-semibold text-red-900">Cacao</div>
              <div className="text-xs text-red-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">☕</div>
              <div className="text-xs font-semibold text-red-900">Coffee</div>
              <div className="text-xs text-red-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🌳</div>
              <div className="text-xs font-semibold text-amber-900">Rubber</div>
              <div className="text-xs text-amber-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🌾</div>
              <div className="text-xs font-semibold text-purple-900">Sugarcane</div>
              <div className="text-xs text-purple-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🍌</div>
              <div className="text-xs font-semibold text-yellow-900">Banana</div>
              <div className="text-xs text-yellow-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🥭</div>
              <div className="text-xs font-semibold text-orange-900">Mango</div>
              <div className="text-xs text-orange-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🌶️</div>
              <div className="text-xs font-semibold text-red-900">Chili</div>
              <div className="text-xs text-red-700 mt-0.5">5 diseases</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🫘</div>
              <div className="text-xs font-semibold text-green-900">Soybean</div>
              <div className="text-xs text-green-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🍠</div>
              <div className="text-xs font-semibold text-orange-900">Sweet Potato</div>
              <div className="text-xs text-orange-700 mt-0.5">4 diseases</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🌿</div>
              <div className="text-xs font-semibold text-green-900">Taro</div>
              <div className="text-xs text-green-700 mt-0.5">4 diseases</div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Key Features</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Offline-First Edge AI</div>
                <div className="text-xs text-gray-500">Instant disease detection using pixel analysis — no internet required for basic diagnosis.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
              <div>
                <div className="text-sm font-medium text-gray-800">ASEAN Crop Support</div>
                <div className="text-xs text-gray-500">Detect diseases across 17 ASEAN crops with 80+ disease profiles including treatments and prevention.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
              <div>
                <div className="text-sm font-medium text-gray-800">LLM-Powered Analysis</div>
                <div className="text-xs text-gray-500">When online, get AI-enhanced diagnosis with treatment recommendations and yield impact estimates.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Cloud Sync</div>
                <div className="text-xs text-gray-500">All scans automatically sync to the cloud when connectivity returns. Access your history anytime.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Transparent Confidence</div>
                <div className="text-xs text-gray-500">See exactly how the AI calculated its confidence score with detailed pixel analysis breakdown.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
              <div>
                <div className="text-sm font-medium text-gray-800">GPS Location Tracking</div>
                <div className="text-xs text-gray-500">Automatically record scan location. Build disease maps of your fields over time.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Disease Categories */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Disease Coverage</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
              <span className="text-sm text-emerald-900 font-medium">Fungal Diseases</span>
              <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded">30+</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <span className="text-sm text-amber-900 font-medium">Viral Diseases</span>
              <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded">10+</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
              <span className="text-sm text-orange-900 font-medium">Bacterial Diseases</span>
              <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">5+</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
              <span className="text-sm text-red-900 font-medium">Soil-borne Diseases</span>
              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">5+</span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">How It Works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Select Plant Type</div>
                <div className="text-xs text-gray-500">Choose from 8 supported plant types (rice, wheat, corn, potato, tomato, soybean, apple, grape).</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Take a Photo</div>
                <div className="text-xs text-gray-500">Use your phone camera to photograph a leaf showing symptoms.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Instant Analysis</div>
                <div className="text-xs text-gray-500">AI analyzes the image locally on your phone. Get results in under 1 second.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</div>
              <div>
                <div className="text-sm font-medium text-gray-800">View Results</div>
                <div className="text-xs text-gray-500">See disease diagnosis, confidence score, treatment options, and prevention tips.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">5</div>
              <div>
                <div className="text-sm font-medium text-gray-800">Cloud Sync (Optional)</div>
                <div className="text-xs text-gray-500">When online, results sync to cloud and get enhanced with LLM analysis.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
