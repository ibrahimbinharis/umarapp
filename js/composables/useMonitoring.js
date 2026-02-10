/**
 * useMonitoring Composable
 * 
 * Logic for monitoring santri setoran progress.
 * rules:
 * - Sabaq: Mandatory (> 10:00)
 * - Sabqi: Mandatory (> 10:00) IF Sabaq is done
 * - Robt: Mandatory (> 18:00) IF Sabqi is done
 * - Manzil: Mandatory (> 22:00)
 * - Friday: Libur (No checks)
 * - Excludes: Sakit, Izin, Alpha (from Absensi)
 */

function useMonitoring(uiData, userSession) {
    const { computed, ref, onMounted, onUnmounted } = Vue;

    const currentTime = ref(new Date());
    let timer = null;

    // Update time every minute
    onMounted(() => {
        timer = setInterval(() => {
            currentTime.value = new Date();
        }, 60000);
    });

    onUnmounted(() => {
        if (timer) clearInterval(timer);
    });

    const missingReports = computed(() => {
        const now = currentTime.value;
        const day = now.getDay(); // 0 = Sun, 1 = Mon, ... 5 = Fri, 6 = Sat
        const hour = now.getHours();

        // 1. Check Friday (Libur)
        if (day === 5) return [];

        const reports = [];
        const todayStr = window.DateUtils ? window.DateUtils.getTodayDateString() : new Date().toISOString().split('T')[0];

        // Access raw data
        const santriList = uiData.santri || [];
        const setoranList = uiData.setoran || [];
        const absensiList = uiData.absensi || []; // Assuming absensi structure

        // Filter targeted santri (Role based)
        let targets = santriList;
        if (userSession.value && userSession.value.role === 'wali') {
            // Filter only their child
            // Match by parent_phone usually, or if we have santri_id linked in user session
            // Assuming userSession has linked santri data or we trust the parent_phone match logic from auth
            // For safety, if role is wali, we rely on the fact that uiData.santri might already be filtered?
            // Actually uiData.santri usually contains ALL santri.
            // We need to match userSession.username (phone) with santri.parent_phone

            // NOTE: In useAuth, wali login sets userSession.username = no_hp.
            // Santri has parent_phone.
            targets = targets.filter(s => s.parent_phone === userSession.value.username);
        }

        // Processing
        for (const s of targets) {
            // 2. Check Absensi (Exclude if NOT 'H' or NOT PRESENT)
            // Need to find absensi status for this santri today
            // Assuming absensi structure: { santri_id, date, status, ... }
            // If no absensi record, usually assume Hadir OR Waiting?
            // Let's assume if there is a record and it is S/I/A, we exclude.
            const abs = absensiList.find(a =>
                (a.santri_id === s.santri_id || a.santri_id === s._id) &&
                a.date === todayStr
            );

            if (abs && ['S', 'I', 'A'].includes(abs.status)) {
                continue; // Skip sick/permitted/alpha
            }

            // 3. Check Setorans
            const setoransToday = setoranList.filter(r =>
                (r.santri_id === s.santri_id || r.santri_id === s._id) &&
                r.setoran_date === todayStr
            );

            const hasSabaq = setoransToday.some(r => r.setoran_type === 'Sabaq');
            const hasSabqi = setoransToday.some(r => r.setoran_type === 'Sabqi');
            const hasRobt = setoransToday.some(r => r.setoran_type === 'Robt');
            const hasManzil = setoransToday.some(r => r.setoran_type === 'Manzil');

            // 4. Verification Logic (Strict Time)

            // Rule A: Sabaq (> 10:00)
            if (hour >= 10 && !hasSabaq) {
                reports.push({
                    id: s._id + '_sabaq',
                    santri_name: s.full_name,
                    santri: s,
                    type: 'Sabaq',
                    msg: 'belum menyetorkan Sabaq'
                });
            }

            // Rule B: Sabqi (> 10:00, IF Sabaq exists)
            if (hour >= 10 && hasSabaq && !hasSabqi) {
                reports.push({
                    id: s._id + '_sabqi',
                    santri_name: s.full_name,
                    santri: s,
                    type: 'Sabqi',
                    msg: 'belum menyetorkan Sabqi'
                });
            }

            // Rule C: Robt (> 18:00, IF Sabqi exists)
            if (hour >= 18 && hasSabqi && !hasRobt) {
                reports.push({
                    id: s._id + '_robt',
                    santri_name: s.full_name,
                    santri: s,
                    type: 'Robt', // Fixed typo from 'Rabt'
                    msg: 'belum menyetorkan Robt'
                });
            }

            // Rule D: Manzil (> 22:00)
            if (hour >= 22 && !hasManzil) {
                reports.push({
                    id: s._id + '_manzil',
                    santri_name: s.full_name,
                    santri: s,
                    type: 'Manzil',
                    msg: 'belum menyetorkan Manzil'
                });
            }
        }

        return reports;
    });

    const notificationCount = computed(() => missingReports.value.length);

    // Modal State for Monitoring
    const monitoringModalOpen = ref(false);
    const openMonitoringModal = () => monitoringModalOpen.value = true;
    const closeMonitoringModal = () => monitoringModalOpen.value = false;

    return {
        missingReports,
        notificationCount,
        monitoringModalOpen,
        openMonitoringModal,
        closeMonitoringModal
    };
}
