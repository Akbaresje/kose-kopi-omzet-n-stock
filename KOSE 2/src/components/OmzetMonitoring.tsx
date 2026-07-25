"use client";

import React, { useState } from "react";
import { OmzetRecord, ActiveRole } from "@/types";
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from "recharts";
import { 
  TrendingUp, DollarSign, Coffee, Calendar, PlusCircle, FileText, CheckCircle2, Award, Sparkles, Settings, X, Trash2 
} from "lucide-react";

interface Props {
  omzetRecords: OmzetRecord[];
  role: ActiveRole;
  monthlyTarget: number;
  onOpenAddModal: () => void;
  onUpdateTarget: (newTarget: number) => void;
  onRefresh?: () => void;
}

export function OmzetMonitoring({ omzetRecords, role, monthlyTarget, onOpenAddModal, onUpdateTarget, onRefresh }: Props) {
  const [chartMode, setChartMode] = useState<"MONTHLY" | "DAILY">("MONTHLY");
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editTarget, setEditTarget] = useState<number>(monthlyTarget);
  const [selectedMonth, setSelectedMonth] = useState<string>("Apr 2026");
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Format ke Rupiah
  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const formatShortRp = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}M`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)} Jt`;
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)} Rb`;
    return `Rp ${val}`;
  };

  // Agregasi Data Bulanan
  const monthlyMap: Record<string, { monthYear: string; revenue: number; cupsSold: number }> = {};
  
  omzetRecords.forEach((item) => {
    if (!monthlyMap[item.monthYear]) {
      monthlyMap[item.monthYear] = { monthYear: item.monthYear, revenue: 0, cupsSold: 0 };
    }
    monthlyMap[item.monthYear].revenue += item.revenue;
    monthlyMap[item.monthYear].cupsSold += item.cupsSold;
  });

  const monthlyChartData = Object.values(monthlyMap);
  
  const uniqueMonths: string[] = [];
  omzetRecords.forEach(r => {
    if (!uniqueMonths.includes(r.monthYear)) {
      uniqueMonths.push(r.monthYear);
    }
  });
  const availableMonths = uniqueMonths.length > 0 ? uniqueMonths : ["Apr 2026"];
  const currentMonthLabel = availableMonths.includes(selectedMonth) ? selectedMonth : (availableMonths[availableMonths.length - 1] || "Apr 2026");

  // Data Harian untuk bulan yang dipilih (review omzet bulan sebelumnya maupun bulan berjalan)
  const dailyMonthData = omzetRecords
    .filter(r => r.monthYear === currentMonthLabel)
    .map(r => {
      const parts = r.date.split("-");
      const shortMonth = currentMonthLabel.split(" ")[0];
      const dayLabel = parts.length === 3 ? `${parts[2]} ${shortMonth}` : r.date;
      return {
        day: dayLabel,
        date: r.date,
        revenue: r.revenue,
        cupsSold: r.cupsSold,
        notes: r.notes || "-"
      };
    });

  const currentMonthData = monthlyMap[currentMonthLabel] || { monthYear: currentMonthLabel, revenue: 0, cupsSold: 0 };
  const daysCount = dailyMonthData.length > 0 ? dailyMonthData.length : 1;
  const avgDailyRevenue = currentMonthData.revenue / daysCount;
  const progressPercent = Math.min(100, Math.round((currentMonthData.revenue / monthlyTarget) * 100));

  const highestDay = dailyMonthData.reduce((max, curr) => curr.revenue > max.revenue ? curr : max, { day: "-", revenue: 0, cupsSold: 0, date: "-" });

  const handleResetMonth = async (monthYear: string) => {
    if (!confirm(`⚠️ Apakah Anda yakin ingin mereset/menghapus semua catatan omzet untuk bulan ${monthYear}?`)) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_MONTHLY_OMZET",
          payload: { monthYear }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        if (onRefresh) onRefresh();
        alert(`✅ ${data.message}`);
      } else {
        alert("Gagal mereset: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveTarget = async () => {
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SETTING",
          payload: { settingKey: "MONTHLY_OMZET_TARGET", settingValue: String(editTarget) }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        onUpdateTarget(editTarget);
        setShowTargetModal(false);
      } else {
        alert("Gagal: " + data.message);
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/90 border border-stone-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 block mb-1">
            Finansial & Penjualan Kafe
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
            Monitoring Omzet KOSE
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Pantau arus pemasukan harian dan tren omzet dari masa ke masa.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Month Selector for Reviewing Previous Months */}
          <select
            value={currentMonthLabel}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-stone-950 border border-stone-700/80 text-amber-400 text-xs sm:text-sm font-extrabold px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
            title="Pilih bulan untuk melihat riwayat dan grafik omzet"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m} className="bg-stone-900 text-white">📅 {m}</option>
            ))}
          </select>

          <button
            onClick={() => handleResetMonth(currentMonthLabel)}
            disabled={isResetting || currentMonthData.revenue === 0}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-rose-500/20 text-stone-300 hover:text-rose-400 font-semibold px-3 py-2.5 rounded-xl transition-all text-xs border border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title={`Reset / hapus data omzet bulan ${currentMonthLabel}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset {currentMonthLabel}</span>
          </button>

          <button
            onClick={() => { setEditTarget(monthlyTarget); setShowTargetModal(true); }}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold px-3 py-2.5 rounded-xl transition-all text-xs border border-stone-700 shrink-0"
            title="Ubah target omzet bulanan"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Target</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-sm active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-stone-950" />
            <span>+ Omzet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Bulan Ini */}
        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 sm:p-5 hover:border-stone-700/80 transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider">Omzet {currentMonthLabel}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {formatShortRp(currentMonthData.revenue)}
          </div>
          <p className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
            <span>Total terkumpul</span>
            <span className="text-emerald-400 font-medium">{currentMonthData.cupsSold} cup</span>
          </p>
        </div>

        {/* Card 2: Total Cup Terjual */}
        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 sm:p-5 hover:border-stone-700/80 transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Cup Terjual</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Coffee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {currentMonthData.cupsSold.toLocaleString("id-ID")} <span className="text-sm font-normal text-stone-400">Cup</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
            <span>Rata-rata {Math.round(currentMonthData.cupsSold / daysCount)} cup/hari</span>
          </p>
        </div>

        {/* Card 3: Rata-rata Harian */}
        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 sm:p-5 hover:border-stone-700/80 transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider">Rata-Rata Harian</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {formatShortRp(avgDailyRevenue)}
          </div>
          <p className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
            <span>Dari {daysCount} hari</span>
            <span className="text-stone-400">Stabil</span>
          </p>
        </div>

        {/* Card 4: Target Bulan Ini */}
        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 sm:p-5 hover:border-stone-700/80 transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Target {currentMonthLabel}</span>
            <button
              onClick={() => { setEditTarget(monthlyTarget); setShowTargetModal(true); }}
              className="text-amber-400 hover:text-amber-300 transition-colors"
              title="Ubah target"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-lg font-bold text-white tracking-tight mb-3 flex items-baseline justify-between">
            <span>{formatShortRp(currentMonthData.revenue)}</span>
            <span className="text-[11px] text-stone-400 font-normal">/ {formatShortRp(monthlyTarget)}</span>
          </div>
          <div className="w-full bg-stone-800/80 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-2.5 flex items-center justify-between">
            <span>Sisa: {formatShortRp(Math.max(0, monthlyTarget - currentMonthData.revenue))}</span>
            <span className="text-amber-400/90 font-medium">{progressPercent}%</span>
          </p>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <span>{chartMode === "MONTHLY" ? "Tren Omzet Bulanan" : "Grafik Omzet Harian (April)"}</span>
            </h3>
            <p className="text-stone-400 text-xs mt-1">
              {chartMode === "MONTHLY" ? "Total akumulasi omzet bersih setiap bulannya" : "Pergerakan pemasukan dari hari ke hari"}
            </p>
          </div>

          <div className="flex items-center p-1 bg-stone-950 rounded-xl border border-stone-800/80">
            <button
              onClick={() => setChartMode("MONTHLY")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartMode === "MONTHLY" ? "bg-stone-800 text-white font-bold shadow-sm" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setChartMode("DAILY")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartMode === "DAILY" ? "bg-stone-800 text-white font-bold shadow-sm" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Harian
            </button>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-[280px] sm:h-[320px] w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === "MONTHLY" ? (
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis dataKey="monthYear" stroke="#a8a29e" fontSize={11} tickLine={false} axisLine={{ stroke: "#44403c" }} />
                <YAxis stroke="#a8a29e" fontSize={11} tickFormatter={(value) => `${value / 1000000}Jt`} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1c1917", borderColor: "#44403c", borderRadius: "0.75rem", color: "#f5f5f4", padding: "10px 14px" }} formatter={(value: any) => [formatRp(Number(value)), "Total Omzet"]} labelStyle={{ fontWeight: "bold", marginBottom: "4px" }} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Omzet (Rp)" barSize={48} />
              </BarChart>
            ) : (
              <AreaChart data={dailyMonthData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis dataKey="day" stroke="#a8a29e" fontSize={10} tickLine={false} axisLine={{ stroke: "#44403c" }} />
                <YAxis stroke="#a8a29e" fontSize={10} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}Jt`} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1c1917", borderColor: "#44403c", borderRadius: "0.75rem", color: "#f5f5f4", padding: "10px 14px" }} formatter={(value: any) => [formatRp(Number(value)), "Pemasukan"]} labelFormatter={(label) => `Tanggal: ${label} 2026`} labelStyle={{ fontWeight: "bold", marginBottom: "4px" }} />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-stone-800/80">
          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 uppercase block">Omzet Tertinggi ({currentMonthLabel})</span>
              <span className="text-sm font-bold text-white truncate block">{formatRp(highestDay.revenue)}</span>
              <span className="text-[10px] text-stone-400">{highestDay.date}</span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 uppercase block">Cup Terbanyak Harian</span>
              <span className="text-sm font-bold text-white truncate block">{highestDay.cupsSold} Porsi</span>
              <span className="text-[10px] text-stone-400">Jam sibuk kafe</span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 uppercase block">Status Pertumbuhan</span>
              <span className="text-sm font-bold text-emerald-400 truncate block">Sangat Positif</span>
              <span className="text-[10px] text-stone-400">Konsisten naik</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table: Riwayat Omzet Harian */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <span>Riwayat Catatan Omzet ({currentMonthLabel})</span>
            </h3>
            <p className="text-stone-400 text-xs mt-1">Daftar rekapitulasi pemasukan bersih dan observasi situasi kafe untuk bulan {currentMonthLabel}</p>
          </div>
          <span className="text-xs bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 text-stone-400 font-medium self-start sm:self-center">
            {dailyMonthData.length} catatan
          </span>
        </div>

        {dailyMonthData.length === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <p className="text-sm font-semibold">Belum ada catatan omzet untuk bulan {currentMonthLabel}.</p>
            <p className="text-xs text-stone-500 mt-1">Klik tombol &apos;+ Omzet&apos; untuk mulai mencatat pemasukan baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 text-[11px] font-semibold uppercase tracking-wider bg-stone-950/50">
                  <th className="py-3.5 px-4 sm:py-4 sm:px-5 rounded-l-xl">Tanggal</th>
                  <th className="py-3.5 px-4 sm:py-4 sm:px-5">Omzet Bersih</th>
                  <th className="py-3.5 px-4 sm:py-4 sm:px-5">Total Cup</th>
                  <th className="py-3.5 px-4 sm:py-4 sm:px-5 rounded-r-xl">Catatan Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-sm font-normal">
                {dailyMonthData.slice().reverse().map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/30 transition-colors group">
                    <td className="py-3.5 px-4 sm:py-4 sm:px-5 font-semibold text-white whitespace-nowrap group-hover:text-amber-400 transition-colors text-xs sm:text-sm">
                      {row.date}
                    </td>
                    <td className="py-3.5 px-4 sm:py-4 sm:px-5 font-bold text-amber-400 text-sm sm:text-base">
                      {formatRp(row.revenue)}
                    </td>
                    <td className="py-3.5 px-4 sm:py-4 sm:px-5 text-stone-300">
                      <span className="bg-stone-950 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium border border-stone-800">{row.cupsSold} porsi</span>
                    </td>
                    <td className="py-3.5 px-4 sm:py-4 sm:px-5 text-stone-300 text-xs max-w-xs truncate">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EDIT TARGET OMZET */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
                  <Settings className="w-5 h-5 text-amber-500" />
                  <span>Atur Target Omzet Bulanan</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Masukkan target omzet yang ingin dicapai bulan ini.</p>
              </div>
              <button onClick={() => setShowTargetModal(false)} className="w-8 h-8 rounded-lg bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">Target Omzet (Rp)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-base">Rp</span>
                <input
                  type="number"
                  min="1000000"
                  step="1000000"
                  value={editTarget}
                  onChange={(e) => setEditTarget(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-11 pr-4 py-3.5 text-white font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-stone-400 mt-2">
                💡 Target saat ini: <span className="text-amber-400 font-bold">{formatRp(monthlyTarget)}</span>
              </p>
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
              <button onClick={() => setShowTargetModal(false)} className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors">
                Batal
              </button>
              <button onClick={handleSaveTarget} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-stone-950" />
                <span>Simpan Target</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
