// ============================================================
// BASELINE TC — MAIN SITE JAVASCRIPT
// ============================================================

// ============================================================
// 🔍 SEARCH & FILTER PLAYERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 Main site loaded. Loading data from Firestore...');
    loadAllData();

    // Player search
    const searchInput = document.getElementById('playerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = (window.__players || []).filter(p =>
                p.name.toLowerCase().includes(query)
            );
            renderPlayers(filtered);
        });
    }

    // Category filters
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            const filter = this.dataset.filter;
            const filtered = (window.__players || []).filter(p =>
                filter === 'All' || p.category === filter
            );
            renderPlayers(filtered);
        });
    });
});

// ============================================================
// 📥 LOAD DATA FROM FIRESTORE
// ============================================================
let allFixtures = [];
let allResults = [];

async function loadAllData() {
    console.log('📥 Loading data from Firestore...');

    try {
        const [playersSnap, fixturesSnap, resultsSnap, newsSnap, txSnap] = await Promise.all([
            db.collection('players').orderBy('points', 'desc').get(),
            db.collection('fixtures').orderBy('matchDate', 'asc').get(),
            db.collection('results').orderBy('matchDate', 'desc').get(),
            db.collection('news').orderBy('publishedAt', 'desc').get(),
            db.collection('transactions').where('status', '==', 'success').orderBy('createdAt', 'desc').limit(50).get()
        ]);

        const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allFixtures = fixturesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const news = newsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        console.log(`✅ Loaded: ${players.length} players, ${allFixtures.length} fixtures, ${news.length} news, ${allResults.length} results`);

        // Store players globally for search/filter
        window.__players = players;

        // Render everything
        renderPlayers(players);
        renderRankings(players);
        renderFixtures(allFixtures);
        renderResults(allResults);
        renderNews(news);
        renderTransactions(transactions);
        updateProgress(transactions);

        // Hide loader
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('done');

    } catch (err) {
        console.error('❌ Error loading data:', err);
        toast('Failed to load data. Check console for details.');
        
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('done');
    }
}

// ============================================================
// 📅 FIXTURES — DISPLAY NEXT ROUND ONLY WITH VIEW MORE
// ============================================================
let fixturesShowing = 0;
const FIXTURES_PER_PAGE = 3;

// Helper function to clean opponent name (remove leading "vs")
function cleanOpponentName(name) {
    if (!name) return 'TBD';
    let cleaned = name;
    // Remove "vs " from the beginning if it exists
    cleaned = cleaned.replace(/^vs\s+/i, '');
    // Also remove "vs" without space
    cleaned = cleaned.replace(/^vs/i, '');
    // If empty after cleaning, return original
    return cleaned.trim() || name;
}

function renderFixtures(fixtures) {
    const list = document.getElementById('upcomingList');
    if (!list) return;

    console.log('📅 Rendering fixtures:', fixtures);

    if (!fixtures || fixtures.length === 0) {
        list.innerHTML = '<p style="color:#888; padding:20px;">No upcoming fixtures scheduled.</p>';
        return;
    }

    // Get current date
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Separate upcoming and past fixtures
    const upcomingFixtures = fixtures.filter(f => {
        let matchDate = getDateFromFirestore(f.matchDate);
        return matchDate >= now;
    });

    const pastFixtures = fixtures.filter(f => {
        let matchDate = getDateFromFirestore(f.matchDate);
        return matchDate < now;
    });

    // Sort upcoming by date (ascending)
    upcomingFixtures.sort((a, b) => {
        return getDateFromFirestore(a.matchDate) - getDateFromFirestore(b.matchDate);
    });

    // Sort past by date (descending - most recent first)
    pastFixtures.sort((a, b) => {
        return getDateFromFirestore(b.matchDate) - getDateFromFirestore(a.matchDate);
    });

    // Combine: Upcoming first, then past
    const sortedFixtures = [...upcomingFixtures, ...pastFixtures];

    // Store the full list for "View More"
    window.__allFixtures = sortedFixtures;
    
    // Show only the next round (upcoming fixtures)
    const nextRoundFixtures = upcomingFixtures;
    
    if (nextRoundFixtures.length === 0) {
        list.innerHTML = `
            <p style="color:#888; padding:20px;">No upcoming fixtures. Check back soon!</p>
            ${pastFixtures.length > 0 ? `
                <div style="text-align:center; margin-top:10px;">
                    <button class="view-more-btn" onclick="showAllFixtures()">
                        📊 View Past Fixtures (${pastFixtures.length})
                    </button>
                </div>
            ` : ''}
        `;
        return;
    }

    // Show only the next round (the first upcoming fixture)
    const nextRound = nextRoundFixtures.slice(0, 1);
    
    list.innerHTML = nextRound.map(f => {
        const date = getDateFromFirestore(f.matchDate);
        // ✅ FIX: Clean opponent name - remove leading "vs"
        const opponentName = cleanOpponentName(f.opponent);
        
        return `
            <div class="fx-card next-match">
                <div class="fx-date">
                    <div class="d">${date.getDate()}</div>
                    <div class="m">${date.toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div class="fx-info">
                    <div class="vs">${escapeHTML(opponentName)}</div>
                    <div class="meta">${escapeHTML(f.venue || 'TBA')} · ${escapeHTML(f.matchTime || 'TBC')}</div>
                </div>
                <div class="next-match-badge">⚡ NEXT MATCH</div>
            </div>
        `;
    }).join('');

    // Add "View More" button if there are more fixtures
    const totalOtherFixtures = upcomingFixtures.length - 1 + pastFixtures.length;
    
    if (totalOtherFixtures > 0) {
        const viewMoreHTML = `
            <div style="text-align:center; margin-top: 20px;">
                <button class="view-more-btn" onclick="showAllFixtures()">
                    📅 View All Fixtures (${totalOtherFixtures} more)
                </button>
            </div>
        `;
        list.innerHTML += viewMoreHTML;
    }

    console.log(`✅ Rendered ${nextRound.length} next match(es)`);
}

// ============================================================
// 📊 RESULTS — DISPLAY CURRENT ROUND ONLY WITH VIEW MORE
// ============================================================
let resultsShowing = 0;
const RESULTS_PER_PAGE = 3;

function renderResults(results) {
    const list = document.getElementById('resultsList');
    if (!list) return;

    console.log('📊 Rendering results:', results);

    if (!results || results.length === 0) {
        list.innerHTML = '<p style="color:#888; padding:20px;">No results recorded yet.</p>';
        return;
    }

    // Sort by date (most recent first)
    const sortedResults = [...results].sort((a, b) => {
        return getDateFromFirestore(b.matchDate) - getDateFromFirestore(a.matchDate);
    });

    // Store full list for "View More"
    window.__allResults = sortedResults;

    // Show only the most recent result (current round)
    const currentRound = sortedResults.slice(0, 1);

    list.innerHTML = currentRound.map(r => {
        const date = getDateFromFirestore(r.matchDate);
        const outcomeClass = r.outcome === 'win' ? 'win' : r.outcome === 'loss' ? 'loss' : '';
        const outcomeText = r.outcome ? r.outcome.toUpperCase() : '—';
        const icon = r.outcome === 'win' ? '🏆' : r.outcome === 'loss' ? '💪' : '➖';
        
        // ✅ FIX: Clean opponent name - remove leading "vs"
        const opponentName = cleanOpponentName(r.opponent || r.fixtureOpponent);
        
        return `
            <div class="fx-card result current-round">
                <div class="fx-date">
                    <div class="d">${date.getDate()}</div>
                    <div class="m">${date.toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div class="fx-info">
                    <div class="vs">${escapeHTML(opponentName)}</div>
                    <div class="meta">League fixture</div>
                </div>
                <div class="fx-score">${escapeHTML(r.score || '—')}</div>
                <div class="fx-outcome ${outcomeClass}">${icon} ${outcomeText}</div>
            </div>
        `;
    }).join('');

    // Add "View More" button if there are more results
    if (sortedResults.length > 1) {
        const viewMoreHTML = `
            <div style="text-align:center; margin-top: 20px;">
                <button class="view-more-btn" onclick="showAllResults()">
                    📊 View All Results (${sortedResults.length - 1} more)
                </button>
            </div>
        `;
        list.innerHTML += viewMoreHTML;
    }

    console.log(`✅ Rendered ${currentRound.length} current round result(s)`);
}

// ============================================================
// 🖥️ RENDER PLAYERS
// ============================================================
function renderPlayers(players) {
    const grid = document.getElementById('playerGrid');
    if (!grid) {
        console.warn('⚠️ playerGrid not found');
        return;
    }

    if (!players || players.length === 0) {
        grid.innerHTML = '<p style="color:#888; padding:20px;">No players yet. Add some in the admin panel!</p>';
        return;
    }

    grid.innerHTML = players.map(p => `
        <div class="player-card">
            <div class="player-photo">
                ${p.photoURL 
                    ? `<img src="${p.photoURL}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">`
                    : `<span>${p.name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('')}</span>`
                }
                <div class="rank-badge">#${p.rank || p.points}</div>
            </div>
            <div class="player-body">
                <h3>${escapeHTML(p.name)}</h3>
                <div class="player-tag">${escapeHTML(p.category || 'Singles')}</div>
                <div class="player-stats">
                    <div><b>${p.wins || 0}-${p.losses || 0}</b>W-L</div>
                    <div><b>${p.points || 0}</b>Points</div>
                </div>
                <p class="player-bio">${escapeHTML(p.bio || '')}</p>
            </div>
        </div>
    `).join('');

    console.log(`✅ Rendered ${players.length} players`);
}

// ============================================================
// 🖥️ RENDER RANKINGS
// ============================================================
function renderRankings(players) {
    const tbody = document.getElementById('rankBody');
    if (!tbody) return;

    const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
    const medals = ['g', 's', 'b'];

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">No players yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map((p, i) => `
        <tr class="${i === 0 ? 'top1' : ''}">
            <td>${i < 3 ? `<span class="medal ${medals[i]}">${i + 1}</span>` : (i + 1)}</td>
            <td class="rank-row-name">${escapeHTML(p.name)}</td>
            <td>${escapeHTML(p.category || 'Singles')}</td>
            <td>${p.wins || 0}–${p.losses || 0}</td>
            <td>
                <div class="bar-bg">
                    <div class="bar-fill" style="width:${Math.round(((p.wins || 0) / ((p.wins || 0) + (p.losses || 1))) * 100)}%"></div>
                </div>
            </td>
            <td class="pts">${p.points || 0}</td>
        </tr>
    `).join('');
}

// ============================================================
// 🖥️ RENDER NEWS
// ============================================================
function renderNews(news) {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;

    if (!news || news.length === 0) {
        grid.innerHTML = '<p style="color:#888; padding:20px;">No news articles yet.</p>';
        return;
    }

    grid.innerHTML = news.map(n => {
        let date = new Date();
        if (n.publishedAt) {
            if (typeof n.publishedAt.toDate === 'function') {
                date = n.publishedAt.toDate();
            } else if (n.publishedAt.seconds) {
                date = new Date(n.publishedAt.seconds * 1000);
            }
        }
        
        return `
            <div class="news-card">
                <div class="thumb" style="${n.imageURL ? `background-image: url('${n.imageURL}'); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, var(--green), var(--navy));'}">
                    <span class="news-tag">${escapeHTML(n.tag || 'Announcement')}</span>
                </div>
                <div class="news-body">
                    <div class="news-date">${date.toLocaleDateString()}</div>
                    <h3>${escapeHTML(n.title)}</h3>
                    <p>${escapeHTML(n.excerpt || '')}</p>
                    <div class="news-read">Read more →</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// 📊 TRANSACTIONS
// ============================================================
function renderTransactions(transactions) {
    const list = document.getElementById('txList');
    if (!list) return;

    if (!transactions || transactions.length === 0) {
        list.innerHTML = '<p style="color:#888;">No transactions yet.</p>';
        return;
    }

    list.innerHTML = transactions.map(t => {
        let date = new Date();
        if (t.createdAt) {
            if (typeof t.createdAt.toDate === 'function') {
                date = t.createdAt.toDate();
            } else if (t.createdAt.seconds) {
                date = new Date(t.createdAt.seconds * 1000);
            }
        }
        
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--gray); border-radius:6px;">
                <div>
                    <div style="font-weight:700; font-size:13.5px;">${escapeHTML(t.donorName || 'Anonymous')}</div>
                    <div style="font-size:11.5px; color:#888;">${date.toLocaleDateString()}</div>
                </div>
                <div class="mono" style="font-weight:700; color:var(--green);">KES ${Number(t.amount || 0).toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

// ============================================================
// 📈 PROGRESS
// ============================================================
function updateProgress(transactions) {
    const total = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const goal = 500000;
    const pct = Math.min((total / goal) * 100, 100);

    const raisedEl = document.getElementById('raisedAmount');
    const fillEl = document.getElementById('progressFill');
    if (raisedEl) raisedEl.textContent = `KES ${total.toLocaleString()} raised`;
    if (fillEl) fillEl.style.width = `${pct}%`;
}

// ============================================================
// 🛡️ HELPER FUNCTIONS
// ============================================================

// Escape HTML (Prevents XSS)
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Get Date from Firestore Timestamp
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

// Helper function to clean opponent name (remove leading "vs")
function cleanOpponentName(name) {
    if (!name) return 'TBD';
    let cleaned = name;
    // Remove "vs " from the beginning if it exists
    cleaned = cleaned.replace(/^vs\s+/i, '');
    // Also remove "vs" without space
    cleaned = cleaned.replace(/^vs/i, '');
    // If empty after cleaning, return original
    return cleaned.trim() || name;
}

// ============================================================
// 📅 VIEW MORE FUNCTIONS
// ============================================================

// Show all fixtures
function showAllFixtures() {
    const list = document.getElementById('upcomingList');
    if (!list || !window.__allFixtures) return;

    const allFixtures = window.__allFixtures;
    
    if (allFixtures.length === 0) {
        list.innerHTML = '<p style="color:#888; padding:20px;">No fixtures available.</p>';
        return;
    }

    // Check if already showing all
    if (list.dataset.showingAll === 'true') {
        // Collapse back to next round
        renderFixtures(allFixtures);
        list.dataset.showingAll = 'false';
        return;
    }

    // Show all fixtures
    list.innerHTML = allFixtures.map(f => {
        const date = getDateFromFirestore(f.matchDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isUpcoming = date >= now;
        
        // ✅ FIX: Clean opponent name - remove leading "vs"
        const opponentName = cleanOpponentName(f.opponent);
        
        return `
            <div class="fx-card ${isUpcoming ? '' : 'past-fixture'}">
                <div class="fx-date">
                    <div class="d">${date.getDate()}</div>
                    <div class="m">${date.toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div class="fx-info">
                    <div class="vs">${escapeHTML(opponentName)}</div>
                    <div class="meta">${escapeHTML(f.venue || 'TBA')} · ${escapeHTML(f.matchTime || 'TBC')}</div>
                </div>
                ${isUpcoming ? '<div class="next-match-badge" style="background:#4CAF50;">📅 Upcoming</div>' : '<div class="next-match-badge" style="background:#888;">✅ Past</div>'}
            </div>
        `;
    }).join('');

    // Add "Show Less" button
    list.innerHTML += `
        <div style="text-align:center; margin-top: 20px;">
            <button class="view-more-btn" onclick="showAllFixtures()" style="background:#666;">
                🔽 Show Less
            </button>
        </div>
    `;

    list.dataset.showingAll = 'true';
}

// Show all results
function showAllResults() {
    const list = document.getElementById('resultsList');
    if (!list || !window.__allResults) return;

    const allResults = window.__allResults;
    
    if (allResults.length === 0) {
        list.innerHTML = '<p style="color:#888; padding:20px;">No results available.</p>';
        return;
    }

    // Check if already showing all
    if (list.dataset.showingAll === 'true') {
        // Collapse back to current round
        renderResults(allResults);
        list.dataset.showingAll = 'false';
        return;
    }

    // Show all results
    list.innerHTML = allResults.map(r => {
        const date = getDateFromFirestore(r.matchDate);
        const outcomeClass = r.outcome === 'win' ? 'win' : r.outcome === 'loss' ? 'loss' : '';
        const outcomeText = r.outcome ? r.outcome.toUpperCase() : '—';
        const icon = r.outcome === 'win' ? '🏆' : r.outcome === 'loss' ? '💪' : '➖';
        
        // ✅ FIX: Clean opponent name - remove leading "vs"
        const opponentName = cleanOpponentName(r.opponent || r.fixtureOpponent);
        
        return `
            <div class="fx-card result">
                <div class="fx-date">
                    <div class="d">${date.getDate()}</div>
                    <div class="m">${date.toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div class="fx-info">
                    <div class="vs">${escapeHTML(opponentName)}</div>
                    <div class="meta">League fixture</div>
                </div>
                <div class="fx-score">${escapeHTML(r.score || '—')}</div>
                <div class="fx-outcome ${outcomeClass}">${icon} ${outcomeText}</div>
            </div>
        `;
    }).join('');

    // Add "Show Less" button
    list.innerHTML += `
        <div style="text-align:center; margin-top: 20px;">
            <button class="view-more-btn" onclick="showAllResults()" style="background:#666;">
                🔽 Show Less
            </button>
        </div>
    `;

    list.dataset.showingAll = 'true';
}

// ============================================================
// 🔐 AUTHENTICATION
// ============================================================
auth.onAuthStateChanged(async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const adminBtn = document.getElementById('adminBtn');

    if (user) {
        if (loginBtn) {
            loginBtn.textContent = 'Log out';
            loginBtn.onclick = () => {
                auth.signOut();
                toast('Logged out.');
            };
        }

        // Check if admin
        try {
            const adminCheck = await isAdmin();
            if (adminBtn) {
                if (adminCheck) {
                    adminBtn.classList.remove('hidden');
                    adminBtn.onclick = () => {
                        window.location.href = 'admin.html';
                    };
                } else {
                    adminBtn.classList.add('hidden');
                }
            }
        } catch (err) {
            console.warn('Admin check failed:', err.message);
        }
    } else {
        if (loginBtn) {
            loginBtn.textContent = 'Log in';
            loginBtn.onclick = () => openModal(document.getElementById('authModal'));
        }
        if (adminBtn) {
            adminBtn.classList.add('hidden');
        }
    }
});

// ============================================================
// 📱 M-PESA STK PUSH (DEMO)
// ============================================================
let chosenAmount = 500;

document.querySelectorAll('#amountOptions button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#amountOptions button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        chosenAmount = Number(this.dataset.amt);
        const custom = document.getElementById('customAmount');
        if (custom) custom.value = '';
    });
});

const customAmount = document.getElementById('customAmount');
if (customAmount) {
    customAmount.addEventListener('input', function() {
        if (this.value) {
            chosenAmount = Number(this.value);
            document.querySelectorAll('#amountOptions button').forEach(b => b.classList.remove('active'));
        }
    });
}

document.getElementById('stkBtn')?.addEventListener('click', async function() {
    const phone = document.getElementById('phoneInput').value.trim();
    if (!phone || phone.length < 9) {
        toast('Enter a valid M-Pesa phone number.');
        return;
    }
    if (!chosenAmount || chosenAmount <= 0) {
        toast('Choose or enter an amount.');
        return;
    }

    const stkModal = document.getElementById('stkModal');
    const stkStatus = document.getElementById('stkStatus');
    stkStatus.classList.remove('success');
    document.getElementById('stkSub').textContent = `Sending prompt to ${phone}…`;
    document.getElementById('stkMsg').textContent = 'Waiting for M-Pesa confirmation…';
    openModal(stkModal);

    setTimeout(async () => {
        await db.collection('transactions').add({
            donorName: 'Anonymous supporter',
            phone: phone,
            amount: chosenAmount,
            status: 'success',
            mpesaReceipt: `DEMO${Date.now()}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        stkStatus.classList.add('success');
        document.getElementById('stkSub').textContent = 'Payment received';
        document.getElementById('stkMsg').textContent = `KES ${chosenAmount.toLocaleString()} confirmed. Thank you!`;

        setTimeout(() => {
            closeModal(stkModal);
            loadAllData();
        }, 1500);
    }, 2500);
});

// ============================================================
// 🧩 MODAL HELPERS
// ============================================================
function openModal(modal) {
    if (modal) modal.classList.add('open');
}

function closeModal(modal) {
    if (modal) modal.classList.remove('open');
}

document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', function() {
        closeModal(this.closest('.modal-backdrop'));
    });
});

document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
    });
});

// Auth modal triggers
document.getElementById('loginBtn')?.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        auth.signOut();
        toast('Logged out.');
    } else {
        openModal(document.getElementById('authModal'));
    }
});

document.getElementById('footerLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(document.getElementById('authModal'));
});

document.getElementById('footerSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    const signupBtn = document.querySelector('[data-mode="signup"]');
    if (signupBtn) signupBtn.click();
    openModal(document.getElementById('authModal'));
});

// Auth form submit
document.getElementById('authForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const mode = document.querySelector('.modal-toggle .active')?.dataset.mode || 'login';
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('signupName').value;

    if (!email || !password) {
        toast('Please fill in all fields.');
        return;
    }

    const authAction = mode === 'signup' ?
        auth.createUserWithEmailAndPassword(email, password) :
        auth.signInWithEmailAndPassword(email, password);

    authAction
        .then((cred) => {
            if (mode === 'signup' && name) {
                cred.user.updateProfile({ displayName: name });
                db.collection('users').doc(cred.user.uid).set({
                    fullName: name,
                    email: email,
                    role: 'fan',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            toast(mode === 'signup' ? 'Account created! Welcome!' : 'Welcome back!');
            closeModal(document.getElementById('authModal'));
            this.reset();
            loadAllData();
        })
        .catch((err) => {
            const errorMessages = {
                'auth/user-not-found': 'No account found with this email.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/invalid-email': 'Invalid email format.',
                'auth/email-already-in-use': 'Email already registered.',
                'auth/weak-password': 'Password should be at least 6 characters.',
                'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
            };
            toast(errorMessages[err.code] || err.message);
        });
});

// Toggle login/signup modes
document.querySelectorAll('.modal-toggle [data-mode]').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.modal-toggle [data-mode]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const isSignup = this.dataset.mode === 'signup';
        const title = document.getElementById('authTitle');
        const sub = document.getElementById('authSub');
        const nameField = document.getElementById('signupName');
        if (title) title.textContent = isSignup ? 'Create your account' : 'Welcome back';
        if (sub) sub.textContent = isSignup ? 'Sign up as a fan or player.' : 'Log in to follow players.';
        if (nameField) nameField.classList.toggle('hidden', !isSignup);
    });
});

// History modal
document.getElementById('historyBtn')?.addEventListener('click', () => openModal(document.getElementById('historyModal')));
document.getElementById('historyLink2')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(document.getElementById('historyModal'));
});

// Toast
function toast(msg, isError = false) {
    const el = document.getElementById('toast');
    if (!el) return;
    const msgEl = document.getElementById('toastMsg');
    if (!msgEl) return;
    
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
    }, 3000);
}

// Mobile nav
document.getElementById('menuToggle')?.addEventListener('click', function() {
    document.getElementById('navLinks')?.classList.toggle('open');
});

// Loader
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('done');
        }, 3000);
    }
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        const upcoming = document.getElementById('upcomingList');
        const results = document.getElementById('resultsList');
        if (upcoming) upcoming.classList.toggle('hidden', tab !== 'upcoming');
        if (results) results.classList.toggle('hidden', tab !== 'results');
    });
});

console.log('✅ script.js loaded successfully.');