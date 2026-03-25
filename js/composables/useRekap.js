/**
 * useRekap Composable
 * 
 * Manages Rekap (Summary) data and operations
 * - Delegates calculations to useAnalytics
 * - Generates reports for PDF and Excel
 */

const useRekap = (uiData, userSession) => {
    const { ref, computed, watch, reactive } = Vue;

    // Initialize Shared Analytics
    const analytics = useAnalytics(uiData, userSession);

    // --- Helper: Terbilang (Number to Words Indonesia) ---
    const terbilang = (n) => {
        if (n < 0 || n > 100) return "";
        const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
        let res = "";
        if (n < 12) res = words[n];
        else if (n < 20) res = terbilang(n - 10) + " Belas";
        else if (n < 100) res = terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
        else if (n === 100) res = "Seratus";
        return res.trim();
    };

    // State
    // State - Default to This Month
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const toYMD = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateShort = (ymd) => {
        if (!ymd) return '';
        const [y, m, d] = ymd.split('-');
        return `${d}/${m}/${y}`;
    };

    const rekapStartDate = ref(toYMD(defaultStart));
    const rekapEndDate = ref(toYMD(now));

    const rekapKelas = ref('');
    const rekapGender = ref(''); // '' | 'L' | 'P'
    const rekapSearch = ref('');
    const rekapSantriId = ref('');
    const rekapSortLimit = ref('all'); // 'all' | 'top10' | 'bottom10'
    const rekapSortCategory = ref('nilai_akhir'); // 'nilai_akhir' | 'sabaq' | 'sabqi' | 'manzil' | 'ujian' | 'pelanggaran'
    const isRekapSantriDropdownOpen = ref(false);

    // --- Range Shortcut Helpers ---
    const setRangeRealtime = () => {
        const d = new Date();
        rekapStartDate.value = toYMD(d);
        rekapEndDate.value = toYMD(d);
    };

    const setRangeKemarin = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const ymd = toYMD(d);
        rekapStartDate.value = ymd;
        rekapEndDate.value = ymd;
    };

    const setRange7Hari = () => {
        const d = new Date();
        const end = toYMD(d);
        d.setDate(d.getDate() - 7);
        rekapStartDate.value = toYMD(d);
        rekapEndDate.value = end;
    };

    const setRange30Hari = () => {
        const d = new Date();
        const end = toYMD(d);
        d.setDate(d.getDate() - 30);
        rekapStartDate.value = toYMD(d);
        rekapEndDate.value = end;
    };

    const setRangeBulanIni = () => {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        rekapStartDate.value = toYMD(start);
        rekapEndDate.value = toYMD(d);
    };

    const setRangeSemua = () => {
        rekapStartDate.value = '';
        rekapEndDate.value = '';
    };

    // Sync with User Context
    watch(userSession, (newVal) => {
        if (newVal && newVal.role === 'santri') {
            rekapSantriId.value = newVal.username || newVal.child_id || '';
        }
        // v36: For 'wali', we don't auto-filter by username because username is the Wali's ID, not the Santri's.
        // The loadData in app_vue already filters uiData.santri for Wali.
    }, { immediate: true });

    // Settings
    const rekapSettings = reactive(analytics.getScoringSettings());

    // Watch for global settings change
    watch(() => uiData.settings, () => {
        const fresh = analytics.getScoringSettings();
        Object.assign(rekapSettings, fresh);
    }, { deep: true });

    const saveSettings = async () => {
        try {
            await DB.updateOrInsert({ _id: 'rekap_config', __type: 'settings', ...rekapSettings }, 'settings');
            if (window.refreshData) window.refreshData();
            window.showAlert("Pengaturan Berhasil Disimpan", "Sukses", "info");
            return true;
        } catch (e) {
            window.showAlert("Gagal menyimpan: " + e.message, "Error", "danger");
            return false;
        }
    };

    const rekapFilteredSantriOptions = computed(() => {
        let items = uiData.santri || [];
        if (rekapSearch.value) {
            const q = rekapSearch.value.toLowerCase();
            items = items.filter(s =>
                (s.full_name || '').toLowerCase().includes(q) ||
                String(s.santri_id || '').toLowerCase().includes(q)
            );
        }
        return items.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    });

    const selectRekapSantri = (santri) => {
        rekapSantriId.value = santri.santri_id || santri._id || '';
        rekapSearch.value = santri.full_name || '';
        isRekapSantriDropdownOpen.value = false;
    };

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    /**
     * Compute Main Rekap Data using Shared Analytics Engine
     */
    const rekapHafalanData = computed(() => {
        let santris = uiData.santri || [];

        if (rekapKelas.value) santris = santris.filter(s => s.kelas === rekapKelas.value);
        if (rekapGender.value) santris = santris.filter(s => s.gender === rekapGender.value);
        if (rekapSantriId.value) {
            santris = santris.filter(s => s.santri_id === rekapSantriId.value || s._id === rekapSantriId.value || s.nis === rekapSantriId.value);
        }

        const isMatch = (dateStr) => {
            if (!dateStr) return false;
            const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            return d >= rekapStartDate.value && d <= rekapEndDate.value;
        };

        const context = {
            setoran: (uiData.all_setoran || uiData.setoran || []).filter(d => isMatch(d.setoran_date || d.created_at)),
            ujian: (uiData.all_ujian || uiData.ujian || []).filter(d => isMatch(d.date || d.created_at)),
            pelanggaran: (uiData.all_pelanggaran || uiData.pelanggaran || []).filter(d => isMatch(d.date || d.created_at))
        };

        const sorted = santris.map(s => {
            const perf = analytics.calculateStudentPerformance(s, context, rekapSettings);
            const mySetoran = context.setoran.filter(x => x.santri_id === s._id || x.santri_id === s.santri_id || x.santri_id === s.nis);

            return {
                id: s._id,
                nis: s.santri_id || s.nis || '-',
                nama: s.full_name,
                kelas: s.kelas,

                show_sabaq: rekapSettings.visibility.sabaq,
                sabaq_act: parseFloat(mySetoran.filter(x => x.setoran_type === 'Sabaq').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0).toFixed(1)),
                sabqi_act: parseFloat(mySetoran.filter(x => x.setoran_type === 'Sabqi').reduce((acc, curr) => acc + (parseFloat(curr.pages) || 0), 0).toFixed(1)),
                sabaq_total: parseFloat(perf.sabaq.actual.toFixed(1)),
                sabaq_tgt: perf.sabaq.target,

                show_manzil: rekapSettings.visibility.manzil,
                manzil_act: parseFloat(perf.manzil.actual.toFixed(1)),
                manzil_tgt: perf.manzil.target,

                show_ujian: rekapSettings.visibility.ujian,
                ujian_avg: parseFloat(perf.ujian.avg.toFixed(1)),

                show_tilawah: rekapSettings.visibility.tilawah,
                tilawah_act: parseFloat((perf.tilawah.actual / 20).toFixed(1)),
                tilawah_tgt: Math.round(perf.tilawah.target / 20),

                pelanggaran_poin: perf.pelanggaran.points,
                nilai_akhir: perf.total,
                predikat: perf.predikat,
                juzCompleted: perf.juzCompleted || 0,
                hafalan_progress: perf.hafalan_progress || {},

                // Detailed Exams for Raport
                exam_details: context.ujian
                    .filter(u => u.santri_id === s._id || u.santri_id === s.santri_id || u.santri_id === s.nis)
                    .map(u => ({
                        type: u.type,
                        detail: u.detail || u.mapel || u.type,
                        score: u.score,
                        grade: u.grade,
                        terbilang: terbilang(Math.round(u.score))
                    })),
                comparison: (() => {
                    // Logic for "Previous Period Comparison"
                    // We'll calculate same duration but shifted back
                    const start = new Date(rekapStartDate.value);
                    const end = new Date(rekapEndDate.value);
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                    const pEnd = new Date(start);
                    pEnd.setDate(pEnd.getDate() - 1);
                    const pStart = new Date(pEnd);
                    pStart.setDate(pStart.getDate() - (diffDays - 1));

                    const pStartStr = toYMD(pStart);
                    const pEndStr = toYMD(pEnd);

                    const isMatchPrev = (dateStr) => {
                        if (!dateStr) return false;
                        const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
                        return d >= pStartStr && d <= pEndStr;
                    };

                    const prevCtx = {
                        setoran: (uiData.all_setoran || uiData.setoran || []).filter(d => (d.santri_id === s._id || d.santri_id === s.santri_id) && isMatchPrev(d.setoran_date || d.created_at)),
                        ujian: (uiData.all_ujian || uiData.ujian || []).filter(d => (d.santri_id === s._id || d.santri_id === s.santri_id) && isMatchPrev(d.date || d.created_at)),
                        pelanggaran: (uiData.all_pelanggaran || uiData.pelanggaran || []).filter(d => (d.santri_id === s._id || d.santri_id === s.santri_id) && isMatchPrev(d.date || d.created_at))
                    };

                    const prevPerf = analytics.calculateStudentPerformance(s, prevCtx, rekapSettings);

                    return {
                        sabaq: analytics.calculateComparison(perf.sabaq.actual, prevPerf.sabaq.actual),
                        manzil: analytics.calculateComparison(perf.manzil.actual, prevPerf.manzil.actual),
                        tilawah: analytics.calculateComparison(perf.tilawah.actual, prevPerf.tilawah.actual),
                        ujian: analytics.calculateComparison(perf.ujian.avg, prevPerf.ujian.avg)
                    };
                })()
            };
        }).sort((a, b) => {
            const cat = rekapSortCategory.value;
            const valA = cat === 'sabaq' ? a.sabaq_act : (cat === 'sabqi' ? a.sabqi_act : (cat === 'ujian' ? a.ujian_avg : (cat === 'manzil' ? a.manzil_act : (cat === 'pelanggaran' ? a.pelanggaran_poin : a.nilai_akhir))));
            const valB = cat === 'sabaq' ? b.sabaq_act : (cat === 'sabqi' ? b.sabqi_act : (cat === 'ujian' ? b.ujian_avg : (cat === 'manzil' ? b.manzil_act : (cat === 'pelanggaran' ? b.pelanggaran_poin : b.nilai_akhir))));
            
            if (cat === 'pelanggaran') {
                return valA - valB; // Lower is better
            }
            return valB - valA; // Higher is better
        });

        // --- RANK MOVEMENT (PREV PERIOD VS CURRENT) ---
        // Build prev period leaderboard for rank comparison
        const sortedByTotal = [...sorted].sort((a, b) => b.nilai_akhir - a.nilai_akhir);
        
        // Calculate prev period total score for each santri in sorted list
        const prevPeriodRankList = santris.map(s => {
            const pStart = new Date(rekapStartDate.value);
            const pEnd = new Date(rekapEndDate.value);
            const diffDays = Math.ceil(Math.abs(pEnd - pStart) / (1000 * 60 * 60 * 24)) + 1;
            const prevEnd = new Date(pStart);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevStart.getDate() - (diffDays - 1));
            const pSStr = toYMD(prevStart);
            const pEStr = toYMD(prevEnd);
            const prevCtxForRank = {
                setoran: (uiData.all_setoran || uiData.setoran || []).filter(d => {
                    const dt = (d.setoran_date || d.created_at || '').split('T')[0];
                    return (d.santri_id === s._id || d.santri_id === s.santri_id) && dt >= pSStr && dt <= pEStr;
                }),
                ujian: (uiData.all_ujian || uiData.ujian || []).filter(d => {
                    const dt = (d.date || d.created_at || '').split('T')[0];
                    return (d.santri_id === s._id || d.santri_id === s.santri_id) && dt >= pSStr && dt <= pEStr;
                }),
                pelanggaran: (uiData.all_pelanggaran || uiData.pelanggaran || []).filter(d => {
                    const dt = (d.date || d.created_at || '').split('T')[0];
                    return (d.santri_id === s._id || d.santri_id === s.santri_id) && dt >= pSStr && dt <= pEStr;
                })
            };
            const pPerf = analytics.calculateStudentPerformance(s, prevCtxForRank, rekapSettings);
            return { id: s._id, total: pPerf.total };
        }).sort((a, b) => b.total - a.total);

        const prevRankMap = {};
        prevPeriodRankList.forEach((p, idx) => { prevRankMap[p.id] = idx + 1; });
        const currRankMap = {};
        sortedByTotal.forEach((p, idx) => { currRankMap[p.id] = idx + 1; });

        const finalResult = sorted.map(p => ({
            ...p,
            rankChange: (prevRankMap[p.id] && currRankMap[p.id]) ? prevRankMap[p.id] - currRankMap[p.id] : 0
        }));

        if (rekapSortLimit.value === 'top10') {
            return finalResult.slice(0, 10);
        } else if (rekapSortLimit.value === 'bottom10') {
            return [...finalResult].reverse().slice(0, 10);
        }
        return finalResult;
    });

    const rekapGlobalStats = computed(() => {
        const data = rekapHafalanData.value;
        if (!data || data.length === 0) return null;

        const count = data.length;
        const total = data.reduce((acc, row) => {
            acc.sabaq_total += row.sabaq_total;
            acc.sabqi_act += row.sabqi_act;
            acc.sabaq_tgt += row.sabaq_tgt;
            acc.manzil_act += row.manzil_act;
            acc.manzil_tgt += row.manzil_tgt;
            acc.tilawah_act += row.tilawah_act;
            acc.tilawah_tgt += row.tilawah_tgt;
            acc.ujian_avg += row.ujian_avg;
            acc.pelanggaran_poin += row.pelanggaran_poin;
            acc.nilai_akhir += row.nilai_akhir;
            return acc;
        }, {
            sabaq_total: 0, sabqi_act: 0, sabaq_tgt: 0,
            manzil_act: 0, manzil_tgt: 0,
            tilawah_act: 0, tilawah_tgt: 0,
            ujian_avg: 0, pelanggaran_poin: 0, nilai_akhir: 0
        });

        // Top 3 Santri
        const top3 = [...data].sort((a, b) => b.nilai_akhir - a.nilai_akhir).slice(0, 3);

        // Needs Attention (bottom 3 above 0)
        const bottom3 = [...data]
            .filter(d => d.nilai_akhir > 0)
            .sort((a, b) => a.nilai_akhir - b.nilai_akhir)
            .slice(0, 3);

        // --- Period Comparison for Global Stats ---
        const start = new Date(rekapStartDate.value);
        const end = new Date(rekapEndDate.value);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        const pEnd = new Date(start);
        pEnd.setDate(pEnd.getDate() - 1);
        const pStart = new Date(pEnd);
        pStart.setDate(pStart.getDate() - (diffDays - 1));

        const pStartStr = toYMD(pStart);
        const pEndStr = toYMD(pEnd);

        const isMatchPrev = (dateStr) => {
            if (!dateStr) return false;
            const d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            return d >= pStartStr && d <= pEndStr;
        };

        const prevContext = {
            setoran: (uiData.all_setoran || uiData.setoran || []).filter(d => isMatchPrev(d.setoran_date || d.created_at)),
            ujian: (uiData.all_ujian || uiData.ujian || []).filter(d => isMatchPrev(d.date || d.created_at)),
            pelanggaran: (uiData.all_pelanggaran || uiData.pelanggaran || []).filter(d => isMatchPrev(d.date || d.created_at))
        };

        const santris = uiData.santri || [];
        const prevData = santris.map(s => analytics.calculateStudentPerformance(s, prevContext, rekapSettings));
        const prevAvg = prevData.length > 0 ? {
            sabaq: prevData.reduce((acc, p) => acc + p.sabaq.actual, 0) / prevData.length,
            manzil: prevData.reduce((acc, p) => acc + p.manzil.actual, 0) / prevData.length,
            tilawah: prevData.reduce((acc, p) => acc + p.tilawah.actual, 0) / prevData.length,
            ujian: prevData.reduce((acc, p) => acc + p.ujian.avg, 0) / prevData.length
        } : { sabaq: 0, manzil: 0, tilawah: 0, ujian: 0 };

        // --- Real-time Rank Support ---
        // Rank movements: Compare current vs prev period rankings
        const topList = [...data].sort((a, b) => b.nilai_akhir - a.nilai_akhir);
        
        // Build prev period rank map using prevData already calculated above
        const prevRankList = prevData.slice().sort((a, b) => b.total - a.total);
        const prevRankMapGlobal = {};
        prevRankList.forEach((p, idx) => { prevRankMapGlobal[p.santri_id || p.id] = idx + 1; });
        const currRankMapGlobal = {};
        topList.forEach((p, idx) => { currRankMapGlobal[p.id] = idx + 1; });

        const topWithChange = topList.map(p => {
            const prevRank = prevRankMapGlobal[p.id];
            const currRank = currRankMapGlobal[p.id];
            return {
                ...p,
                rankChange: (prevRank && currRank) ? prevRank - currRank : 0
            };
        });

        return {
            avg: {
                sabaq_act: parseFloat((total.sabaq_total / count).toFixed(1)),
                sabqi_act: parseFloat((total.sabqi_act / count).toFixed(1)),
                sabaq_tgt: Math.round(total.sabaq_tgt / count),
                manzil_act: parseFloat((total.manzil_act / count).toFixed(1)),
                manzil_tgt: Math.round(total.manzil_tgt / count),
                tilawah_act: parseFloat((total.tilawah_act / count).toFixed(1)),
                tilawah_tgt: Math.round(total.tilawah_tgt / count),
                ujian_avg: parseFloat((total.ujian_avg / count).toFixed(1)),
                nilai_akhir: parseFloat((total.nilai_akhir / count).toFixed(1)),
                pelanggaran_poin: Math.round(total.pelanggaran_poin / count)
            },
            comparison: {
                sabaq: analytics.calculateComparison(total.sabaq_total / count, prevAvg.sabaq),
                manzil: analytics.calculateComparison(total.manzil_act / count, prevAvg.manzil),
                tilawah: analytics.calculateComparison(total.tilawah_act / count, prevAvg.tilawah),
                ujian: analytics.calculateComparison(total.ujian_avg / count, prevAvg.ujian)
            },
            top: topWithChange,
            needsAttention: bottom3,
            totalStudents: count
        };
    });

    const rekapTrendData = computed(() => {
        let santriIds = null;
        if (rekapSantriId.value) {
            const allSantris = uiData.santri || [];
            const selected = allSantris.find(s => s._id === rekapSantriId.value || s.santri_id === rekapSantriId.value || s.nis === rekapSantriId.value);
            if (selected) {
                // Collect all possible identifiers for this student
                santriIds = [selected._id, selected.santri_id, selected.nis].filter(Boolean);
                // Also handle cases where IDs might be numbers or strings
                const extraIds = santriIds.map(id => typeof id === 'number' ? String(id) : Number(id)).filter(v => !isNaN(v) || typeof v === 'string');
                santriIds = [...new Set([...santriIds, ...extraIds])];
            } else {
                santriIds = [rekapSantriId.value];
            }
        }

        const start = new Date(rekapStartDate.value);
        const end = new Date(rekapEndDate.value);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        const allSantrisCount = (uiData.santri || []).length;
        return analytics.getTrendData(
            uiData.all_setoran || uiData.setoran || [],
            diffDays,
            santriIds,
            uiData.all_ujian || uiData.ujian || [],
            allSantrisCount,
            rekapEndDate.value // Pass end date strictly
        );
    });

    const exportToPDF = () => {
        if (!window.jspdf) return window.showAlert("Library PDF belum dimuat.", "Peringatan", "warning");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Laporan Perkembangan Santri", 105, 15, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Periode: ${rekapStartDate.value} - ${rekapEndDate.value}`, 105, 22, { align: "center" });
        if (rekapKelas.value) doc.text(`Kelas: ${rekapKelas.value}`, 105, 29, { align: "center" });

        const headerRow = ['No', 'Nama Santri'];
        if (rekapSettings.visibility.sabaq) headerRow.push('Sabaq (Hal)');
        if (rekapSettings.visibility.manzil) headerRow.push('Manzil (Hal)');
        if (rekapSettings.visibility.ujian) headerRow.push('Ujian');
        if (rekapSettings.visibility.tilawah) headerRow.push('Tilawah (Juz)');
        headerRow.push('Pelanggaran', 'Nilai', 'Predikat');

        const data = rekapHafalanData.value.map((row, i) => {
            const r = [i + 1, row.nama];
            if (rekapSettings.visibility.sabaq) r.push(`${row.sabaq_act}/${row.sabaq_tgt}`);
            if (rekapSettings.visibility.manzil) r.push(`${row.manzil_act}/${row.manzil_tgt}`);
            if (rekapSettings.visibility.ujian) r.push(row.ujian_avg);
            if (rekapSettings.visibility.tilawah) r.push(`${row.tilawah_act}/${row.tilawah_tgt}`);
            r.push(row.pelanggaran_poin, row.nilai_akhir, row.predikat);
            return r;
        });

        doc.autoTable({ head: [headerRow], body: data, startY: 35, theme: 'grid', headStyles: { fillColor: [22, 163, 74] } });
        doc.save(`Rekap_Prestasi_${rekapStartDate.value}_sd_${rekapEndDate.value}.pdf`);
    };

    const exportToExcel = () => {
        if (!window.XLSX) return window.showAlert("Library Excel belum dimuat.", "Peringatan", "warning");
        const data = rekapHafalanData.value.map((row, i) => {
            const item = { "No": i + 1, "Nama Santri": row.nama, "Kelas": row.kelas };
            if (rekapSettings.visibility.sabaq) item["Sabaq"] = `${row.sabaq_act}/${row.sabaq_tgt}`;
            if (rekapSettings.visibility.manzil) item["Manzil"] = `${row.manzil_act}/${row.manzil_tgt}`;
            if (rekapSettings.visibility.ujian) item["Ujian"] = row.ujian_avg;
            if (rekapSettings.visibility.tilawah) item["Tilawah"] = `${row.tilawah_act}/${row.tilawah_tgt}`;
            item["Poin Pelanggaran"] = row.pelanggaran_poin;
            item["Nilai Akhir"] = row.nilai_akhir;
            item["Predikat"] = row.predikat;
            return item;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap");
        XLSX.writeFile(wb, `Rekap_Prestasi_${rekapStartDate.value}_sd_${rekapEndDate.value}.xlsx`);
    };

    const exportToPDFRaport = async (santriData, customSettings = null) => {
        if (!window.jspdf) return window.showAlert("Library PDF belum dimuat.", "Peringatan", "warning");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;
        const settingsToUse = customSettings || rekapSettings;
        const meta = settingsToUse.raportMetadata || {};

        // --- HEADER / KOP SURAT (Dinamis) ---
        let startY = 15;
        let textStartX = centerX;
        let textAlign = "center";

        if (meta.logo_url) {
            try {
                const lSize = meta.logo_size || 18;
                const lY = meta.logo_y || 10;
                doc.addImage(meta.logo_url, 'PNG', 20, lY, lSize, lSize);
            } catch (e) {
                console.warn("Logo failed to load:", e);
            }
        }

        // Always use center alignment for header text
        textStartX = centerX;
        textAlign = "center";

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(meta.institution || "MADRASAH TAHFIDZ AL-QURAN", textStartX, 17, { align: textAlign });
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const splitAddress = doc.splitTextToSize(meta.address || "Jl. Pendidikan No. 123", pageWidth - 80); // More narrow to avoid logo overlap
        doc.text(splitAddress, textStartX, 23, { align: textAlign });
        
        doc.setLineWidth(0.5);
        doc.line(20, 32, pageWidth - 20, 32);
        doc.setLineWidth(0.1);
        doc.line(20, 33, pageWidth - 20, 33);

        // --- JUDUL LAPORAN ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(meta.report_title || "LAPORAN HASIL BELAJAR (RAPORT) SANTRI", centerX, 42, { align: "center" });
        
        // --- DATA IDENTITAS ---
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        let idY = 52;
        // Kiri
        doc.text("Nama Santri", 20, idY);
        doc.text(`:  ${santriData.nama}`, 50, idY);
        doc.text("NIS / ID", 20, idY + 5);
        doc.text(`:  ${santriData.nis || '-'}`, 50, idY + 5);
        doc.text("Kelas", 20, idY + 10);
        doc.text(`:  ${santriData.kelas || '-'}`, 50, idY + 10);

        // Kanan
        doc.text("Semester", 130, idY);
        doc.text(`:  ${meta.semester || '-'}`, 160, idY);
        doc.text("Tahun Ajaran", 130, idY + 5);
        doc.text(`:  ${meta.tahun_ajaran || '-'}`, 160, idY + 5);
        doc.text("Periode Data", 130, idY + 10);
        doc.text(`:  ${formatDateShort(rekapStartDate.value)} - ${formatDateShort(rekapEndDate.value)}`, 160, idY + 10);

        // --- TABEL 1: CAPAIAN HAFALAN ---
        doc.setFont("helvetica", "bold");
        doc.text("A. CAPAIAN HAFALAN AL-QURAN", 20, idY + 20);

        const hafalanRows = [];
        if (settingsToUse.visibility.sabaq) {
            hafalanRows.push(["1", "Sabaq (Hafalan Baru)", `${santriData.sabaq_tgt} Hal`, `${santriData.sabaq_act} Hal`, `${Math.round((santriData.sabaq_act / (santriData.sabaq_tgt || 1)) * 100)}%`]);
        }
        if (settingsToUse.visibility.manzil) {
            hafalanRows.push(["2", "Manzil (Murojaah Lama)", `${santriData.manzil_tgt} Hal`, `${santriData.manzil_act} Hal`, `${Math.round((santriData.manzil_act / (santriData.manzil_tgt || 1)) * 100)}%`]);
        }
        if (settingsToUse.visibility.tilawah) {
            hafalanRows.push(["3", "Tilawah (Bacaan Mandiri)", `${santriData.tilawah_tgt} Juz`, `${santriData.tilawah_act} Juz`, `${Math.round((santriData.tilawah_act / (santriData.tilawah_tgt || 1)) * 100)}%`]);
        }

        doc.autoTable({
            startY: idY + 23,
            head: [['No', 'Bidang Penilaian', 'Target', 'Capaian', 'Persentase']],
            body: hafalanRows,
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { fontSize: 8, cellPadding: 2.5 },
            columnStyles: { 0: { cellWidth: 10 }, 4: { halign: 'center' } }
        });

        // --- TABEL 2: NILAI UJIAN & MAPEL ---
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont("helvetica", "bold");
        doc.text("B. NILAI UJIAN & MATA PELAJARAN", 20, finalY);

        const examRows = (santriData.exam_details || []).map((u, i) => [
            i + 1,
            u.detail || u.type,
            u.score || '0',
            u.terbilang || '-',
            u.grade || '-'
        ]);

        if (examRows.length === 0) examRows.push(["-", "Belum ada data ujian untuk periode ini", "-", "-", "-"]);

        doc.autoTable({
            startY: finalY + 3,
            head: [['No', 'Mata Pelajaran / Jenis Ujian', 'Nilai Angka', 'Terbilang', 'Predikat']],
            body: examRows,
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { fontSize: 8, cellPadding: 2.5 },
            columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'center' }, 4: { halign: 'center' } }
        });

        // --- TABEL 3: KEDISIPLINAN & KESIMPULAN ---
        finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont("helvetica", "bold");
        doc.text("C. KEDISIPLINAN & KESIMPULAN AKHIR", 20, finalY);

        const summaryRows = [
            ["Poin Pelanggaran Kedisiplinan", `${santriData.pelanggaran_poin || 0} Poin`],
            ["Catatan / Saran Perkembangan", santriData.nilai_akhir >= 85 ? "Sangat Baik, Pertahankan dan teruslah beristiqomah." : (santriData.nilai_akhir >= 70 ? "Baik, Teruslah berlatih agar hafalan semakin lancar." : "Perlu bimbingan dan murojaah lebih intensif.")],
            ["SKOR GABUNGAN AKHIR / PREDIKAT", `${santriData.nilai_akhir || 0} / ${santriData.predikat || 'C'}`]
        ];

        doc.autoTable({
            startY: finalY + 3,
            body: summaryRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });

        // --- FOOTER / TANDA TANGAN ---
        finalY = doc.lastAutoTable.finalY + 15;
        if (finalY > 250) { doc.addPage(); finalY = 20; }

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        const signDate = `${meta.signature_place || 'Jakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        doc.text(signDate, pageWidth - 70, finalY);
        
        doc.text(meta.signature_label_left || "Kepala Madrasah", 30, finalY + 7);
        doc.text(meta.signature_label_right || "Wali Kelas / Musyrif", pageWidth - 70, finalY + 7);

        // Name Space
        finalY += 30;
        doc.setFont("helvetica", "bold");
        doc.text(`( ${meta.signature_name_left || '................................'} )`, 25, finalY);
        doc.text(`( ................................ )`, pageWidth - 75, finalY);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("* Raport ini digenerate secara otomatis oleh sistem aplikasi.", centerX, finalY + 10, { align: "center" });

        doc.save(`Raport_${santriData.nama}_${meta.semester || ''}_${meta.tahun_ajaran ? meta.tahun_ajaran.replace('/', '-') : ''}${customSettings ? '_MOCKUP' : ''}.pdf`);
    };

    const exportToPDFMockup = async (customSettings) => {
        const dummySantri = {
            nama: "CONTOH NAMA SANTRI (MOCKUP)",
            nis: "2024001",
            kelas: "Kelas Contoh",
            sabaq_act: 15, sabaq_tgt: 20,
            manzil_act: 20, manzil_tgt: 20,
            tilawah_act: 1.5, tilawah_tgt: 2,
            pelanggaran_poin: 0,
            nilai_akhir: 95,
            predikat: "A+",
            exam_details: [
                { detail: "Ujian Hifdzul Quran", score: 98, terbilang: "Sembilan Puluh Delapan", grade: "A+" },
                { detail: "Materi Tajwid", score: 85, terbilang: "Delapan Puluh Lima", grade: "A" }
            ]
        };
        return exportToPDFRaport(dummySantri, customSettings);
    };

    return {
        rekapStartDate, rekapEndDate, rekapKelas, rekapGender,
        rekapSearch, rekapSantriId, isRekapSantriDropdownOpen, 
        rekapSortLimit, rekapSortCategory,
        rekapFilteredSantriOptions, selectRekapSantri,
        setRangeRealtime, setRangeKemarin, setRange7Hari, setRange30Hari, setRangeBulanIni, setRangeSemua,
        monthNames, rekapHafalanData, rekapGlobalStats, rekapSettings,
        saveSettings, exportToPDF, exportToExcel, exportToPDFRaport, exportToPDFMockup,
        rekapTrendData
    };
};
