// ============================================================
// BASELINE TC — ADMIN PANEL JAVASCRIPT
// ============================================================

// ============================================================
// 🔐 TOAST NOTIFICATION
// ============================================================
function toast(msg, isError = false) {
    const el = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (!el || !msgEl) return;
    
    msgEl.textContent = msg;
    el.classList.add('show');
    
    if (isError) {
        el.style.background = '#c0392b';
    } else {
        el.style.background = 'var(--navy)';
    }
    
    clearTimeout(window._toast);
    window._toast = setTimeout(() => {
        el.classList.remove('show');
        el.style.background = 'var(--navy)';
    }, 4000);
}

// ============================================================
// 📂 CRUD HELPERS
// ============================================================
async function addDoc(collection, data) {
    try {
        const docRef = await db.collection(collection).add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Document added to ${collection}:`, docRef.id);
        return docRef;
    } catch (err) {
        console.error(`❌ Error adding to ${collection}:`, err);
        throw new Error(`Failed to add ${collection}: ${err.message}`);
    }
}

async function deleteDoc(collection, id) {
    try {
        await db.collection(collection).doc(id).delete();
        console.log(`✅ Document deleted from ${collection}:`, id);
    } catch (err) {
        console.error(`❌ Error deleting from ${collection}:`, err);
        throw new Error(`Failed to delete ${collection}: ${err.message}`);
    }
}

async function listDocs(collection, orderByField = 'createdAt', order = 'desc') {
    try {
        const snapshot = await db.collection(collection).orderBy(orderByField, order).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error(`❌ Error listing ${collection}:`, err);
        throw new Error(`Failed to load ${collection}: ${err.message}`);
    }
}

// ============================================================
// 🛡️ ESCAPE HTML
// ============================================================
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// 📅 HELPER: Get Date from Firestore
// ============================================================
function getDateFromFirestore(timestamp) {
    if (!timestamp) return new Date();
    
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        return timestamp;
    } else if (typeof timestamp === 'string') {
        return new Date(timestamp);
    }
    return new Date();
}

// ============================================================
// 🖥️ RENDER LISTS
// ============================================================
function renderPlayerList(players) {
    const container = document.getElementById('playerList');
    if (!container) return;
    
    if (!players || players.length === 0) {
        container.innerHTML = '<div class="empty-msg">🎾 No players yet. Add one above!</div>';
        return;
    }
    
    container.innerHTML = players.map(p => `
        <div class="item">
            <div>
                <span class="name">${escapeHTML(p.name)}</span>
                <span class="tag">${escapeHTML(p.category || 'Singles')}</span>
                <span class="meta">${p.wins || 0}W-${p.losses || 0}L · ${p.points || 0}pts</span>
            </div>
            <button class="delete-btn" onclick="deleteItem('players', '${p.id}')" title="Delete player">✕</button>
        </div>
    `).join('');
}

function renderFixtureList(fixtures) {
    const container = document.getElementById('fixtureList');
    if (!container) return;
    
    if (!fixtures || fixtures.length === 0) {
        container.innerHTML = '<div class="empty-msg">📅 No fixtures yet.</div>';
        return;
    }
    
    container.innerHTML = fixtures.map(f => {
        const date = getDateFromFirestore(f.matchDate);
        const isCompleted = f.completed || false;
        
        return `
            <div class="item" style="${isCompleted ? 'opacity:0.6;' : ''}">
                <div>
                    <span class="name">vs ${escapeHTML(f.opponent)}</span>
                    <span class="tag">${escapeHTML(f.venue || 'TBA')}</span>
                    <span class="meta">${date.toLocaleDateString()}</span>
                    ${f.matchTime ? `<span class="meta">${f.matchTime}</span>` : ''}
                    ${isCompleted ? '<span class="tag" style="background:#4CAF50; color:white;">✅ Completed</span>' : ''}
                </div>
                <button class="delete-btn" onclick="deleteItem('fixtures', '${f.id}')" title="Delete fixture">✕</button>
            </div>
        `;
    }).join('');
}

function renderNewsList(news) {
    const container = document.getElementById('newsList');
    if (!container) return;
    
    if (!news || news.length === 0) {
        container.innerHTML = '<div class="empty-msg">📰 No news yet.</div>';
        return;
    }
    
    container.innerHTML = news.map(n => {
        const date = getDateFromFirestore(n.publishedAt);
        return `
            <div class="item">
                <div>
                    <span class="name">${escapeHTML(n.title)}</span>
                    <span class="tag">${escapeHTML(n.tag || 'Announcement')}</span>
                    <span class="meta">${date.toLocaleDateString()}</span>
                    ${n.published === 0 ? '<span class="tag" style="background:#fde6e5;">Draft</span>' : ''}
                </div>
                <button class="delete-btn" onclick="deleteItem('news', '${n.id}')" title="Delete news">✕</button>
            </div>
        `;
    }).join('');
}

function renderResultList(results) {
    const container = document.getElementById('resultList');
    if (!container) return;
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-msg">📊 No results yet.</div>';
        return;
    }
    
    container.innerHTML = results.map(r => {
        const date = getDateFromFirestore(r.matchDate);
        const opponent = r.fixtureOpponent || r.opponent || 'TBD';
        
        return `
            <div class="item">
                <div>
                    <span class="name">vs ${escapeHTML(opponent)}</span>
                    <span class="tag ${r.outcome === 'win' ? 'win' : r.outcome === 'loss' ? 'loss' : ''}">${escapeHTML(r.outcome || '—')}</span>
                    <span class="meta">${escapeHTML(r.score || '—')}</span>
                    <span class="meta">${date.toLocaleDateString()}</span>
                    ${r.fixtureId ? '<span class="tag" style="background:#e8f5e9;">📎 Linked</span>' : ''}
                </div>
                <button class="delete-btn" onclick="deleteResult('${r.id}')" title="Delete result">✕</button>
            </div>
        `;
    }).join('');
}

// ============================================================
// 🗑️ DELETE ITEM
// ============================================================
window.deleteItem = async function(collection, id) {
    if (!confirm(`⚠️ Delete this ${collection.slice(0, -1)}? This action cannot be undone.`)) return;
    
    try {
        await deleteDoc(collection, id);
        toast('✅ Deleted successfully.');
        await loadAllData();
        if (collection === 'fixtures') await populateFixtureDropdown();
    } catch (err) {
        toast('❌ Error deleting: ' + err.message, true);
    }
};

// ============================================================
// 🗑️ DELETE RESULT (Also updates fixture)
// ============================================================
window.deleteResult = async function(resultId) {
    if (!confirm('⚠️ Delete this result? This will also mark the fixture as "Not Completed".')) return;
    
    try {
        const resultDoc = await db.collection('results').doc(resultId).get();
        if (!resultDoc.exists) {
            toast('Result not found.', true);
            return;
        }
        
        const resultData = resultDoc.data();
        const fixtureId = resultData.fixtureId;
        
        await db.collection('results').doc(resultId).delete();
        
        if (fixtureId) {
            await db.collection('fixtures').doc(fixtureId).update({
                completed: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Fixture ${fixtureId} marked as not completed`);
        }
        
        toast('✅ Result deleted and fixture updated.');
        await loadAllData();
        await populateFixtureDropdown();
    } catch (err) {
        toast('❌ Error deleting result: ' + err.message, true);
    }
};

// ============================================================
// 📅 FIXTURE DROPDOWN POPULATOR
// ============================================================
async function populateFixtureDropdown() {
    const select = document.getElementById('resultFixtureSelect');
    const warning = document.getElementById('noFixtureWarning');
    if (!select) return;
    
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const snapshot = await db.collection('fixtures')
            .orderBy('matchDate', 'asc')
            .get();
        
        const fixtures = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const availableFixtures = fixtures.filter(f => {
            const date = getDateFromFirestore(f.matchDate);
            return !f.completed && date >= now;
        });
        
        select.innerHTML = '<option value="">-- Select a fixture --</option>';
        
        if (availableFixtures.length === 0) {
            select.innerHTML = '<option value="">No available fixtures</option>';
            if (warning) warning.style.display = 'block';
            return;
        }
        
        if (warning) warning.style.display = 'none';
        
        availableFixtures.forEach(f => {
            const date = getDateFromFirestore(f.matchDate);
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = `vs ${f.opponent} - ${date.toLocaleDateString()} ${f.venue ? `(${f.venue})` : ''}`;
            option.dataset.opponent = f.opponent;
            option.dataset.date = date.toISOString();
            option.dataset.time = f.matchTime || 'TBC';
            option.dataset.venue = f.venue || 'TBA';
            select.appendChild(option);
        });
        
        console.log(`✅ Populated ${availableFixtures.length} fixtures in dropdown`);
        
    } catch (err) {
        console.error('❌ Error populating fixtures:', err);
        if (warning) warning.style.display = 'block';
    }
}

// ============================================================
// 🔄 FIXTURE SELECTION HANDLER
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('resultFixtureSelect');
    if (select) {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            
            if (this.value) {
                document.getElementById('resultOpponent').value = selectedOption.dataset.opponent || '';
                document.getElementById('resultDisplayDate').value = selectedOption.dataset.date ? 
                    new Date(selectedOption.dataset.date).toLocaleDateString() : '';
                document.getElementById('resultFixtureId').value = this.value;
                document.getElementById('resultMatchDate').value = selectedOption.dataset.date || '';
            } else {
                document.getElementById('resultOpponent').value = '';
                document.getElementById('resultDisplayDate').value = '';
                document.getElementById('resultFixtureId').value = '';
                document.getElementById('resultMatchDate').value = '';
            }
        });
    }
});

// ============================================================
// 📥 LOAD ALL DATA
// ============================================================
async function loadAllData() {
    try {
        const [players, fixtures, news, results] = await Promise.all([
            listDocs('players', 'points', 'desc'),
            listDocs('fixtures', 'matchDate', 'asc'),
            listDocs('news', 'publishedAt', 'desc'),
            listDocs('results', 'matchDate', 'desc')
        ]);
        
        renderPlayerList(players);
        renderFixtureList(fixtures);
        renderNewsList(news);
        renderResultList(results);
        
        await populateFixtureDropdown();
        
        console.log(`✅ Admin data loaded: ${players.length} players, ${fixtures.length} fixtures, ${news.length} news, ${results.length} results`);
        
    } catch (err) {
        console.error('❌ Error loading data:', err);
        toast('❌ Error loading data: ' + err.message, true);
    }
}

// ============================================================
// 📸 IMAGE UPLOAD FUNCTIONS
// ============================================================
async function uploadImage(file, path) {
    if (!file) return null;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
    }
    
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
    }
    
    const timestamp = Date.now();
    const filename = `${path}_${timestamp}_${file.name.replace(/\s/g, '_')}`;
    const storageRef = storage.ref().child(filename);
    
    const progressBar = document.getElementById('progressBar');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadProgress = document.getElementById('uploadProgress');
    
    if (uploadProgress) uploadProgress.style.display = 'block';
    
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (uploadStatus) uploadStatus.textContent = `Uploading: ${Math.round(progress)}%`;
        },
        (error) => {
            console.error('Upload error:', error);
            if (uploadProgress) uploadProgress.style.display = 'none';
            throw error;
        }
    );
    
    await uploadTask;
    
    const downloadURL = await storageRef.getDownloadURL();
    
    if (uploadProgress) uploadProgress.style.display = 'none';
    
    console.log('✅ Image uploaded:', downloadURL);
    return downloadURL;
}

// ============================================================
// 🔐 AUTH STATE
// ============================================================
const authBox = document.getElementById('authBox');
const loadingPanel = document.getElementById('loadingPanel');
const adminPanel = document.getElementById('adminPanel');
const adminUser = document.getElementById('adminUser');
const authError = document.getElementById('authError');

auth.onAuthStateChanged(async (user) => {
    console.log('🔔 Auth state changed:', user ? user.email : 'Not logged in');

    loadingPanel.classList.remove('hidden');
    authBox.classList.add('hidden');
    adminPanel.classList.add('hidden');

    if (user) {
        console.log('✅ Logged in as:', user.email);

        try {
            const isAdminUser = await isAdmin();
            
            if (isAdminUser) {
                console.log('✅ Admin verified! Access granted.');
                loadingPanel.classList.add('hidden');
                authBox.classList.add('hidden');
                adminPanel.classList.remove('hidden');
                
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    const userData = userDoc.data();
                    adminUser.textContent = '👋 ' + (userData?.fullName || user.email);
                } catch (e) {
                    adminUser.textContent = '👋 ' + user.email;
                }
                
                await loadAllData();
                toast('✅ Welcome Admin!');
            } else {
                console.warn('⛔ User is not an admin. Access denied.');
                loadingPanel.classList.add('hidden');
                authBox.classList.remove('hidden');
                adminPanel.classList.add('hidden');
                authError.textContent = '⛔ Access Denied. Admin privileges required.';
                authError.style.color = '#c0392b';
                
                await auth.signOut();
                toast('⛔ Admin access only.', true);
            }
        } catch (err) {
            console.error('❌ Admin check error:', err);
            loadingPanel.classList.add('hidden');
            authBox.classList.remove('hidden');
            adminPanel.classList.add('hidden');
            authError.textContent = '❌ Error verifying admin status.';
            authError.style.color = '#c0392b';
            toast('⚠️ Error: ' + err.message, true);
        }

    } else {
        console.log('🔓 Not logged in.');
        loadingPanel.classList.add('hidden');
        authBox.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        authError.textContent = '';
    }
});

// ============================================================
// 🔐 LOGIN HANDLER
// ============================================================
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        authError.textContent = '⚠️ Please fill in all fields.';
        authError.style.color = '#c0392b';
        return;
    }

    authError.textContent = '';
    loadingPanel.classList.remove('hidden');
    authBox.classList.add('hidden');

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        console.error('❌ Login error:', err.message);
        loadingPanel.classList.add('hidden');
        authBox.classList.remove('hidden');
        
        const errorMessages = {
            'auth/user-not-found': '❌ No account found with this email.',
            'auth/wrong-password': '❌ Incorrect password.',
            'auth/invalid-email': '❌ Invalid email format.',
            'auth/user-disabled': '❌ This account has been disabled.',
            'auth/too-many-requests': '⚠️ Too many failed attempts.',
            'auth/network-request-failed': '⚠️ Network error.'
        };
        authError.textContent = errorMessages[err.code] || '❌ Login failed: ' + err.message;
        authError.style.color = '#c0392b';
        toast('❌ Login failed', true);
    }
});

document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('loginEmail').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPassword').focus();
});

// ============================================================
// 🔐 LOGOUT
// ============================================================
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        toast('👋 Logged out successfully.');
    } catch (err) {
        toast('❌ Error logging out: ' + err.message, true);
    }
});

// ============================================================
// 📤 SUBMIT FORMS
// ============================================================

// ---- PLAYER FORM ----
document.getElementById('playerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Adding...';
    
    try {
        const name = document.getElementById('playerName').value.trim();
        if (!name) {
            toast('⚠️ Player name is required.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Player';
            return;
        }
        
        const existing = await db.collection('players')
            .where('name', '==', name)
            .get();
        if (!existing.empty) {
            toast('⚠️ A player with this name already exists.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Player';
            return;
        }
        
        let photoURL = null;
        const photoFile = document.getElementById('playerPhoto').files[0];
        if (photoFile) {
            try {
                photoURL = await uploadImage(photoFile, 'players');
            } catch (err) {
                toast('⚠️ Image upload failed: ' + err.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = '➕ Add Player';
                return;
            }
        }
        
        await addDoc('players', {
            name: name,
            category: document.getElementById('playerCategory').value,
            wins: Number(document.getElementById('playerWins').value) || 0,
            losses: Number(document.getElementById('playerLosses').value) || 0,
            points: Number(document.getElementById('playerPoints').value) || 0,
            bio: document.getElementById('playerBio').value.trim() || '',
            photoURL: photoURL
        });
        
        toast('✅ Player added successfully!');
        document.getElementById('playerForm').reset();
        document.getElementById('playerPhoto').value = '';
        await loadAllData();
    } catch (err) {
        toast('❌ Error: ' + err.message, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add Player';
    }
});

// ---- FIXTURE FORM ----
document.getElementById('fixtureForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Adding...';
    
    try {
        const opponent = document.getElementById('fixtureOpponent').value.trim();
        const date = document.getElementById('fixtureDate').value;
        const venue = document.getElementById('fixtureVenue').value.trim();
        
        if (!opponent || !date || !venue) {
            toast('⚠️ Please fill in all required fields.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Fixture';
            return;
        }
        
        const matchDate = firebase.firestore.Timestamp.fromDate(new Date(date));
        
        await addDoc('fixtures', {
            opponent: opponent,
            matchDate: matchDate,
            matchTime: document.getElementById('fixtureTime').value || null,
            venue: venue,
            completed: false
        });
        
        toast('✅ Fixture added successfully!');
        document.getElementById('fixtureForm').reset();
        await loadAllData();
    } catch (err) {
        toast('❌ Error: ' + err.message, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add Fixture';
    }
});

// ---- NEWS FORM ----
document.getElementById('newsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Adding...';
    
    try {
        const title = document.getElementById('newsTitle').value.trim();
        const excerpt = document.getElementById('newsExcerpt').value.trim();
        
        if (!title || !excerpt) {
            toast('⚠️ Title and excerpt are required.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add News';
            return;
        }
        
        let imageURL = null;
        const imageFile = document.getElementById('newsImage').files[0];
        if (imageFile) {
            try {
                imageURL = await uploadImage(imageFile, 'news');
            } catch (err) {
                toast('⚠️ Image upload failed: ' + err.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = '➕ Add News';
                return;
            }
        }
        
        await addDoc('news', {
            title: title,
            tag: document.getElementById('newsTag').value,
            excerpt: excerpt,
            published: Number(document.getElementById('newsPublished').value),
            publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
            imageURL: imageURL
        });
        
        toast('✅ News added successfully!');
        document.getElementById('newsForm').reset();
        document.getElementById('newsImage').value = '';
        await loadAllData();
    } catch (err) {
        toast('❌ Error: ' + err.message, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add News';
    }
});

// ---- RESULT FORM ----
document.getElementById('resultForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Adding...';
    
    try {
        const fixtureId = document.getElementById('resultFixtureId').value;
        const score = document.getElementById('resultScore').value.trim();
        const outcome = document.getElementById('resultOutcome').value;
        const opponent = document.getElementById('resultOpponent').value;
        const date = document.getElementById('resultMatchDate').value;
        
        if (!fixtureId) {
            toast('⚠️ Please select a fixture.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Result';
            return;
        }
        
        if (!score) {
            toast('⚠️ Please enter the score.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Result';
            return;
        }
        
        const existingResults = await db.collection('results')
            .where('fixtureId', '==', fixtureId)
            .get();
        if (!existingResults.empty) {
            toast('⚠️ This fixture already has a result.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Result';
            return;
        }
        
        const fixtureDoc = await db.collection('fixtures').doc(fixtureId).get();
        if (!fixtureDoc.exists) {
            toast('⚠️ The selected fixture no longer exists.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Result';
            return;
        }
        
        const fixtureData = fixtureDoc.data();
        
        await addDoc('results', {
            fixtureId: fixtureId,
            fixtureOpponent: fixtureData.opponent || opponent,
            opponent: fixtureData.opponent || opponent,
            matchDate: firebase.firestore.Timestamp.fromDate(new Date(date)),
            score: score,
            outcome: outcome,
            venue: fixtureData.venue || 'TBA',
            matchTime: fixtureData.matchTime || 'TBC'
        });
        
        await db.collection('fixtures').doc(fixtureId).update({
            completed: true,
            resultScore: score,
            resultOutcome: outcome,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        toast('✅ Result added successfully!');
        document.getElementById('resultForm').reset();
        document.getElementById('resultOpponent').value = '';
        document.getElementById('resultDisplayDate').value = '';
        document.getElementById('resultFixtureId').value = '';
        document.getElementById('resultMatchDate').value = '';
        await loadAllData();
        
    } catch (err) {
        toast('❌ Error: ' + err.message, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add Result';
    }
});

// ============================================================
// 🗂️ TAB SWITCHING
// ============================================================
document.querySelectorAll('#adminTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#adminTabs .tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const tab = this.dataset.tab;
        document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`tab-${tab}`);
        if (target) target.classList.add('active');
        
        if (tab === 'results') {
            populateFixtureDropdown();
        }
    });
});

// ============================================================
// 🚀 SEED ADMIN USER (Run in console)
// ============================================================
window.seedAdminUser = async function(email, password, fullName) {
    try {
        let user;
        try {
            const userCred = await auth.createUserWithEmailAndPassword(email, password);
            user = userCred.user;
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                const userCred = await auth.signInWithEmailAndPassword(email, password);
                user = userCred.user;
            } else {
                throw err;
            }
        }
        
        await db.collection('admins').doc('admin-list').set({
            adminIds: [user.uid],
            ownerId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        await db.collection('users').doc(user.uid).set({
            fullName: fullName || 'Admin User',
            email: email,
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('✅ Admin user created!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        toast('✅ Admin setup complete!');
        return true;
    } catch (err) {
        console.error('❌ Error:', err.message);
        toast('❌ Error: ' + err.message, true);
        return false;
    }
};

// ============================================================
// 🚀 INIT
// ============================================================
console.log('✅ Admin panel loaded successfully.');
console.log('📧 To create admin user, run:');
console.log('   await seedAdminUser("email@example.com", "password", "Full Name")');