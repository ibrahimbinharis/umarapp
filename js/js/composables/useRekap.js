/**
 * useRekap Composable
 * 
 * Manages Rekap (Summary) data and operations
 * - Calculates weighted score from Sabaq (50%), Manzil (30%), Ujian (20%)
 * - Deducts Pelanggaran points
 * - Generates reports for PDF and Excel
 * 
 * Dependencies: window.allData (from core.js)
 */

const useRekap = (uiData, userSession) => { // Accept uiData and userSession
    const { ref, computed, watch } = Vue;

    // State
    const rekapMonth = ref(new Date().getMonth());
    const rekapYear = ref(new Date().getFullYear());
    const rekapKelas = ref('');
    const rekapGender = ref(''); // '' | 'L' | 'P'

    // Default Settings
    const defaultSettings = {
        _id: 'rekap_config',
        __type: 'settings',
        weights: {
            sabaq: 50,
            manzil: 30,
            ujian: 20,
            tilawah: 0
        },
        visibility: {
            sabaq: true,
            manzil: true,
            ujian: true,
            tilawah: false
        }
    };

    // Load initial settings from DB or use default
    const loadSettings = () => {
        const stored = (uiData.settings || []).find(s => s._id === 'rekap_config');
        if (stored) {
            // Merge with defaults for safety (in case new fields are added)
            return {
                ...defaultSettings,
                ...stored,
                weights: { ...defaultSettings.weights, ...stored.weights },
                visibility: { ...defaultSettings.visibility, ...stored.visibility }
            };
        }
        return JSON.parse(JSON.stringify(defaultSettings));
    };

    const rekapSettings = Vue.reactive(loadSettings());

    // Watch for changes in uiData.settings to sync rekapSettings (e.g. after cloud sync)
    watch(() => uiData.settings, () => {
        const fresh = loadSettings();
        Object.assign(rekapSettings, fresh);
    }, { deep: true });

    const saveSettings = async () => {
        try {
            const payload = JSON.parse(JSON.stringify(rekapSettings));
            const existing = (uiData.settings || []).find(s => s._id === 'rekap_config');

            if (existing) {
                await DB.update('rekap_config', payload);
            } else {
                await DB.create('settings', payload);
            }

            // Reload local data
            if (window.refreshData) window.refreshData();
            alert("Pengaturan Berhasil Disimpan");
            return true;
        } catch (e) {
            console.error("Save Settings Error", e);
            alert("Gagal menyimpan pengaturan: " + e.message);
            return false;
        }
    };

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    /**
     * Compute Main Rekap Data
     * Formula: (SabaqSco * 0.5) + (ManzilSco * 0.3) + (UjianSco * 0.2) - Pelanggaran
     */
    const rekapHafalanData = computed(() => {
        // 1. Filter Santri by Kelas & Gender (and exclude deleted)
        // Use uiData.santri which is already filtered in loadData()
        let santris = uiData.santri || [];

        if (rekapKelas.value) {
            santris = santris.filter(s => s.kelas === rekapKelas.value);
        }
        if (rekapGender.value) {
            santris = santris.filter(s => s.gender === rekapGender.value);
        }

        // 2. Prepare Data Source for Selected Month/Year
        const currentMonth = rekapMonth.value;
        const currentYear = rekapYear.value;

        // Helper: Check Date Match
        const isMatch = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        // Get All Relevant Data from uiData (already filtered in loadData)
        const filteredSetoran = (uiData.setoran || []).filter(d => isMatch(d.setoran_date));
        const filteredUjian = (uiData.ujian || []).filter(d => isMatch(d.date));
        const allPelanggaran = (uiData.pelanggaran || []).filter(d => isMatch(d.date));

        // 3. Map Data per Santri
        return santris.map(s => {
            // --- A. TARGET CALCULATION ---
            // Sabaq Target (Default 20)
            const targetSabaq = parseInt(s.target_sabaq) || 20;

            // Manzil Target: (Total Juz * 20) * (Pct / 100)
            // Min: 20 Pages (1 Juz)
            let totalJuz = 0;
            if (s.hafalan_manual) {
                const match = s.hafalan_manual.match(/(\d+)/);
                if (match) totalJuz = parseInt(match[1]);
            }
            const manzilPct = parseInt(s.target_manzil_pct) || 20;
            let calcTargetManzil = (totalJuz * 20) * (manzilPct / 100);

            // Enforce Minimum Rule: Max(Calculated, 20)
            // User requirement: "jika target manzil kurang dari 20 halaman/1juz maka buat menjadi 20 halaman/1juz"
            const targetManzil = Math.max(20, Math.round(calcTargetManzil));

            // --- B. ACTUAL ACHIEVEMENT ---

            // Sabaq Actual
            // MATCHING: Try both s._id (UUID) and s.santri_id (NIS) if needed.
            // Based on useSetoran.js, setoran stores 'santri_id'. 
            // Often setoran.santri_id refers to Santri._id (UUID).

            const mySabaq = filteredSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id); // Try loose match
            const actualSabaq = mySabaq.filter(x => x.setoran_type === 'Sabaq').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

            // Manzil Actual (Manzil + Sabqi + Robt ? Usually Manzil is specific type)
            // Assuming 'Manzil' type setoran is primary.
            const myManzil = filteredSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
            const actualManzil = myManzil.filter(x => x.setoran_type === 'Manzil').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);

            // Ujian Actual (Bulanan Only)
            const myUjian = filteredUjian.filter(x =>
                (x.santri_id === s._id || x.santri_id === s.santri_id) &&
                (x.type === 'Ujian Al-Quran' || x.type === 'Ujian Pelajaran') // Exclude Semester
            );

            let avgUjian = 0;
            if (myUjian.length > 0) {
                const totalScore = myUjian.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
                avgUjian = totalScore / myUjian.length;
            }

            // Pelanggaran Points
            const myPelanggaran = allPelanggaran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
            const totalPointsPelanggaran = myPelanggaran.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);


            // --- C. SCORING FORMULA (DYNAMIC) ---
            const { weights, visibility } = rekapSettings;

            // 1. Sabaq Score
            let scoreSabaqWeighted = 0;
            if (visibility.sabaq) {
                const scoreSabaqRaw = targetSabaq > 0 ? (actualSabaq / targetSabaq) * 100 : 0;
                scoreSabaqWeighted = scoreSabaqRaw * (weights.sabaq / 100);
            }

            // 2. Manzil Score
            let scoreManzilWeighted = 0;
            if (visibility.manzil) {
                const scoreManzilRaw = targetManzil > 0 ? (actualManzil / targetManzil) * 100 : 0;
                scoreManzilWeighted = scoreManzilRaw * (weights.manzil / 100);
            }

            // 3. Ujian Score
            let scoreUjianWeighted = 0;
            if (visibility.ujian) {
                scoreUjianWeighted = avgUjian * (weights.ujian / 100);
            }

            // 4. Tilawah Score (New)
            let scoreTilawahWeighted = 0;
            const myTilawah = filteredSetoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id);
            const actualTilawah = myTilawah.filter(x => x.setoran_type === 'Tilawah').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0);
            const targetTilawah = s.target_tilawah || 600;

            if (visibility.tilawah) {
                const scoreTilawahRaw = (actualTilawah / targetTilawah) * 100;
                scoreTilawahWeighted = scoreTilawahRaw * (weights.tilawah / 100);
            }

            // Subtotal
            let finalScore = scoreSabaqWeighted + scoreManzilWeighted + scoreUjianWeighted + scoreTilawahWeighted;

            // 4. Deduct Pelanggaran
            finalScore -= totalPointsPelanggaran;

            // Rounding
            finalScore = Math.round(finalScore * 10) / 10; // 1 decimal

            // Predikat using Setoran/Ujian Grade Logic
            let predikat = 'C';
            if (finalScore >= 95) predikat = 'A+';
            else if (finalScore >= 85) predikat = 'A';
            else if (finalScore >= 75) predikat = 'B+';
            else if (finalScore >= 65) predikat = 'B';
            else if (finalScore >= 60) predikat = 'B-';

            return {
                id: s._id,
                nama: s.full_name,
                kelas: s.kelas,

                // Sabaq
                show_sabaq: visibility.sabaq,
                sabaq_act: parseFloat(actualSabaq.toFixed(1)),
                sabaq_tgt: targetSabaq,

                // Manzil
                show_manzil: visibility.manzil,
                manzil_act: parseFloat(actualManzil.toFixed(1)),
                manzil_tgt: targetManzil,

                // Ujian
                show_ujian: visibility.ujian,
                ujian_avg: parseFloat(avgUjian.toFixed(1)),

                // Tilawah
                show_tilawah: visibility.tilawah,
                tilawah_act: parseFloat(actualTilawah.toFixed(1)),
                tilawah_tgt: targetTilawah,

                // Pelanggaran
                pelanggaran_poin: totalPointsPelanggaran,

                // Final
                nilai_akhir: finalScore,
                predikat: predikat
            };
        }).sort((a, b) => b.nilai_akhir - a.nilai_akhir); // Sort by highest score
    });

    const exportToPDF = () => {
        if (!window.jspdf) {
            alert("Library PDF belum dimuat. Coba refresh halaman.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(16);
        doc.text("Laporan Perkembangan Santri", 105, 15, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Periode: ${monthNames[rekapMonth.value]} ${rekapYear.value}`, 105, 22, { align: "center" });

        if (rekapKelas.value) {
            doc.text(`Kelas: ${rekapKelas.value}`, 105, 29, { align: "center" });
        }

        // Table Headers
        const headerRow = ['No', 'Nama Santri'];
        const { visibility } = rekapSettings;

        if (visibility.sabaq) headerRow.push('Sabaq (Act/Tgt)');
        if (visibility.manzil) headerRow.push('Manzil (Act/Tgt)');
        if (visibility.ujian) headerRow.push('Ujian');
        if (visibility.tilawah) headerRow.push('Tilawah (Act/Tgt)');

        headerRow.push('Pelanggaran', 'Nilai', 'Predikat');
        const headers = [headerRow];

        // Table Data
        const data = rekapHafalanData.value.map((row, i) => {
            const dataRow = [i + 1, row.nama];
            if (visibility.sabaq) dataRow.push(`${row.sabaq_act} / ${row.sabaq_tgt}`);
            if (visibility.manzil) dataRow.push(`${row.manzil_act} / ${row.manzil_tgt}`);
            if (visibility.ujian) dataRow.push(row.ujian_avg);
            if (visibility.tilawah) dataRow.push(`${row.tilawah_act} / ${row.tilawah_tgt}`);

            dataRow.push(
                row.pelanggaran_poin > 0 ? `-${row.pelanggaran_poin}` : '0',
                row.nilai_akhir,
                row.predikat
            );
            return dataRow;
        });

        doc.autoTable({
            head: headers,
            body: data,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74] } // Green-600
        });

        doc.save(`Rekap_Prestasi_${monthNames[rekapMonth.value]}_${rekapYear.value}.pdf`);
    };

    const exportToExcel = () => {
        if (!window.XLSX) {
            alert("Library Excel belum dimuat.");
            return;
        }

        const { visibility } = rekapSettings;
        const data = rekapHafalanData.value.map((row, i) => {
            const item = {
                "No": i + 1,
                "Nama Santri": row.nama,
                "Kelas": row.kelas
            };

            if (visibility.sabaq) {
                item["Sabaq (Hal)"] = row.sabaq_act;
                item["Target Sabaq"] = row.sabaq_tgt;
            }
            if (visibility.manzil) {
                item["Manzil (Hal)"] = row.manzil_act;
                item["Target Manzil"] = row.manzil_tgt;
            }
            if (visibility.ujian) {
                item["Rata-rata Ujian"] = row.ujian_avg;
            }
            if (visibility.tilawah) {
                item["Tilawah (Hal)"] = row.tilawah_act;
                item["Target Tilawah"] = row.tilawah_tgt;
            }

            item["Poin Pelanggaran"] = row.pelanggaran_poin;
            item["Nilai Akhir"] = row.nilai_akhir;
            item["Predikat"] = row.predikat;

            return item;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Prestasi");
        XLSX.writeFile(wb, `Rekap_Prestasi_${monthNames[rekapMonth.value]}_${rekapYear.value}.xlsx`);
    };

    return {
        rekapMonth, rekapYear, rekapKelas, rekapGender,
        monthNames, rekapHafalanData, rekapSettings,
        saveSettings,
        exportToPDF, exportToExcel
    };
};
