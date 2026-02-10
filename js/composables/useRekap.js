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

const useRekap = () => {
    const { ref, computed } = Vue;

    // State
    const rekapMonth = ref(new Date().getMonth());
    const rekapYear = ref(new Date().getFullYear());
    const rekapKelas = ref('');
    const rekapGender = ref(''); // '' | 'L' | 'P'

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
        let santris = window.allData.filter(d => d.__type === 'santri' && d._deleted !== true && d._deleted !== 'true');
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
            // Handle various date formats if necessary, but standard is YYYY-MM-DD
            const d = new Date(dateStr);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        // Get All Relevant Data Only Once
        const allSetoran = window.allData.filter(d => d.__type === 'setoran');
        const allUjian = window.allData.filter(d => d.__type === 'ujian');

        const filteredSetoran = allSetoran.filter(d => isMatch(d.setoran_date));
        const filteredUjian = allUjian.filter(d => isMatch(d.date));
        const allPelanggaran = window.allData.filter(d => d.__type === 'pelanggaran' && isMatch(d.date));

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

            // --- C. SCORING FORMULA ---

            // 1. Sabaq Score (50%) -> Cap at 100? No, "jangan batasi"
            const scoreSabaqRaw = targetSabaq > 0 ? (actualSabaq / targetSabaq) * 100 : 0;
            const scoreSabaqWeighted = scoreSabaqRaw * 0.5;

            // 2. Manzil Score (30%)
            const scoreManzilRaw = targetManzil > 0 ? (actualManzil / targetManzil) * 100 : 0;
            const scoreManzilWeighted = scoreManzilRaw * 0.3;

            // 3. Ujian Score (20%)
            const scoreUjianWeighted = avgUjian * 0.2;

            // Subtotal
            let finalScore = scoreSabaqWeighted + scoreManzilWeighted + scoreUjianWeighted;

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
                sabaq_act: parseFloat(actualSabaq.toFixed(1)),
                sabaq_tgt: targetSabaq,

                // Manzil
                manzil_act: parseFloat(actualManzil.toFixed(1)),
                manzil_tgt: targetManzil,

                // Ujian
                ujian_avg: parseFloat(avgUjian.toFixed(1)),

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

        // Table
        const headers = [['No', 'Nama Santri', 'Sabaq (Act/Tgt)', 'Manzil (Act/Tgt)', 'Ujian', 'Pelanggaran', 'Nilai', 'Predikat']];
        const data = rekapHafalanData.value.map((row, i) => [
            i + 1,
            row.nama,
            `${row.sabaq_act} / ${row.sabaq_tgt}`,
            `${row.manzil_act} / ${row.manzil_tgt}`,
            row.ujian_avg,
            row.pelanggaran_poin > 0 ? `-${row.pelanggaran_poin}` : '0',
            row.nilai_akhir,
            row.predikat
        ]);

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

        const data = rekapHafalanData.value.map((row, i) => ({
            "No": i + 1,
            "Nama Santri": row.nama,
            "Kelas": row.kelas,
            "Sabaq (Hal)": row.sabaq_act,
            "Target Sabaq": row.sabaq_tgt,
            "Manzil (Hal)": row.manzil_act,
            "Target Manzil": row.manzil_tgt,
            "Rata-rata Ujian": row.ujian_avg,
            "Poin Pelanggaran": row.pelanggaran_poin,
            "Nilai Akhir": row.nilai_akhir,
            "Predikat": row.predikat
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Prestasi");
        XLSX.writeFile(wb, `Rekap_Prestasi_${monthNames[rekapMonth.value]}_${rekapYear.value}.xlsx`);
    };

    return {
        rekapMonth, rekapYear, rekapKelas, rekapGender,
        monthNames, rekapHafalanData,
        exportToPDF, exportToExcel
    };
};
