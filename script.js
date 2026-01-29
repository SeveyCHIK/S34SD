/* --- НАСТРОЙКИ БАЗЫ (ВСТАВЬ СВОИ ДАННЫЕ) --- */
const BIN_ID = 'СЮДА_ТВОЙ_BIN_ID';       // Например: 65a8f123...
const API_KEY = 'СЮДА_ТВОЙ_MASTER_KEY';  // Например: $2a$10...

/* --- API СЛОЙ (РАБОТАЕТ БЕЗ NODE.JS) --- */
const api = {
    async get() {
        try {
            const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: { 'X-Master-Key': API_KEY }
            });
            if (!r.ok) throw new Error('Ошибка базы');
            const data = await r.json();
            return data.record.users || [];
        } catch (e) {
            console.error(e);
            alert("Ошибка соединения с базой! Проверь ключи в script.js");
            return [];
        }
    },
    async save(usersData) {
        try {
            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify({ users: usersData })
            });
        } catch (e) {
            console.error("Ошибка сохранения:", e);
        }
    }
};

/* --- ПРИЛОЖЕНИЕ (ЛОГИКА ОСТАЛАСЬ ТА ЖЕ) --- */
const app = {
    users: [], user: null, replyTo: null,
    
    async init() {
        this.users = await api.get();
        // Загрузка темы
        if(localStorage.getItem('iljas_dark') === 'true') document.body.classList.add('dark-theme');
        
        const sess = localStorage.getItem('iljas_v8');
        if(sess) {
            const u = this.users.find(x => x.id === sess);
            if(u) { this.user = u; this.route(); return; }
        }
        this.router.go('auth');
        document.getElementById('login-form').onsubmit=(e)=>{e.preventDefault();this.auth.login()};
    },

    route() { this.router.go(this.user.isAdmin ? 'admin' : 'home'); },

    router: {
        go(p) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${p}`).classList.add('active');
            
            const nav = document.getElementById('nav-bar');
            if(p==='auth' || (app.user && app.user.isAdmin)) nav.style.display='none';
            else {
                nav.style.display='flex';
                document.querySelectorAll('.n-btn').forEach(b=>b.classList.remove('active'));
                if(p==='home') document.querySelectorAll('.n-btn')[0].classList.add('active');
                if(p==='transfer') document.querySelectorAll('.n-btn')[1].classList.add('active');
                if(p==='leaderboard') document.querySelectorAll('.n-btn')[2].classList.add('active');
                if(p==='profile') document.querySelectorAll('.n-btn')[3].classList.add('active');
            }
            if(p==='home') app.home.render();
            if(p==='leaderboard') app.leaderboard.render();
            if(p==='history') app.history.render();
            if(p==='admin') app.admin.render();
            if(p==='profile') app.ui.updateThemeBtn();
        }
    },

    auth: {
        login() {
            const a = document.getElementById('auth-acc').value;
            const p = document.getElementById('auth-pass').value;
            const u = app.users.find(x => x.accountNumber === a && x.pass === p);
            if(u) {
                app.user = u; localStorage.setItem('iljas_v8', u.id); app.route();
            } else alert('Неверно. Админ: 0000 / Toyota400');
        },
        logout() {
            localStorage.removeItem('iljas_v8'); app.user = null; app.router.go('auth');
        }
    },

    home: {
        render() {
            const u = app.user;
            document.getElementById('home-name').innerText = u.name;
            document.getElementById('home-name-header').innerText = u.name;
            document.getElementById('home-holder').innerText = u.name;
            document.getElementById('home-holder-back').innerText = u.name;
            document.getElementById('home-avatar').innerText = u.emoji || '👤';
            document.getElementById('home-bal').innerText = u.balance.toLocaleString();
            document.getElementById('home-acc').innerText = u.accountNumber;
            const c = document.querySelector('.card-body');
            if(u.isFrozen) c.parentElement.classList.add('frozen'); else c.parentElement.classList.remove('frozen');
        }
    },

    social: {
        viewId: null,
        open(uid) {
            this.viewId = uid;
            const u = app.users.find(x=>x.id===uid);
            document.getElementById('pp-name').innerText = u.name;
            document.getElementById('pp-avatar').innerText = u.emoji||'👤';
            document.getElementById('pp-acc').innerText = u.accountNumber;
            this.renderReacts(u);
            this.renderWall(u);
            document.getElementById('modal-pp').classList.add('active');
            this.cancelReply();
        },
        renderReacts(u) {
            const r = u.reactions || {};
            ['❤️','💩'].forEach(e => {
                const btn = document.getElementById(e==='❤️'?'btn-react-heart':'btn-react-poop');
                const list = r[e] || [];
                btn.querySelector('span').innerText = list.length;
                if(list.includes(app.user.id)) btn.classList.add('active'); else btn.classList.remove('active');
            });
        },
        async react(type) {
            const u = app.users.find(x=>x.id===this.viewId);
            if(!u.reactions) u.reactions={};
            if(!u.reactions[type]) u.reactions[type]=[];
            const l = u.reactions[type];
            const i = l.indexOf(app.user.id);
            if(i>-1) l.splice(i,1); else l.push(app.user.id);
            await api.save(app.users);
            this.renderReacts(u);
        },
        renderWall(u) {
            const w = u.wall || [];
            document.getElementById('pp-wall').innerHTML = w.map((m, idx) => {
                const isOwner = m.author === u.name;
                const isMe = m.author === app.user.name;
                const isProfileMine = app.user.id === u.id;
                return `
                <div class="msg ${isOwner ? 'is-owner' : ''}">
                    ${m.replyTo ? `<div class="reply-info">Ответ для: ${m.replyTo}</div>` : ''}
                    <div class="msg-head">
                        <span class="msg-auth">${m.author} ${isOwner ? '<span class="crown">👑</span>' : ''}</span>
                        <span>${new Date(m.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div class="msg-text">${m.text}</div>
                    <div class="msg-actions">
                        <span class="act-link" onclick="app.social.prepReply('${m.author}')">Ответить</span>
                        ${(isMe || isProfileMine) ? `<span class="act-link del" onclick="app.social.delMsg(${idx})">Удалить</span>` : ''}
                    </div>
                </div>`;
            }).join('');
        },
        prepReply(name) {
            app.replyTo = name;
            document.getElementById('reply-bar').classList.add('active');
            document.getElementById('reply-to-name').innerText = name;
        },
        cancelReply() {
            app.replyTo = null;
            document.getElementById('reply-bar').classList.remove('active');
        },
        async delMsg(idx) {
            const u = app.users.find(x=>x.id===this.viewId);
            u.wall.splice(idx, 1);
            await api.save(app.users);
            this.renderWall(u);
        },
        async post() {
            const now = Date.now();
            if(app.user.lastComment && (now - app.user.lastComment < 30000)) {
                return alert(`Подождите еще ${Math.ceil((30000-(now-app.user.lastComment))/1000)} сек`);
            }
            const txt = document.getElementById('wall-input').value.trim();
            if(!txt) return;
            const u = app.users.find(x=>x.id===this.viewId);
            if(!u.wall) u.wall=[];
            u.wall.push({ author: app.user.name, text: txt, time: now, replyTo: app.replyTo });
            app.user.lastComment = now;
            document.getElementById('wall-input').value = '';
            this.cancelReply();
            await api.save(app.users);
            this.renderWall(u);
        }
    },

    actions: {
        async transfer() {
            if(app.user.isFrozen) return alert('Счет заморожен');
            const dest = document.getElementById('tr-dest').value;
            const amt = parseInt(document.getElementById('tr-amount').value);
            if(!amt || amt<=0) return alert('Неверная сумма');
            if(app.user.balance < amt) return alert('Недостаточно средств');
            const target = app.users.find(x => x.accountNumber === dest);
            if(!target) return alert('Получатель не найден');
            if(target.id === app.user.id) return alert('Нельзя перевести себе');

            app.user.balance -= amt;
            target.balance += amt;
            const r = { type:'transfer', date:new Date().toLocaleDateString(), amt:amt, dir:'out' };
            if(!app.user.history) app.user.history=[];
            if(!target.history) target.history=[];
            app.user.history.unshift(r);
            target.history.unshift({...r, dir:'in'});
            
            await api.save(app.users);
            alert('Успешно');
            app.router.go('home');
        }
    },

    admin: {
        selId: null,
        render() {
            document.getElementById('adm-list').innerHTML = app.users.filter(u=>!u.isAdmin).map(u => `
                <div class="l-item" onclick="app.admin.mng('${u.id}')">
                    <div class="li-left">
                        <div class="li-av">${u.emoji}</div>
                        <div class="li-info">
                            <div>${u.name} ${u.isFrozen?'❄️':''}</div>
                            <div>${u.accountNumber} | ${u.pass}</div>
                        </div>
                    </div>
                    <div>${u.balance}</div>
                </div>
            `).join('');
        },
        async create() {
            const n = document.getElementById('adm-name').value;
            const em = document.getElementById('adm-emoji').value || '👤';
            if(!n) return;
            let acc; do{acc=Math.floor(1000+Math.random()*9000).toString()}while(app.users.find(u=>u.accountNumber===acc));
            const p = Math.random().toString(36).slice(-5);
            app.users.push({ id:Date.now().toString(), accountNumber:acc, pass:p, name:n, emoji:em, balance:0, isFrozen:false, isAdmin:false });
            await api.save(app.users);
            document.getElementById('new-acc').innerText = acc;
            document.getElementById('new-pass').innerText = p;
            document.getElementById('modal-cred').classList.add('active');
            document.getElementById('adm-name').value = '';
            this.render();
        },
        mng(id) {
            this.selId = id;
            const u = app.users.find(x=>x.id===id);
            document.getElementById('adm-mng-name').innerText = u.name;
            document.getElementById('btn-adm-freeze').innerText = u.isFrozen?'Разморозить':'Заморозить';
            document.getElementById('modal-adm').classList.add('active');
        },
        async bal() { const u=app.users.find(x=>x.id===this.selId); const v=prompt('Новый баланс:',u.balance); if(v) u.balance=parseInt(v); await api.save(app.users); this.render(); document.getElementById('modal-adm').classList.remove('active'); },
        async freeze() { const u=app.users.find(x=>x.id===this.selId); u.isFrozen=!u.isFrozen; await api.save(app.users); this.render(); document.getElementById('modal-adm').classList.remove('active'); },
        async del() { if(confirm('Удалить пользователя?')) { app.users=app.users.filter(x=>x.id!==this.selId); await api.save(app.users); this.render(); document.getElementById('modal-adm').classList.remove('active'); } }
    },
    
    leaderboard: {
        render() {
            const list = document.getElementById('lb-list');
            const sorted = [...app.users].filter(x=>!x.isAdmin).sort((a,b)=>b.balance - a.balance);
            list.innerHTML = sorted.map((u,i) => `
                <div class="l-item" onclick="app.social.open('${u.id}')" style="${u.isFrozen?'opacity:0.5':''}">
                    <div class="li-left">
                        <div style="font-weight:bold; width:20px; color:var(--primary)">${i+1}</div>
                        <div class="li-av">${u.emoji||'👤'}</div>
                        <div class="li-info">
                            <div>${u.name} ${u.isFrozen?'❄️':''}</div>
                            <div>Счет: ${u.accountNumber}</div>
                        </div>
                    </div>
                    <div style="font-weight:bold">${u.balance.toLocaleString()}</div>
                </div>
            `).join('');
        }
    },
    history: {
        render() {
            const list = document.getElementById('hist-list');
            const h = app.user.history || [];
            if(!h.length) return list.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5">Пусто</div>';
            list.innerHTML = h.map(x => `
                <div class="l-item">
                    <div class="li-left">
                        <div class="li-av">${x.dir==='in'?'⬇️':'↗️'}</div>
                        <div class="li-info"><div>${x.dir==='in'?'Входящий':'Перевод'}</div><div>${x.date}</div></div>
                    </div>
                    <div style="color:${x.dir==='in'?'var(--primary)':'inherit'}; font-weight:bold">${x.dir==='in'?'+':'-'}${x.amt}</div>
                </div>
            `).join('');
        }
    },
    ui: {
        closeModal() { document.querySelectorAll('.modal').forEach(x=>x.classList.remove('active')); },
        updateThemeBtn() {
            const isDark = document.body.classList.contains('dark-theme');
            document.getElementById('theme-status').innerText = isDark ? 'ON' : 'OFF';
        },
        toggleTheme() {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('iljas_dark', document.body.classList.contains('dark-theme'));
            this.updateThemeBtn();
        }
    }
};

window.onload = () => app.init();
