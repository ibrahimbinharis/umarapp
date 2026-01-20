// --- AUTH & USERS ---

// --- 5. DATA GURU (USERS) ---
function renderUserManagement() {
    refreshData();
    const html = `
    <div class="fade-in space-y-4 pb-32">
        <div class="flex justify-between items-center px-2">
            <h2 class="text-2xl font-bold text-slate-900">Data Guru</h2>
            <button onclick="openUserForm()" class="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">add</span> Tambah
            </button>
        </div>
        <div class="space-y-3 px-2">
            ${allData.filter(u => u.__type === 'user' && u.role === 'guru').map(u => `
                <div class="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-start group relative">
                    <div>
                        <p class="font-bold text-slate-900">${u.full_name}</p>
                        <p class="text-[10px] text-slate-500 uppercase font-mono tracking-wider">${u.username} ${u.custom_username ? '• ' + u.custom_username : ''} • ${u.role}</p>
                    </div>
                     <div class="relative">
                        <button onclick="toggleMenu('${u._id}', event)" class="size-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
                            <span class="material-symbols-outlined">more_vert</span>
                        </button>
                        <div id="menu-${u._id}" class="hidden absolute right-0 top-8 bg-white rounded-xl shadow-xl border w-36 z-20 py-1 flex-col overflow-hidden animate-scale-in origin-top-right">
                            <button onclick="openUserForm('${u._id}')" class="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[16px]">edit</span> Edit
                            </button>
                            <div class="h-px bg-slate-100 mx-2"></div>
                            <button onclick="deleteData('${u._id}', 'guru')" class="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-[16px]">delete</span> Hapus
                            </button>
                        </div>
                    </div>
                </div>`).join('')}
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = renderLayout('guru', html);
}

function generateGuruID() {
    // Format: 1 - Seq(2digit) - Month(2digit) - Year(2digit)
    // 1030126
    const guruList = allData.filter(d => d.__type === 'user' && d.role === 'guru');
    const seq = (guruList.length + 1).toString().padStart(2, '0');
    const date = new Date();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yy = date.getFullYear().toString().slice(-2);
    return `1${seq}${mm}${yy}`;
}

function openUserForm(id = null) {
    const isEdit = !!id;
    const data = isEdit ? allData.find(u => u._id === id) : {};
    const autoId = !isEdit ? generateGuruID() : '';

    document.getElementById('modal-content').innerHTML = `
    <div class="p-0 bg-slate-50 flex flex-col h-auto">
        <div class="bg-white p-5 border-b flex justify-between items-center rounded-t-2xl">
            <h3 class="font-bold text-lg text-slate-900">${isEdit ? 'Edit User' : 'Tambah User'}</h3>
            <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="size-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold hover:bg-slate-100">✕</button>
        </div>
        <div class="p-6 space-y-4">
            <div>
               <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ID Guru (Auto)</label>
               <input id="u_user" value="${data.username || autoId}" readonly class="w-full p-3 bg-slate-100 border-transparent rounded-xl font-mono font-bold text-slate-500 mb-2">
               
               <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Username (Login Manual)</label>
               <input id="u_custom" value="${data.custom_username || ''}" class="w-full p-3 border rounded-xl font-bold text-slate-900 placeholder:text-slate-300" placeholder="Username untuk login">
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nama Lengkap</label>
                <input id="u_name" placeholder="Nama Lengkap" value="${data.full_name || ''}" class="w-full p-3 border rounded-xl font-bold text-slate-900">
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Password</label>
                <div class="relative">
                    <input id="u_pass" type="password" placeholder="Password" value="${data.password || '123'}" class="w-full p-3 border rounded-xl font-bold text-slate-900 pr-10">
                    <button onclick="togglePasswordVisibility('u_pass', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                </div>
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Role / Jabatan</label>
                <input value="Guru (Pengajar)" disabled class="w-full p-3 border rounded-xl font-bold bg-slate-100 text-slate-500">
                <input type="hidden" id="u_role" value="guru">
            </div>
            <button onclick="saveUser('${id || ''}')" class="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 mt-2">Simpan User</button>
        </div>
    </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveUser(id) {
    const name = document.getElementById('u_name').value;
    const username = document.getElementById('u_user').value;
    const custom = document.getElementById('u_custom').value;
    const password = document.getElementById('u_pass').value;
    const role = document.getElementById('u_role').value;

    if (!name) return alert("Nama wajib diisi", "error"); // revert showToast to alert as v32 uses alert or native

    if (id) {
        await DB.update(id, { full_name: name, password: password, custom_username: custom });
    } else {
        await DB.create('user', { full_name: name, username, custom_username: custom, password, role });
    }
    document.getElementById('modal-overlay').classList.add('hidden');
    renderUserManagement();
}

// --- AUTH ---
function renderLogin() {
    document.getElementById('app-root').innerHTML = `<div class="min-h-screen w-full flex bg-white"><div class="hidden md:flex md:w-1/2 bg-primary items-center justify-center p-12 text-white relative"><h1 class="text-5xl font-bold mb-6">Sistem Ma'had<br/>Umar Bin Khattab</h1><p class="opacity-80">Versi ${APP_CONFIG.version}</p></div><div class="w-full md:w-1/2 flex flex-col justify-center px-8 py-12"><div class="max-w-sm mx-auto w-full space-y-8"><h2 class="text-3xl font-bold text-slate-900">Masuk</h2><form onsubmit="event.preventDefault(); login(this.u.value, this.p.value)" class="space-y-5"><input name="u" class="w-full rounded-xl border-slate-200 bg-slate-50 p-4" placeholder="Username / NIS Santri" required><div class="relative"><input id="login_pass" name="p" type="password" class="w-full rounded-xl border-slate-200 bg-slate-50 p-4 pr-12" placeholder="Password" required><button type="button" onclick="togglePasswordVisibility('login_pass', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition"><span class="material-symbols-outlined">visibility</span></button></div><button class="w-full bg-primary text-white font-bold h-14 rounded-xl">Masuk</button></form><div class="flex justify-between items-center text-xs mt-4"><div class="text-slate-400">Hubungi Admin untuk login</div><div class="flex gap-4"><button onclick="seedDefaultAdmin()" class="text-blue-400 font-bold hover:text-blue-600">Buat Admin</button><button onclick="localStorage.removeItem('${SYNC_URL_KEY}'); location.reload()" class="text-red-400 font-bold hover:text-red-600">Reset System</button></div></div></div></div></div>`;
}

async function seedDefaultAdmin() {
    if (!confirm("Buat akun default (admin/123)? Gunakan jika database kosong.")) return;
    try {
        const payload = {
            username: 'admin',
            password: '123', // Will be hashed by DB.create
            full_name: 'Administrator',
            role: 'admin'
        };
        await DB.create('user', payload);
        await DB.syncToCloud();
        alert("Admin default dibuat. Silakan login: admin / 123");
    } catch (e) {
        alert("Gagal: " + e.message);
    }
}

async function login(u, p) {
    const url = localStorage.getItem(SYNC_URL_KEY);
    if (!url) { renderSetup(); return; }

    showLoading(true, "Authenticating...");

    // 1. Try Secure Login (Hash)
    const hashedPassword = await hashPassword(p); // Hash the input

    try {
        let response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', username: u, password: hashedPassword })
        });
        let res = await response.json();

        // 2. Fallback: If Hash fails, try Legacy Plaintext
        if (!res.success) {
            console.warn("Hash login failed, trying legacy plaintext...");
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', username: u, password: p }) // Send Plain
            });
            res = await response.json();

            // If Plaintext worked, we need to MIGRATE to Hash logic immediately
            if (res.success && res.user && res.user._id) {
                console.log("Legacy login success. Migrating to secure hash...");
                // Mark for migration
                res.user._migration_needed = true;
                res.user._new_hash = hashedPassword;
            }
        }

        showLoading(false);

        if (res.success) {
            currentUser = res.user;
            sessionStorage.setItem('tahfidz_session', JSON.stringify(currentUser));

            await initializeAfterLogin();

            // Execute Migration if flagged
            if (currentUser._migration_needed) {
                try {
                    // We update the user with the NEW HASHED password
                    // Ensure we have the latest data first (initializeAfterLogin does sync)
                    const freshUser = allData.find(d => d._id === currentUser._id);
                    if (freshUser) {
                        await DB.update(currentUser._id, { password: currentUser._new_hash });
                        // Force push to cloud to finalize migration
                        await DB.syncToCloud();
                        console.log("Security migration complete.");

                        // Clean up session object
                        delete currentUser._migration_needed;
                        delete currentUser._new_hash;
                        sessionStorage.setItem('tahfidz_session', JSON.stringify(currentUser));
                    }
                } catch (e) {
                    console.warn("Migration failed", e);
                }
            }
        } else {
            alert("Login Failed: " + res.message);
        }
    } catch (e) {
        showLoading(false);
        alert("Connection Error. " + e.message);
    }
}

async function initializeAfterLogin() {
    await DB.syncFromCloud();
    refreshData();
    renderDashboard();
}

function logout() {
    sessionStorage.removeItem('tahfidz_session');
    currentUser = null;
    renderLogin();
}

function renderSetup() {
    const scriptCode = `function doGet(e){var ss=SpreadsheetApp.openById("${APP_CONFIG.spreadsheetId}");var s=ss.getSheets();var r=[];s.forEach(function(sh){var d=sh.getDataRange().getValues();if(d.length<2)return;var h=d[0];for(var i=1;i<d.length;i++){var o={};var hp=false;for(var j=0;j<h.length;j++){if(h[j]=='password'){hp=true;continue;}o[h[j]]=d[i][j];}if(hp)o['has_password']=true;r.push(o);}});return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);}function doPost(e){var ss=SpreadsheetApp.openById("${APP_CONFIG.spreadsheetId}");try{var p=JSON.parse(e.postData.contents);if(p.action=='login'){var u=(p.username||'').toString().toLowerCase();var pass=(p.password||'').toString();var f=function(n,r){var sh=ss.getSheetByName(n);if(!sh)return null;var d=sh.getDataRange().getValues();var h=d[0];var idx={};h.forEach(function(c,i){idx[c]=i;});if(idx['password']===undefined)return null;for(var i=1;i<d.length;i++){var row=d[i];var dbP=String(row[idx['password']]||'');if(dbP!==pass)continue;var m=false;if(idx['username']!==undefined&&String(row[idx['username']]).toLowerCase()===u)m=true;if(idx['custom_username']!==undefined&&String(row[idx['custom_username']]).toLowerCase()===u)m=true;if(idx['santri_id']!==undefined&&String(row[idx['santri_id']]).toLowerCase()===u)m=true;if(m){var usr={};h.forEach(function(c,k){if(c==='password')return;usr[c]=row[k];});if(r)usr.role=r;if(!usr.role&&usr.__type==='user')usr.role='user';return usr;}}return null;};var usr=f('Admin')||f('Guru');if(!usr){var s=f('Santri');if(s){usr=s;usr.role='wali';usr.child_id=s.santri_id;usr.full_name='Wali '+(s.full_name||'').split(' ')[0];}}if(usr)return ContentService.createTextOutput(JSON.stringify({success:true,user:usr}));return ContentService.createTextOutput(JSON.stringify({success:false,message:"Invalid Credentials"}));}if(p.action=='save'){var ad=p.data;var g={};ad.forEach(function(i){var t=i.__type||'Lainnya';if(t==='user'&&i.role)t=i.role;var sn=t.charAt(0).toUpperCase()+t.slice(1);if(!g[sn])g[sn]=[];g[sn].push(i);});for(var sn in g){var sd=g[sn];if(sd.length===0)continue;var sh=ss.getSheetByName(sn);if(!sh)sh=ss.insertSheet(sn);var ep={};if(sh.getLastRow()>1){var od=sh.getDataRange().getValues();var oh=od[0];var pi=oh.indexOf('password');var ii=oh.indexOf('_id');if(pi!==-1&&ii!==-1){for(var i=1;i<od.length;i++)ep[od[i][ii]]=od[i][pi];}}sh.clear();var h=Object.keys(sd[0]);if((sn==='Admin'||sn==='Guru'||sn==='Santri')&&h.indexOf('password')===-1)h.push('password');var vs=[h];sd.forEach(function(it){var r=[];h.forEach(function(k){var v=it[k];if(k==='password'&&(v===undefined||v==='')){v=ep[it._id]||'';}r.push(v===undefined?"":v);});vs.push(r);});sh.getRange(1,1,vs.length,vs[0].length).setValues(vs);}return ContentService.createTextOutput(JSON.stringify({success:true}));}}catch(err){return ContentService.createTextOutput(JSON.stringify({success:false,error:err.toString()}));}}`;
    const html = `
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100">
        <div class="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full">
             <h1 class="text-2xl font-bold mb-4">Setup Database</h1>
             <p class="mb-4 text-sm text-slate-500">Copy code berikut ke Google Apps Script, Deploy Web App, dan masukkan URL.</p>
             <div class="relative group mb-4">
                <textarea class="w-full h-32 p-3 text-xs font-mono bg-slate-900 text-green-400 rounded-lg" readonly>${scriptCode}</textarea>
                <button onclick="navigator.clipboard.writeText(this.previousElementSibling.value); alert('Copied!')" class="absolute top-2 right-2 bg-white/20 text-white text-xs px-2 py-1 rounded">Copy</button>
             </div>
             <input id="sync_url" class="w-full p-3 border rounded-xl mb-4 font-bold" placeholder="https://script.google.com/macros/s/.../exec">
             <button onclick="saveSetup()" class="w-full bg-primary text-white py-3 rounded-xl font-bold">Connect</button>
        </div>
    </div>`;
    document.getElementById('app-root').innerHTML = html;
}

function saveSetup() {
    const url = document.getElementById('sync_url').value.trim();
    if (url.startsWith('https://script.google.com')) {
        localStorage.setItem(SYNC_URL_KEY, url);
        window.location.reload();
    } else {
        alert("Invalid URL");
    }
}
