"use client";

import React, { useState } from "react";
import { PlusCircle, DollarSign, Package, CheckCircle } from "lucide-react";

interface AddOmzetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddOmzetModal({ isOpen, onClose, onSuccess }: AddOmzetModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(todayStr);
  const [revenue, setRevenue] = useState<string>("3250000");
  const [cupsSold, setCupsSold] = useState<string>("135");
  const [notes, setNotes] = useState<string>("Penjualan stabil - shift reguler");
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const revNum = Number(revenue);
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_OMZET",
          payload: {
            date,
            revenue: revNum,
            cupsSold: Number(cupsSold),
            kopiRevenue: 0, // Tidak lagi dipisahkan
            nonKopiRevenue: 0, // Tidak lagi dipisahkan
            notes
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        onSuccess();
        onClose();
      } else {
        alert("Gagal: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span>Catat Omzet Harian</span>
            </h3>
            <p className="text-stone-400 text-xs mt-0.5">
              Masukkan total pemasukan dan jumlah cup terjual hari ini.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
              Total Pemasukan / Omzet (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-base">Rp</span>
              <input
                type="number"
                min="0"
                step="5000"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                required
                placeholder="2500000"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-11 pr-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
              Total Cup / Porsi Terjual
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={cupsSold}
                onChange={(e) => setCupsSold(e.target.value)}
                required
                placeholder="100"
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white font-bold text-base focus:outline-none focus:border-amber-500 transition-colors"
              />
              <span className="bg-stone-950 px-4 py-3 rounded-xl text-stone-400 text-xs font-bold border border-stone-800">
                Cup / Porsi
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
              Catatan Kasir / Observasi Shift (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Sangat ramai saat sore, banyak pesanan dine-in & takeaway..."
              rows={3}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <CheckCircle className="w-4 h-4 text-stone-950" />
              <span>{loading ? "Menyimpan..." : "Simpan Data Kasir"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddNewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddNewItemModal({ isOpen, onClose, onSuccess }: AddNewItemModalProps) {
  const [name, setName] = useState<string>("");
  const [category, setCategory] = useState<string>("KOPI");
  const [unit, setUnit] = useState<string>("Pack");
  const [gudangStock, setGudangStock] = useState<string>("10");
  const [barStock, setBarStock] = useState<string>("5");
  const [pricePerUnit, setPricePerUnit] = useState<string>("120000");
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_NEW_ITEM",
          payload: {
            name,
            category,
            unit,
            gudangStock: Number(gudangStock),
            barStock: Number(barStock),
            pricePerUnit: Number(pricePerUnit),
            minBarStock: unit === "Botol" ? 2 : unit === "Pcs" ? 2 : 3
          }
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setName("");
        onSuccess();
        onClose();
      } else {
        alert("Gagal: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-serif">
              <Package className="w-5 h-5 text-amber-500" />
              <span>Tambah Bahan Baku Baru</span>
            </h3>
            <p className="text-stone-400 text-xs mt-0.5">
              Daftarkan varian bahan baru ke dalam sistem KOSE.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
              Nama Bahan Baku
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Arabica Kintamani / Sirup Peach"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value === "SIRUP") setUnit("Botol");
                  else if (e.target.value === "CUP" && name.toLowerCase().includes("sealer")) setUnit("Pcs");
                  else setUnit("Pack");
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="KOPI">☕ KOPI</option>
                <option value="POWDER">🍫 POWDER</option>
                <option value="CUP">🥤 CUP & KEMASAN</option>
                <option value="SIRUP">🧪 SIRUP</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                Satuan Kemasan
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="Pack">Pack / Bks</option>
                <option value="Botol">Botol</option>
                <option value="Pcs">Pcs / Roll</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Kaleng">Kaleng</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                Stok Awal Gudang
              </label>
              <input
                type="number"
                min="0"
                value={gudangStock}
                onChange={(e) => setGudangStock(e.target.value)}
                required
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
                Stok Awal di Bar
              </label>
              <input
                type="number"
                min="0"
                value={barStock}
                onChange={(e) => setBarStock(e.target.value)}
                required
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-1.5">
              Estimasi Harga Pembelian (Rp / unit)
            </label>
            <input
              type="number"
              min="0"
              step="5000"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              required
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-stone-950" />
              <span>{loading ? "Menambahkan..." : "Tambah ke Stok"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
