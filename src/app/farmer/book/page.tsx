"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage, getCropName } from "@/lib/i18n";
import { calculateHandlingDuration, formatDurationHoursMinutes, HandlingModelOutput } from "@/lib/handlingDuration";
import {
  to12Hour,
  formatTimeRange12h,
  formatApproxTimeRange12h,
} from "@/lib/timeFormat";
import { ALL_PROCUREMENT_CENTRES, AVAILABLE_STATES, getCentresByState, type MockProcurementCentre } from "@/lib/mocks/procurementCentres";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Minus,
  Plus,
  Scale,
  Sparkles,
  Truck,
  Users,
  X,
} from "lucide-react";
import { ClientPortal } from "@/components/ClientPortal";
import { useInstantSync } from "@/lib/useInstantSync";

interface CropInfo {
  key: string;
  category: "Grains" | "Pulses" | "Vegetables";
  msp: number;
  defaultKg: number;
  packaging: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
  unitNameEn: string;
  unitNameHi: string;
  unitNameTe: string;
  packagingBadge: string;
  image: string;
}

const CROPS: CropInfo[] = [
  {
    key: "Wheat",
    category: "Grains",
    msp: 2275,
    defaultKg: 50,
    packaging: "GUNNY_BAG_50KG",
    unitNameEn: "Gunny Bags",
    unitNameHi: "जूट बोरी",
    unitNameTe: "గోనె సంచులు",
    packagingBadge: "50 kg Gunny Bags",
    image: "/crops/wheat.jpg",
  },
  {
    key: "Paddy",
    category: "Grains",
    msp: 2183,
    defaultKg: 50,
    packaging: "GUNNY_BAG_50KG",
    unitNameEn: "Gunny Bags",
    unitNameHi: "जूट बोरी",
    unitNameTe: "గోనె సంచులు",
    packagingBadge: "50 kg Gunny Bags",
    image: "/crops/paddy.jpg",
  },
  {
    key: "Chana",
    category: "Pulses",
    msp: 5440,
    defaultKg: 50,
    packaging: "GUNNY_BAG_50KG",
    unitNameEn: "Gunny Bags",
    unitNameHi: "जूट बोरी",
    unitNameTe: "గోనె సంచులు",
    packagingBadge: "50 kg Gunny Bags",
    image: "/crops/chana.jpg",
  },
  {
    key: "Moong",
    category: "Pulses",
    msp: 8558,
    defaultKg: 50,
    packaging: "GUNNY_BAG_50KG",
    unitNameEn: "Gunny Bags",
    unitNameHi: "जूट बोरी",
    unitNameTe: "గోనె సంచులు",
    packagingBadge: "50 kg Gunny Bags",
    image: "/crops/moong.jpg",
  },
  {
    key: "Tomato",
    category: "Vegetables",
    msp: 1500,
    defaultKg: 25,
    packaging: "CRATE_25KG",
    unitNameEn: "Produce Crates",
    unitNameHi: "सब्जी क्रेट्स",
    unitNameTe: "కూరగాయల క్రేట్లు",
    packagingBadge: "25 kg Agri Crates",
    image: "/crops/tomato.jpg",
  },
  {
    key: "Potato",
    category: "Vegetables",
    msp: 1200,
    defaultKg: 50,
    packaging: "GUNNY_BAG_50KG",
    unitNameEn: "Mesh / Gunny Bags",
    unitNameHi: "बोरी",
    unitNameTe: "సంచులు",
    packagingBadge: "50 kg Mesh / Gunny",
    image: "/crops/potato.jpg",
  },
  {
    key: "Onion",
    category: "Vegetables",
    msp: 1800,
    defaultKg: 50,
    packaging: "GUNNY_BAG_50KG",
    unitNameEn: "Mesh / Gunny Bags",
    unitNameHi: "बोरी",
    unitNameTe: "సంచులు",
    packagingBadge: "50 kg Mesh / Gunny",
    image: "/crops/onion.jpg",
  },
];

interface Centre {
  id: string;
  name: string;
  district: string;
  state: string;
}

interface DynamicSlot {
  hourOfDay: number;
  startTime: string;
  endTime: string;
  timeLabel: string;
  bayNumber?: number;
  bayLabel?: string;
  sessionName?: string;
  durationMinutes: number;
  bufferMinutes: number;
  available: number;
  isFull: boolean;
  explanation?: string;
  isNextDynamicConsecutive?: boolean;
}

interface BaySchedule {
  tokenNumber: string;
  bayNumber: number;
  startTime: string;
  endTime: string;
  startTime12?: string;
  endTime12?: string;
  packageCount: number;
  cropName: string;
}

interface BookedSegment {
  id: string;
  tokenNumber: string;
  bayAssigned: number;
  sessionName?: string;
  startTime24: string;
  endTime24: string;
  startTime12: string;
  endTime12: string;
  packageCount: number;
  cropName: string;
  leftPercent: number;
  widthPercent: number;
}

interface SuggestedSlot {
  sessionName?: string;
  startTime24: string;
  endTime24: string;
  startTime12: string;
  endTime12: string;
  approxDisplay: string;
  bayAssigned: number;
  bayLabel: string;
  durationMinutes: number;
  hasLunchSpillover: boolean;
  spilloverDetails?: {
    part1TimeRange12: string;
    part1DurationMinutes: number;
    part2TimeRange12: string;
    part2DurationMinutes: number;
    lunchNotice: string;
  } | null;
  candidateLeftPercent: number;
  candidateWidthPercent: number;
}

interface SessionInfo {
  sessionName?: string;
  name: string;
  startTime24: string;
  endTime24: string;
  startTime12: string;
  endTime12: string;
  timeLabel12: string;
  totalMinutes: number;
  availableMinutes: number;
  isFull: boolean;
  bookedSegments: BookedSegment[];
  suggestedSlot: SuggestedSlot;
}

interface SessionsPayload {
  morningSession: SessionInfo;
  lunchBreak: {
    startTime24: string;
    endTime24: string;
    startTime12: string;
    endTime12: string;
    durationHours: number;
    label: string;
  };
  afternoonSession: SessionInfo;
}

const FALLBACK_CENTRES: Centre[] = ALL_PROCUREMENT_CENTRES.map(c => ({
  id: c.id,
  name: c.name,
  district: c.district,
  state: c.state,
}));

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCropKey = searchParams.get("crop") || searchParams.get("cropName");
  const preSelectedCategory = searchParams.get("category");
  const preSelectedPackageCount = searchParams.get("packageCount");
  const preSelectedCentreId = searchParams.get("centreId");
  const rescheduleBookingId = searchParams.get("rescheduleBookingId");
  const { t, locale } = useLanguage();

  const [step, setStep] = useState(1);
  const [selectedCrop, setSelectedCrop] = useState<CropInfo | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Requirement 3 & 6: Package count, capacity, and active worker modeling
  const [packageCount, setPackageCount] = useState<number>(10);
  const [capacityKg, setCapacityKg] = useState<number>(50);
  const [capacityMode, setCapacityMode] = useState<"standard" | "alt" | "custom">("standard");
  const [activeWorkers, setActiveWorkers] = useState<number>(4);

  const [centres, setCentres] = useState<Centre[]>(FALLBACK_CENTRES);
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(FALLBACK_CENTRES[0]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [slots, setSlots] = useState<DynamicSlot[]>([]);
  const [sessionsData, setSessionsData] = useState<SessionsPayload | null>(null);
  const [selectedSessionType, setSelectedSessionType] = useState<"morning" | "afternoon" | null>("morning");
  const [baySchedules, setBaySchedules] = useState<BaySchedule[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DynamicSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tokenNumber: string;
    scheduledSlotStart: string;
    scheduledSlotEnd: string;
    bayAssigned?: number;
    sessionName?: string;
  } | null>(null);
  const [farmerId, setFarmerId] = useState("");
  const [toast, setToast] = useState("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [centreSearch, setCentreSearch] = useState("");

  const [noticeModal, setNoticeModal] = useState<{
    isOpen: boolean;
    errorType?: "QUOTA_EXCEEDED" | "ACTIVE_SLOT_LIMIT_EXCEEDED" | "SAME_DAY_CONFLICT" | "GENERAL_ERROR";
    title: string;
    message: string;
    quotaDetails?: {
      requestedQtl: number;
      remainingQuotaQtl: number;
      totalQuotaQtl: number;
      activeBookedQtl: number;
      isFullyUtilized: boolean;
      maxAllowedPackages: number;
    };
    conflictDetails?: {
      tokenNumber: string;
      centreName: string;
      date: string;
      bookingId: string;
    };
    limitDetails?: {
      activeBookingsCount: number;
      maxAllowed: number;
    };
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [farmerQuota, setFarmerQuota] = useState<{
    totalQuotaQtl: number;
    cropSown?: string;
  } | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (!stored) {
      router.push("/login");
      return;
    }
    setFarmerId(JSON.parse(stored).id);
    try {
      const parsed = JSON.parse(stored);
      setFarmerId(parsed.id);
      if (parsed.landRecords && parsed.landRecords[0]) {
        setFarmerQuota({
          totalQuotaQtl: parsed.landRecords[0].maxProcurementQuotaQtl || 100,
          cropSown: parsed.landRecords[0].cropSown || parsed.landRecords[0].verifiedSownCrop,
        });
      }
    } catch {}
  }, [router]);

  // Default state from farmer's Aadhaar profile
  useEffect(() => {
    const stored = localStorage.getItem("kisanjod_farmer");
    if (stored) {
      try {
        const farmer = JSON.parse(stored);
        if (farmer.state && AVAILABLE_STATES.includes(farmer.state)) {
          setSelectedState(farmer.state);
        }
      } catch {}
    }
  }, []);

  // Handle URL pre-selection (Direct Crop or Category Filter)
  useEffect(() => {
    if (preSelectedCropKey) {
      const match = CROPS.find(
        (c) => c.key.toLowerCase() === preSelectedCropKey.toLowerCase()
      );
      if (match) {
        setSelectedCrop(match);
        setCapacityKg(match.defaultKg);
        setCapacityMode("standard");
        if (preSelectedPackageCount && Number(preSelectedPackageCount) > 0) {
          setPackageCount(Number(preSelectedPackageCount));
        }
        setStep(2);
      }
    } else if (preSelectedCategory) {
      const cat = preSelectedCategory.toLowerCase();
      if (cat.includes("veg")) setActiveCategory("Vegetables");
      else if (cat.includes("grain")) setActiveCategory("Grains");
      else if (cat.includes("pulse")) setActiveCategory("Pulses");
    }
  }, [preSelectedCropKey, preSelectedPackageCount, preSelectedCategory]);

  const fetchCentres = useCallback(() => {
    setLoadingCentres(true);
    const params = new URLSearchParams();
    if (selectedState) params.set("state", selectedState);
    fetch(`/api/centres?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.centres && d.centres.length > 0) {
          setCentres(d.centres);
          if (preSelectedCentreId) {
            const found = d.centres.find((c: Centre) => c.id === preSelectedCentreId);
            if (found) {
              setSelectedCentre(found);
              return;
            }
          }
          setSelectedCentre((prev) => prev || d.centres[0]);
        }
      })
      .catch((err) => console.error("Error loading centres:", err))
      .finally(() => setLoadingCentres(false));
  }, [preSelectedCentreId, selectedState]);

  useEffect(() => {
    if (selectedState) {
      const filtered = FALLBACK_CENTRES.filter(c => c.state === selectedState);
      setCentres(filtered.length > 0 ? filtered : FALLBACK_CENTRES);
    } else {
      setCentres(FALLBACK_CENTRES);
    }
    fetchCentres();
  }, [selectedState, fetchCentres]);

  // Safety net: auto-recover centres and selection on Step 3
  useEffect(() => {
    if (step === 3) {
      if (centres.length === 0) fetchCentres();
      if (!selectedCentre && centres.length > 0) setSelectedCentre(centres[0]);
    }
  }, [step, centres, selectedCentre, fetchCentres]);

  // Fetch dynamic continuous slots when centre, date, or load changes
  useEffect(() => {
    if (selectedCentre && selectedDate && selectedCrop) {
      const unitType = selectedCrop.packaging;
      const url = `/api/centres/${selectedCentre.id}/slots?date=${selectedDate}&packageCount=${packageCount}&unitType=${unitType}&capacityKg=${capacityKg}&workers=${activeWorkers}`;
      setLoadingSlots(true);
      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          setSlots(d.dynamicSlots || d.slots || []);
          setBaySchedules(d.baySchedules || []);
          if (d.sessions) {
            setSessionsData(d.sessions);
            // Default selection: Morning if available, else Afternoon
            const mornSlot = d.sessions.morningSession.suggestedSlot;
            const aftSlot = d.sessions.afternoonSession.suggestedSlot;

            const mornOption: DynamicSlot = {
              hourOfDay: parseInt(mornSlot.startTime24.split(":")[0], 10),
              startTime: mornSlot.startTime24,
              endTime: mornSlot.endTime24,
              timeLabel: formatTimeRange12h(mornSlot.startTime24, mornSlot.endTime24),
              bayNumber: mornSlot.bayAssigned,
              bayLabel: mornSlot.bayLabel,
              sessionName: "MORNING",
              durationMinutes: mornSlot.durationMinutes,
              bufferMinutes: 10,
              available: d.sessions.morningSession.isFull ? 0 : 1,
              isFull: d.sessions.morningSession.isFull,
            };

            const aftOption: DynamicSlot = {
              hourOfDay: parseInt(aftSlot.startTime24.split(":")[0], 10),
              startTime: aftSlot.startTime24,
              endTime: aftSlot.endTime24,
              timeLabel: formatTimeRange12h(aftSlot.startTime24, aftSlot.endTime24),
              bayNumber: aftSlot.bayAssigned,
              bayLabel: aftSlot.bayLabel,
              sessionName: "AFTERNOON",
              durationMinutes: aftSlot.durationMinutes,
              bufferMinutes: 10,
              available: d.sessions.afternoonSession.isFull ? 0 : 1,
              isFull: d.sessions.afternoonSession.isFull,
            };

            if (!d.sessions.morningSession.isFull) {
              setSelectedSessionType("morning");
              setSelectedSlot(mornOption);
            } else if (!d.sessions.afternoonSession.isFull) {
              setSelectedSessionType("afternoon");
              setSelectedSlot(aftOption);
            } else {
              setSelectedSessionType(null);
              setSelectedSlot(null);
            }
          }
        })
        .catch(console.error)
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [selectedCentre, selectedDate, selectedCrop, packageCount, capacityKg, activeWorkers]);

  // Zero-delay instant sync over SSE and BroadcastChannel to refresh slots and centres
  useInstantSync(() => {
    fetchCentres();
    if (selectedCentre && selectedDate && selectedCrop) {
      const unitType = selectedCrop.packaging;
      const url = `/api/centres/${selectedCentre.id}/slots?date=${selectedDate}&packageCount=${packageCount}&unitType=${unitType}&capacityKg=${capacityKg}&workers=${activeWorkers}`;
      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          if (d.dynamicSlots || d.slots) {
            setSlots(d.dynamicSlots || d.slots);
          }
          if (d.baySchedules) {
            setBaySchedules(d.baySchedules);
          }
        })
        .catch(() => {});
    }
  });

  // Calculate handling duration and net weight using authoritative research formula
  const handlingResult: HandlingModelOutput = calculateHandlingDuration({
    packageCount,
    unitType: selectedCrop?.packaging || "GUNNY_BAG_50KG",
    capacityKg,
    activeWorkers,
  });

  const isTomatoOrCrate = selectedCrop?.packaging === "CRATE_25KG";
  const unitLabel = isTomatoOrCrate
    ? locale === "hi"
      ? "क्रेट्स"
      : locale === "te"
      ? "క్రేట్లు"
      : "Produce Crates"
    : locale === "hi"
    ? "जूट बोरी"
    : locale === "te"
    ? "గోనె సంచులు"
    : "Gunny Bags";

  // Stepper handlers preventing invalid input (Requirement 6)
  const handleIncrement = (amount: number = 1) => {
    setPackageCount((prev) => Math.min(5000, (prev || 0) + amount));
  };

  const handleDecrement = (amount: number = 1) => {
    setPackageCount((prev) => Math.max(1, (prev || 1) - amount));
  };

  const handleConfirm = async () => {
    if (!selectedCrop || !selectedCentre || !selectedSlot) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId,
          centerId: selectedCentre.id,
          cropName: selectedCrop.key,
          packageCount,
          capacityKg,
          date: selectedDate,
          hourOfDay: selectedSlot.hourOfDay,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          bayAssigned: selectedSlot.bayNumber || 1,
          sessionName: selectedSessionType === "morning" ? "MORNING" : "AFTERNOON",
          unitType: selectedCrop.packaging,
          rescheduleBookingId: rescheduleBookingId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.booking);
        setStep(5);
      } else {
        setNoticeModal({
          isOpen: true,
          errorType: data.errorType || "GENERAL_ERROR",
          title:
            data.errorType === "QUOTA_EXCEEDED"
              ? "Seasonal Land Quota Limit"
              : data.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED"
              ? "Active Booking Limit (Max 3 Slots)"
              : data.errorType === "SAME_DAY_CONFLICT"
              ? "Mandi Scheduling Conflict"
              : "Booking Notice",
          message: data.error || t("bookingFailed") || "Could not complete booking",
          quotaDetails: data.quotaDetails,
          conflictDetails: data.conflictDetails,
          limitDetails: data.details,
        });
      }
    } catch {
      setNoticeModal({
        isOpen: true,
        errorType: "GENERAL_ERROR",
        title: "Connection Notice",
        message: "Unable to reach the APMC procurement server. Please check your internet connection and try again.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto">
      {toast && <div className="action-toast" role="status">{toast}</div>}

      {/* Top Persistent Navigation Bar */}
      <div className="flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-100 shadow-sm sticky top-16 z-30">
        <button
          type="button"
          onClick={() => {
            if (step === 1) router.push("/farmer/dashboard");
            else if (step === 2) setStep(1);
            else if (step === 3) setStep(2);
            else if (step === 4) setStep(3);
            else router.push("/farmer/dashboard");
          }}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#176b4b] hover:text-[#0d4f3c] bg-emerald-50/90 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-2xs"
          aria-label="Navigate Back"
        >
          <ArrowLeft size={16} />
          <span>
            {step === 1
              ? "Dashboard"
              : step === 2
              ? "Change Crop"
              : step === 3
              ? "Change Quantity"
              : step === 4
              ? "Change Slot"
              : "Dashboard"}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-[#eafaf1] border border-emerald-200 px-2.5 py-1 rounded-full">
            {step === 5 ? "Booking Complete" : `Step ${step} of 4`}
          </span>
        </div>
      </div>

      {/* Progress Step Indicator */}
      <div className="flex gap-1.5 px-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? "bg-amber-400 shadow-sm shadow-amber-400/30" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CROP SELECTION (Full-bleed Photo Cards with Text Overlay)         */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
                {t("stepCrop")}
              </h2>
            </div>
          </div>

          {/* Interactive Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-gray-100 pb-3">
            {[
              { key: "All", label: "All Commodities", icon: "🌱", count: CROPS.length },
              { key: "Grains", label: "Grains & Cereals", icon: "🌾", count: CROPS.filter(c => c.category === "Grains").length },
              { key: "Pulses", label: "Pulses", icon: "🫘", count: CROPS.filter(c => c.category === "Pulses").length },
              { key: "Vegetables", label: "Vegetables", icon: "🍅", count: CROPS.filter(c => c.category === "Vegetables").length },
            ].map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95 ${
                    isActive
                      ? "bg-emerald-800 text-white shadow-sm border border-emerald-900"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? "bg-emerald-950 text-emerald-200" : "bg-white text-gray-600 border border-gray-200"}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Crop Cards with Visual Imagery & Text Overlay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {CROPS.filter((crop) => {
              if (activeCategory === "All") return true;
              if (activeCategory === "Grains") return crop.category === "Grains";
              if (activeCategory === "Pulses") return crop.category === "Pulses";
              if (activeCategory === "Vegetables") return crop.category === "Vegetables";
              return true;
            }).map((crop) => {
              const isSelected = selectedCrop?.key === crop.key;
              return (
                <button
                  key={crop.key}
                  type="button"
                  onClick={() => {
                    setSelectedCrop(crop);
                    setCapacityKg(crop.defaultKg);
                    setCapacityMode("standard");
                    setStep(2);
                    showToast(`${crop.key}: ${t("cropSelected") || "Selected"}`);
                  }}
                  className={`group relative h-48 rounded-2xl overflow-hidden border-2 text-left transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isSelected
                      ? "border-emerald-600 ring-2 ring-emerald-500 shadow-xl scale-[1.01]"
                      : "border-gray-200/80 hover:border-emerald-500 shadow-md hover:shadow-xl"
                  }`}
                >
                  {/* Background Image with Hover Scale */}
                  <img
                    src={crop.image}
                    alt={crop.key}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Dark Multi-Stop Gradient Overlay for Clean Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

                  {/* Top Category Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/50 text-emerald-200 border border-white/20 backdrop-blur-xs">
                      {crop.category}
                    </span>
                  </div>

                  {/* Bottom Text Content Positioned Cleanly Inside Over Image */}
                  <div className="absolute bottom-3 left-3 right-3 z-10 text-white">
                    <h3 className="text-xl font-black font-heading tracking-tight drop-shadow-sm text-white flex items-center justify-between">
                      <span>{getCropName(crop.key, locale)}</span>
                      {isSelected && (
                        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                      )}
                    </h3>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/20 text-xs">
                      <span className="text-emerald-300 font-extrabold drop-shadow-sm">
                        {crop.category === "Vegetables" ? "Kharif / Year-round" : crop.key === "Paddy" ? "Kharif Season" : "Rabi Season"}
                      </span>
                      <span className="text-[11px] text-gray-200 font-semibold">
                        {crop.packagingBadge}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* STEP 2: QUANTITY & BAG/CRATE CAPACITY (Matching Reference Screenshot)      */}
      {/* ========================================================================= */}
      {step === 2 && selectedCrop && (
        <div className="glass-card p-6 sm:p-8 space-y-5 rounded-[32px] bg-white shadow-xl border border-gray-100">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 font-heading tracking-tight">
              Bags & Capacity
            </h2>
          </div>

          {/* Selected Crop Summary Card (Matching Reference Screenshot) */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#e6f8f0] border border-[#a8e5cc] shadow-sm">
            <img
              src={selectedCrop.image}
              alt={selectedCrop.key}
              className="w-14 h-14 rounded-xl object-cover border border-[#a8e5cc]/60 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[#1f2937] leading-tight truncate">
                {getCropName(selectedCrop.key, locale)}
              </h3>
              <p className="text-xs font-bold text-[#0f6b4d] mt-0.5">
                {selectedCrop.category === "Grains" ? "Grains & Cereals" : selectedCrop.category === "Pulses" ? "Pulses & Legumes" : "Vegetables & Horticulture"} • {selectedCrop.category === "Vegetables" ? "Year-Round APMC Produce" : selectedCrop.key === "Paddy" ? "Kharif Season" : "Rabi Season"} • {selectedCrop.packagingBadge}
              </p>
            </div>
          </div>

          {/* Live Verified Land Quota Status Badge */}
          {farmerQuota && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🛡️</span>
                <div>
                  <span className="font-extrabold text-emerald-950 block">
                    Verified Land Quota
                  </span>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    Maximum seasonal limit: {farmerQuota.totalQuotaQtl} Quintals
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Estimated Load
                </span>
                <strong className={`text-sm font-black ${
                  ((packageCount * capacityKg) / 100) > farmerQuota.totalQuotaQtl
                    ? "text-amber-700"
                    : "text-emerald-900"
                }`}>
                  {((packageCount * capacityKg) / 100).toFixed(1)} Qtl
                </strong>
              </div>
            </div>
          )}

          {/* Number Stepper Control with Zero Collision (Requirement 6 & Screenshot) */}
          <div className="space-y-2">
            <label htmlFor="package-count-input" className="block text-xs font-extrabold uppercase tracking-wider text-[#4b5563]">
              NUMBER OF BAGS / BOXES
            </label>

            <div className="flex items-center justify-between rounded-2xl border-2 border-[#34d399] bg-[#e6f8f0] p-3 sm:p-4 shadow-sm focus-within:border-[#0f6b4d] focus-within:bg-white transition-all">
              {/* Left: Big Numeric Input */}
              <div className="flex items-center">
                <input
                  id="package-count-input"
                  aria-label="Number of bags or boxes"
                  type="number"
                  min={1}
                  max={5000}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={packageCount === 0 ? "" : packageCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") setPackageCount(0);
                    else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) setPackageCount(Math.min(5000, Math.max(0, num)));
                    }
                  }}
                  onBlur={() => {
                    if (!packageCount || packageCount < 1) setPackageCount(1);
                  }}
                  className="w-28 sm:w-36 text-3xl sm:text-4xl font-black text-[#1f2937] bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>

              {/* Right: Unit Label + Tactile Stepper Buttons (Zero overlap) */}
              <div className="flex items-center gap-3">
                <span className="text-base sm:text-lg font-bold text-[#6b7280]">
                  {unitLabel}
                </span>

                <div className="flex items-center gap-1.5 pl-2 border-l border-[#a8e5cc]">
                  <button
                    type="button"
                    onClick={() => handleDecrement(1)}
                    disabled={packageCount <= 1}
                    className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-emerald-50 hover:text-emerald-900 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Decrease"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={18} strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleIncrement(1)}
                    className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#0d4f3c] text-white shadow-sm hover:bg-[#12684f] active:scale-95 transition-all"
                    title="Increase"
                    aria-label="Increase quantity"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Container Capacity Presets (Matching Reference Screenshot) */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#4b5563]">
              BAG / CONTAINER CAPACITY
            </label>

            {isTomatoOrCrate ? (
              /* Crate Capacity Options */
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode("standard");
                    setCapacityKg(25);
                    showToast("25 kg Standard Agri Crate");
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-center transition-all ${
                    capacityMode === "standard"
                      ? "bg-[#0d4f3c] text-white shadow-sm border border-[#0d4f3c]"
                      : "bg-white text-[#1f2937] border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  25 kg ({t("standard")})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode("alt");
                    setCapacityKg(20);
                    showToast("20 kg Vegetable Crate");
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-center transition-all ${
                    capacityMode === "alt"
                      ? "bg-[#0d4f3c] text-white shadow-sm border border-[#0d4f3c]"
                      : "bg-white text-[#1f2937] border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  20 kg ({t("crate")})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode("custom");
                    showToast(t("customKg"));
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-center transition-all ${
                    capacityMode === "custom"
                      ? "bg-[#0d4f3c] text-white shadow-sm border border-[#0d4f3c]"
                      : "bg-white text-[#1f2937] border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  Custom kg
                </button>
              </div>
            ) : (
              /* Gunny Bag Capacity Options (Matching screenshot: 50 kg Standard, 25 kg Crate, Custom kg) */
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode("standard");
                    setCapacityKg(50);
                    showToast("50 kg Standard Gunny Bag");
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-center transition-all ${
                    capacityMode === "standard"
                      ? "bg-[#0d4f3c] text-white shadow-sm border border-[#0d4f3c]"
                      : "bg-white text-[#1f2937] border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  50 kg (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode("alt");
                    setCapacityKg(25);
                    showToast("25 kg Crate");
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-center transition-all ${
                    capacityMode === "alt"
                      ? "bg-[#0d4f3c] text-white shadow-sm border border-[#0d4f3c]"
                      : "bg-white text-[#1f2937] border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  25 kg (Crate)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapacityMode("custom");
                    showToast(t("customKg"));
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-center transition-all ${
                    capacityMode === "custom"
                      ? "bg-[#0d4f3c] text-white shadow-sm border border-[#0d4f3c]"
                      : "bg-white text-[#1f2937] border border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  Custom kg
                </button>
              </div>
            )}

            {capacityMode === "custom" && (
              <div className="pt-2">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(Math.max(1, Number(e.target.value) || 50))}
                  placeholder={t("enterKgPerBag")}
                  className="w-full px-4 py-3 border-2 border-[#34d399] rounded-xl text-base font-bold bg-white focus:outline-none focus:border-[#0d4f3c]"
                />
              </div>
            )}
          </div>

          {/* Authoritative Handling Calculation Card (Matching Reference Screenshot) */}
          <div className="rounded-2xl p-5 bg-[#eafaf1] border border-[#a8e5cc] shadow-sm space-y-3">
            <div className="flex justify-between items-center text-sm pb-2 border-b border-[#a8e5cc]/60">
              <span className="text-[#4b5563] font-semibold">Calculated Net Weight:</span>
              <strong className="text-xl font-black text-[#0d4f3c] font-heading">
                {handlingResult.netWeightQuintals} Quintals
              </strong>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="text-[#4b5563] font-semibold block">Est. Handling Duration:</span>
                <span className="text-[11px] text-gray-500">
                  {handlingResult.breakdownDescription}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-[#1f2937] font-heading">
                  {formatDurationHoursMinutes(handlingResult.totalDurationMinutes, true)}
                </span>
                <span className="block text-[11px] font-semibold text-amber-800">
                  ±{handlingResult.bufferMinutes} min buffer
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Buttons (Matching Reference Screenshot) */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-base font-bold text-[#4b5563] hover:text-[#1f2937] py-3 px-4 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="bg-[#0d4f3c] hover:bg-[#12684f] active:bg-[#093d2e] text-white text-base font-extrabold py-3.5 px-8 rounded-2xl shadow-md transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: CENTRE & DYNAMIC CONTINUOUS SLOTS (Requirement 4)                */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="glass-card p-6 sm:p-7 space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
              {t("stepCentre")}
            </h2>
          </div>

          {/* State Filter Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                State / राज्य
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCentre(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500"
              >
                <option value="">All States</option>
                {AVAILABLE_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                Search Centre
              </label>
              <input
                type="text"
                value={centreSearch}
                onChange={(e) => setCentreSearch(e.target.value)}
                placeholder="Search by name or district..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Procurement Centres List */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
            {centres
              .filter((c) => {
                if (!centreSearch) return true;
                const q = centreSearch.toLowerCase();
                return (
                  c.name.toLowerCase().includes(q) ||
                  c.district.toLowerCase().includes(q) ||
                  (c.state && c.state.toLowerCase().includes(q))
                );
              })
              .map((c) => (
                <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCentre(c)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedCentre?.id === c.id
                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400 shadow-sm"
                    : "border-gray-200 bg-white hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                    🏢 {c.name}
                  </p>
                  {selectedCentre?.id === c.id && (
                    <CheckCircle2 size={16} className="text-emerald-700" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  📍 {c.district}, {c.state} • Mandi Sessions: Morning & Afternoon
                </p>
              </button>
            ))}

            {centres.length === 0 && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                <p className="text-xs font-bold text-amber-900">
                  Loading Mandi Procurement Centres...
                </p>
                <button
                  type="button"
                  onClick={() => fetchCentres()}
                  className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Reload Centres
                </button>
              </div>
            )}
          </div>

          {selectedCentre && (
            <div className="space-y-4 pt-2">
              {/* Date Selection */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                  {t("selectDate")}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3.5 border-2 border-emerald-300 rounded-2xl bg-white text-base font-extrabold shadow-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Slot Calculation Loader */}
              {loadingSlots && !sessionsData && (
                <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center space-y-2.5">
                  <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-black text-emerald-900">
                    Computing Shift Schedules & Palledar Timelines...
                  </p>
                </div>
              )}

              {/* TWO SESSIONS WITH VISUAL TIMELINE BARS */}
              <div className="space-y-4 pt-1">
                {/* 1. MORNING SESSION CARD */}
                {sessionsData?.morningSession && (
                  <div
                    onClick={() => {
                      if (sessionsData.morningSession.isFull) return;
                      setSelectedSessionType("morning");
                      const slot = sessionsData.morningSession.suggestedSlot;
                      setSelectedSlot({
                        hourOfDay: parseInt(slot.startTime24.split(":")[0], 10),
                        startTime: slot.startTime24,
                        endTime: slot.endTime24,
                        timeLabel: formatTimeRange12h(slot.startTime24, slot.endTime24),
                        bayNumber: slot.bayAssigned,
                        bayLabel: slot.bayLabel,
                        sessionName: "MORNING",
                        durationMinutes: slot.durationMinutes,
                        bufferMinutes: 10,
                        available: 1,
                        isFull: false,
                      });
                    }}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      sessionsData.morningSession.isFull
                        ? "bg-gray-100/80 border-gray-300 opacity-60 cursor-not-allowed"
                        : selectedSessionType === "morning"
                        ? "bg-white border-zinc-900 ring-2 ring-zinc-900/20 shadow-md"
                        : "bg-white border-gray-200 hover:border-zinc-400 hover:shadow-sm"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 font-heading">
                          🌅 Morning Session
                        </span>
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">
                          {sessionsData.morningSession.timeLabel12}
                        </span>
                      </div>
                      {sessionsData.morningSession.isFull ? (
                        <span className="text-[10px] font-black text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300">
                          FULL
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    {/* Timeline Time Ticks */}
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 px-0.5 mb-1.5">
                      <span>{sessionsData.morningSession.startTime12}</span>
                      <span>11:00 AM</span>
                      <span>{sessionsData.morningSession.endTime12}</span>
                    </div>

                    {/* Single Clean Session Timeline Bar with floating pin label above */}
                    <div className={`relative${selectedSessionType === "morning" && !sessionsData.morningSession.isFull ? " pt-8" : ""}`}>
                      {/* Floating "Your Slot" label pinned above the bar */}
                      {selectedSessionType === "morning" && !sessionsData.morningSession.isFull && (() => {
                        const left = sessionsData.morningSession.suggestedSlot.candidateLeftPercent;
                        const width = sessionsData.morningSession.suggestedSlot.candidateWidthPercent;
                        const centerPercent = left + width / 2;
                        const slot = sessionsData.morningSession.suggestedSlot;
                        return (
                          <div
                            className="absolute -top-7 z-10 flex flex-col items-center pointer-events-none"
                            style={{ left: `${Math.min(Math.max(centerPercent, 8), 90)}%`, transform: "translateX(-50%)" }}
                          >
                            <span className="bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-emerald-900">
                              ✦ Your Slot · {formatApproxTimeRange12h(slot.startTime24, slot.endTime24)}
                            </span>
                            <span className="w-px h-1.5 bg-emerald-600 mt-0.5" />
                          </div>
                        );
                      })()}
                      <div className="relative h-9 rounded-xl bg-gray-100 border border-gray-300 overflow-hidden flex items-center shadow-inner">
                        {/* Booked Segments in Morning Session */}
                        {sessionsData.morningSession.bookedSegments.map((seg) => (
                          <div
                            key={seg.id}
                            style={{
                              left: `${seg.leftPercent}%`,
                              width: `${seg.widthPercent}%`,
                            }}
                            className="absolute h-full bg-zinc-800 text-white flex items-center justify-center font-bold text-[10px] tracking-tight border-r border-zinc-900 select-none truncate px-1"
                            title={`Token ${seg.tokenNumber}: ${seg.startTime12} - ${seg.endTime12}`}
                          >
                            {seg.tokenNumber}
                          </div>
                        ))}

                        {/* Candidate / Selected Slot Highlight — pin indicator (no text inside bar) */}
                        {selectedSessionType === "morning" && !sessionsData.morningSession.isFull && (
                          <div
                            style={{
                              left: `${sessionsData.morningSession.suggestedSlot.candidateLeftPercent}%`,
                              width: `${Math.max(sessionsData.morningSession.suggestedSlot.candidateWidthPercent, 2)}%`,
                              minWidth: "8px",
                            }}
                            className="absolute h-full bg-emerald-500 border-2 border-emerald-800 select-none shadow-sm rounded-sm"
                            aria-label="Your allocated slot"
                          />
                        )}
                      </div>
                    </div>

                    {/* Spillover Warning Notice if needed */}
                    {sessionsData.morningSession.suggestedSlot.hasLunchSpillover && selectedSessionType === "morning" && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 leading-snug flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          ⚠️ <strong>Lunch Spillover:</strong> Consignment pauses during lunch ({sessionsData.lunchBreak.startTime12} – {sessionsData.lunchBreak.endTime12}).
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSessionType("afternoon");
                            const aft = sessionsData.afternoonSession.suggestedSlot;
                            setSelectedSlot({
                              hourOfDay: parseInt(aft.startTime24.split(":")[0], 10),
                              startTime: aft.startTime24,
                              endTime: aft.endTime24,
                              timeLabel: formatTimeRange12h(aft.startTime24, aft.endTime24),
                              bayNumber: aft.bayAssigned,
                              bayLabel: aft.bayLabel,
                              sessionName: "AFTERNOON",
                              durationMinutes: aft.durationMinutes,
                              bufferMinutes: 10,
                              available: 1,
                              isFull: false,
                            });
                          }}
                          className="px-3 py-1 bg-amber-600 text-white text-xs font-black rounded-lg hover:bg-amber-700 transition-colors shadow-sm shrink-0"
                        >
                          Switch to Afternoon Session →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. LUNCH BREAK DIVIDER — Clean & Simple */}
                {sessionsData?.lunchBreak && (() => {
                  const breakStart = sessionsData.lunchBreak.startTime12;
                  const breakEnd = sessionsData.lunchBreak.endTime12;
                  const lunchEndDisplay = sessionsData.lunchBreak.durationHours < 0.1
                    ? (() => {
                        try {
                          const parts = sessionsData.lunchBreak.startTime24.split(":").map(Number);
                          const endH = (parts[0] + 1) % 24;
                          const suffix = endH < 12 ? "AM" : "PM";
                          const disp = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
                          return `${disp}:${String(parts[1]).padStart(2, "0")} ${suffix}`;
                        } catch (_e) { return breakEnd; }
                      })()
                    : breakEnd;
                  return (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-base">☕</span>
                        <span className="font-bold text-gray-800">Lunch Break</span>
                        <span className="text-gray-500">{breakStart} – {lunchEndDisplay}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                        Break
                      </span>
                    </div>
                  );
                })()}

                {/* 3. AFTERNOON SESSION CARD */}
                {sessionsData?.afternoonSession && (
                  <div
                    onClick={() => {
                      if (sessionsData.afternoonSession.isFull) return;
                      setSelectedSessionType("afternoon");
                      const slot = sessionsData.afternoonSession.suggestedSlot;
                      setSelectedSlot({
                        hourOfDay: parseInt(slot.startTime24.split(":")[0], 10),
                        startTime: slot.startTime24,
                        endTime: slot.endTime24,
                        timeLabel: formatTimeRange12h(slot.startTime24, slot.endTime24),
                        bayNumber: slot.bayAssigned,
                        bayLabel: slot.bayLabel,
                        sessionName: "AFTERNOON",
                        durationMinutes: slot.durationMinutes,
                        bufferMinutes: 10,
                        available: 1,
                        isFull: false,
                      });
                    }}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      sessionsData.afternoonSession.isFull
                        ? "bg-gray-100/80 border-gray-300 opacity-60 cursor-not-allowed"
                        : selectedSessionType === "afternoon"
                        ? "bg-white border-zinc-900 ring-2 ring-zinc-900/20 shadow-md"
                        : "bg-white border-gray-200 hover:border-zinc-400 hover:shadow-sm"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 font-heading">
                          ☀️ Afternoon Session
                        </span>
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">
                          {sessionsData.afternoonSession.timeLabel12}
                        </span>
                      </div>
                      {sessionsData.afternoonSession.isFull ? (
                        <span className="text-[10px] font-black text-red-800 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300">
                          FULL
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    {/* Timeline Time Ticks */}
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 px-0.5 mb-1.5">
                      <span>{sessionsData.afternoonSession.startTime12}</span>
                      <span>4:00 PM</span>
                      <span>{sessionsData.afternoonSession.endTime12}</span>
                    </div>

                    {/* Single Clean Session Timeline Bar with floating pin label above */}
                    <div className={`relative${selectedSessionType === "afternoon" && !sessionsData.afternoonSession.isFull ? " pt-8" : ""}`}>
                      {/* Floating "Your Slot" label pinned above the bar */}
                      {selectedSessionType === "afternoon" && !sessionsData.afternoonSession.isFull && (() => {
                        const left = sessionsData.afternoonSession.suggestedSlot.candidateLeftPercent;
                        const width = sessionsData.afternoonSession.suggestedSlot.candidateWidthPercent;
                        const centerPercent = left + width / 2;
                        const slot = sessionsData.afternoonSession.suggestedSlot;
                        return (
                          <div
                            className="absolute -top-7 z-10 flex flex-col items-center pointer-events-none"
                            style={{ left: `${Math.min(Math.max(centerPercent, 8), 90)}%`, transform: "translateX(-50%)" }}
                          >
                            <span className="bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-emerald-900">
                              ✦ Your Slot · {formatApproxTimeRange12h(slot.startTime24, slot.endTime24)}
                            </span>
                            <span className="w-px h-1.5 bg-emerald-600 mt-0.5" />
                          </div>
                        );
                      })()}

                      <div className="relative h-9 rounded-xl bg-gray-100 border border-gray-300 overflow-hidden flex items-center shadow-inner">
                        {/* Booked Segments in Afternoon Session */}
                        {sessionsData.afternoonSession.bookedSegments.map((seg) => (
                          <div
                            key={seg.id}
                            style={{
                              left: `${seg.leftPercent}%`,
                              width: `${seg.widthPercent}%`,
                            }}
                            className="absolute h-full bg-zinc-800 text-white flex items-center justify-center font-bold text-[10px] tracking-tight border-r border-zinc-900 select-none truncate px-1"
                            title={`Token ${seg.tokenNumber}: ${seg.startTime12} - ${seg.endTime12}`}
                          >
                            {seg.tokenNumber}
                          </div>
                        ))}

                        {/* Candidate / Selected Slot Highlight — pin indicator (no text inside bar) */}
                        {selectedSessionType === "afternoon" && !sessionsData.afternoonSession.isFull && (
                          <div
                            style={{
                              left: `${sessionsData.afternoonSession.suggestedSlot.candidateLeftPercent}%`,
                              width: `${Math.max(sessionsData.afternoonSession.suggestedSlot.candidateWidthPercent, 2)}%`,
                              minWidth: "8px",
                            }}
                            className="absolute h-full bg-emerald-500 border-2 border-emerald-800 select-none shadow-sm rounded-sm"
                            aria-label="Your allocated slot"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CONFIRMATION CARD FOR SELECTED APPROXIMATE SLOT */}
                {selectedSlot && (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-2 border-emerald-500/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                          Allocated Dynamic Window
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
                            🕐 {formatApproxTimeRange12h(selectedSlot.startTime, selectedSlot.endTime)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-semibold mt-1">
                          {selectedSessionType === "morning" ? "🌅 Morning Session" : "☀️ Afternoon Session"} • Est. Duration {formatDurationHoursMinutes(handlingResult.totalDurationMinutes, true)} ({packageCount} {unitLabel})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-emerald-100">
                      <span>
                        Handling duration: <strong>{formatDurationHoursMinutes(handlingResult.totalDurationMinutes, true)}</strong> ({packageCount} {unitLabel})
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="btn-touch py-2 px-5 bg-[#0d4f3c] hover:bg-[#12684f] text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
                      >
                        Confirm Slot →
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      💡 Timings adjust dynamically based on preceding mandi unloading speed.
                    </p>
                  </div>
                )}

                {/* 5. CLEAN LIVE TOKEN SEQUENCE */}
                {baySchedules.length > 0 && (
                  <div className="rounded-2xl p-3.5 bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>📋 Live Scheduled Token Queue ({selectedDate})</span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {baySchedules.length} booked
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {baySchedules.map((bk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-800 shadow-2xs"
                        >
                          <span className="font-extrabold text-blue-900">{bk.tokenNumber}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">
                            {formatTimeRange12h(bk.startTime, bk.endTime)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-touch flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl"
            >
              ← {t("back")}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: CONFIRMATION RECEIPT                                             */}
      {/* ========================================================================= */}
      {step === 4 && selectedCrop && selectedCentre && selectedSlot && (
        <div className="glass-card p-6 sm:p-7 space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
              {t("stepConfirm")}
            </h2>
          </div>

          {/* Booking Summary Ticket */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 text-xs shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">{t("stepCrop")}:</span>
              <strong className="text-gray-900 text-sm font-black">
                {getCropName(selectedCrop.key, locale)} ({selectedCrop.category})
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">{t("payload") || "Delivery Load"}:</span>
              <strong className="text-gray-900">
                {packageCount} {unitLabel} × {capacityKg} kg = {handlingResult.netWeightQuintals} {t("quintals")}
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">{t("centre") || "Centre"}:</span>
              <strong className="text-gray-900">{selectedCentre.name}</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">{t("date") || "Date"}:</span>
              <strong className="text-gray-900">{selectedDate}</strong>
            </div>

            {/* Dynamic Slot Window */}
            <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <div>
                <span className="text-emerald-900 font-extrabold block">
                  Allocated Dynamic Slot Window:
                </span>
                <span className="text-[11px] text-emerald-700">
                  {selectedSessionType === "morning" ? "🌅 Morning Session" : "☀️ Afternoon Session"} • {formatDurationHoursMinutes(handlingResult.totalDurationMinutes, true)} handling (±10m buffer)
                </span>
              </div>
              <strong className="text-base font-black text-emerald-950 font-heading">
                {formatApproxTimeRange12h(selectedSlot.startTime, selectedSlot.endTime)}
              </strong>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-3 text-sm">
              <span className="text-gray-600 font-extrabold">{t("estHandlingTime") || "Est. Handling Duration"}:</span>
              <strong className="text-emerald-900 font-black text-lg font-heading">
                ~{handlingResult.totalDurationMinutes} {t("minutes")}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-amber-900 bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>{t("centerLockedNotice")}</span>
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-touch flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl"
            >
              ← {t("back")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="btn-touch flex-1 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-all"
            >
              {loading ? (t("issuingToken") || "Confirming...") : `✓ ${t("confirmBookingBtn")}`}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: BOOKING SUCCESS (E-TOKEN ISSUED)                                  */}
      {/* ========================================================================= */}
      {step === 5 && result && (
        <div className="glass-card p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
            <CheckCircle2 size={40} className="text-emerald-700" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 font-heading tracking-tight">
              {t("bookingSuccessTitle")}
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {t("centerLockedNotice")}
            </p>
          </div>

          {/* High-Contrast E-Token Card */}
          <div className="bg-[#0f4b36] text-white rounded-3xl p-6 sm:p-7 shadow-xl max-w-sm mx-auto border-2 border-emerald-400/30 space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">
              {t("yourToken")}
            </p>
            <p className="text-5xl sm:text-6xl font-black tracking-tight text-white font-heading">
              {result.tokenNumber}
            </p>
            <div className="pt-2 border-t border-emerald-700/60 flex items-center justify-between text-xs text-emerald-200 font-bold">
              <span>{result.tokenNumber.startsWith("M") ? "🌅 Morning Session" : "☀️ Afternoon Session"}</span>
              <span>{formatApproxTimeRange12h(result.scheduledSlotStart, result.scheduledSlotEnd)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/farmer/dashboard")}
            className="btn-touch w-full bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-extrabold rounded-2xl shadow-lg"
          >
            {t("goToDashboard")} →
          </button>
        </div>
      )}

      {/* Custom Accessible KisanJod Booking Alert Modal (Replaces browser alert()) */}
      {noticeModal.isOpen && (
        <ClientPortal>
          <div
            className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            aria-describedby="booking-modal-desc"
          >
            <div
              className="relative z-[99999] w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Colored Bar */}
              <div
                className={`h-2.5 w-full ${
                  noticeModal.errorType === "QUOTA_EXCEEDED"
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"
                    : noticeModal.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED"
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500"
                    : noticeModal.errorType === "SAME_DAY_CONFLICT"
                    ? "bg-gradient-to-r from-rose-500 via-red-600 to-amber-500"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600"
                }`}
              />

              <div className="p-6 sm:p-7 space-y-5">
                {/* Icon, Eyebrow & Close Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm text-2xl ${
                        noticeModal.errorType === "QUOTA_EXCEEDED"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : noticeModal.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED"
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : noticeModal.errorType === "SAME_DAY_CONFLICT"
                          ? "bg-rose-100 text-rose-900 border border-rose-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {noticeModal.errorType === "QUOTA_EXCEEDED" ? (
                        <Scale size={24} className="text-amber-800" />
                      ) : noticeModal.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED" ? (
                        <Calendar size={24} className="text-blue-800" />
                      ) : noticeModal.errorType === "SAME_DAY_CONFLICT" ? (
                        <MapPin size={24} className="text-rose-800" />
                      ) : (
                        <AlertCircle size={24} className="text-emerald-800" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          noticeModal.errorType === "QUOTA_EXCEEDED"
                            ? "bg-amber-100 text-amber-900"
                            : noticeModal.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED"
                            ? "bg-blue-100 text-blue-900"
                            : noticeModal.errorType === "SAME_DAY_CONFLICT"
                            ? "bg-rose-100 text-rose-900"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {noticeModal.errorType === "QUOTA_EXCEEDED"
                          ? "Seasonal Land Quota Limit"
                          : noticeModal.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED"
                          ? "Active Slot Limit (Max 3)"
                          : noticeModal.errorType === "SAME_DAY_CONFLICT"
                          ? "Mandi Logistics Regulation"
                          : "Booking Notice"}
                      </span>
                      <h3
                        id="booking-modal-title"
                        className="text-lg sm:text-xl font-black text-gray-900 font-heading mt-0.5"
                      >
                        {noticeModal.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNoticeModal({ isOpen: false, title: "", message: "" })}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Close Notice"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Main Respectful Message */}
                <p
                  id="booking-modal-desc"
                  className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80"
                >
                  {noticeModal.message}
                </p>

                {/* Visual Quota Metric Cards (when quotaDetails exists) */}
                {noticeModal.quotaDetails && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] font-black uppercase text-emerald-800 block">
                          Total Quota
                        </span>
                        <strong className="text-sm sm:text-base font-black text-emerald-950">
                          {noticeModal.quotaDetails.totalQuotaQtl.toFixed(1)} Qtl
                        </strong>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                        <span className="text-[10px] font-black uppercase text-amber-800 block">
                          Active Booked
                        </span>
                        <strong className="text-sm sm:text-base font-black text-amber-950">
                          {noticeModal.quotaDetails.activeBookedQtl.toFixed(1)} Qtl
                        </strong>
                      </div>

                      <div className={`p-3 rounded-2xl border ${
                        noticeModal.quotaDetails.remainingQuotaQtl > 0
                          ? "bg-blue-50 border-blue-200"
                          : "bg-red-50 border-red-200"
                      }`}>
                        <span className={`text-[10px] font-black uppercase block ${
                          noticeModal.quotaDetails.remainingQuotaQtl > 0 ? "text-blue-800" : "text-red-800"
                        }`}>
                          Available Now
                        </span>
                        <strong className={`text-sm sm:text-base font-black ${
                          noticeModal.quotaDetails.remainingQuotaQtl > 0 ? "text-blue-950" : "text-red-950"
                        }`}>
                          {noticeModal.quotaDetails.remainingQuotaQtl.toFixed(1)} Qtl
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {/* Option 1: 1-Tap Adjust to Remaining Quota (if positive remaining quota exists) */}
                  {noticeModal.quotaDetails &&
                    noticeModal.quotaDetails.remainingQuotaQtl > 0 &&
                    noticeModal.quotaDetails.maxAllowedPackages > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPkg = noticeModal.quotaDetails!.maxAllowedPackages;
                          setPackageCount(newPkg);
                          setNoticeModal({ isOpen: false, title: "", message: "" });
                          showToast(`Adjusted quantity to ${newPkg} ${unitLabel} (${noticeModal.quotaDetails!.remainingQuotaQtl.toFixed(1)} Qtl)`);
                        }}
                        className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <span>⚡ Adjust to Remaining {noticeModal.quotaDetails.remainingQuotaQtl.toFixed(1)} Qtl ({noticeModal.quotaDetails.maxAllowedPackages} {unitLabel})</span>
                      </button>
                    )}

                  {/* Option 2: For Same-Day Conflict, Button to Change Date */}
                  {noticeModal.errorType === "SAME_DAY_CONFLICT" && (
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeModal({ isOpen: false, title: "", message: "" });
                        setStep(3);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <span>📅 Select a Different Date</span>
                    </button>
                  )}

                  {/* Option 3: View Active Tokens (if limit exceeded or quota exhausted) */}
                  {(noticeModal.errorType === "ACTIVE_SLOT_LIMIT_EXCEEDED" ||
                    (noticeModal.quotaDetails && noticeModal.quotaDetails.remainingQuotaQtl <= 0) ||
                    noticeModal.errorType === "SAME_DAY_CONFLICT") && (
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeModal({ isOpen: false, title: "", message: "" });
                        router.push("/farmer/dashboard");
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-[#0d4f3c] hover:bg-[#12684f] active:bg-[#073628] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <span>📋 View & Manage Active Tokens</span>
                    </button>
                  )}

                  {/* Option 4: Close / Dismiss */}
                  <button
                    type="button"
                    onClick={() => setNoticeModal({ isOpen: false, title: "", message: "" })}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                  >
                    Dismiss Notice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ClientPortal>
      )}
    </div>
  );
}

export default function BookSlotPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-white font-bold">{t("loadingBooking") || "Loading..."}</div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
