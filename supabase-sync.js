/* Gym Diary cloud sync. Uses only the public publishable key; RLS scopes rows by auth.uid(). */
(() => {
  const SUPABASE_URL = 'https://nlpjxunxsiqjlplvbyna.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_eZ_2XJfXjOxKpVVBfLvM5g_NAVvudI7';
  const STORAGE_KEY = 'gymDiary.v11';
  let client = null, currentUser = null, busy = false, ready = false, timer = null;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '☁ Войти / синхронизация';
  button.setAttribute('aria-label', 'Вход и синхронизация дневника');
  Object.assign(button.style, {position:'fixed',right:'10px',bottom:'calc(env(safe-area-inset-bottom) + 92px)',zIndex:'1000',padding:'9px 12px',borderRadius:'12px',border:'1px solid #3a4a2c',background:'#182015',color:'#c8f24e',font:'600 12px system-ui',boxShadow:'0 3px 14px #0008'});
  document.body.appendChild(button);
  const status = (s) => { button.textContent = s; };
  const loadSDK = () => new Promise((resolve,reject) => {
    if (window.supabase?.createClient) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = resolve; script.onerror = () => reject(new Error('Не загрузилась библиотека Supabase'));
    document.head.appendChild(script);
  });
  const localPayload = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { return null; }
  };
  const writeCloud = async () => {
    if (!client || !currentUser || !ready || busy) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const payload = localPayload();
        if (!payload) return;
        const { error } = await client.from('gym_diary_data').upsert({
          user_id: currentUser.id, payload, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
        status('☁ Синхронизировано');
      } catch (e) {
        status('☁ Ошибка синхронизации');
        console.error('Gym Diary sync:', e.message);
      }
    }, 1200);
  };
  const pullOrChoose = async () => {
    ready = false;
    const { data, error } = await client.from('gym_diary_data').select('payload,updated_at').eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    const local = localPayload();
    if (data?.payload) {
      const useCloud = confirm('В облаке уже есть дневник. Нажми OK, чтобы загрузить его на это устройство. Нажми «Отмена», чтобы оставить данные этого устройства и отправить их в облако.');
      if (useCloud) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.payload));
        location.reload();
        return;
      }
    }
    ready = true;
    await writeCloud();
    status('☁ Синхронизация включена');
  };
  const updateAuthButton = (session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      status('☁ ' + (currentUser.email || 'Вошли'));
      ready = true;
    } else {
      ready = false;
      status('☁ Войти / синхронизация');
    }
  };
  button.addEventListener('click', async () => {
    try {
      if (!client) {
        status('Подключаю…');
        await loadSDK();
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data } = await client.auth.getSession();
        updateAuthButton(data.session);
        client.auth.onAuthStateChange((_event, session) => updateAuthButton(session));
      }
      if (currentUser) {
        const action = prompt('Введи 1, чтобы синхронизировать сейчас, или 2, чтобы выйти.', '1');
        if (action === '2') {
          await client.auth.signOut(); updateAuthButton(null); status('☁ Вы вышли');
        } else if (action === '1') await pullOrChoose();
        return;
      }
      const email = prompt('Email для входа или регистрации:');
      if (!email) return;
      const password = prompt('Пароль (минимум 6 символов):');
      if (!password) return;
      const action = confirm('OK — войти в существующий аккаунт. Отмена — создать аккаунт.');
      let result;
      if (action) {
        result = await client.auth.signInWithPassword({email:email.trim(), password});
      } else {
        result = await client.auth.signUp({email:email.trim(), password});
        if (!result.error && !result.data.session) {
          alert('Регистрация отправлена. Подтверди email по письму, затем нажми кнопку и войди.');
          status('☁ Подтверди email');
          return;
        }
      }
      if (result.error) throw result.error;
      updateAuthButton(result.data.session);
      if (currentUser) await pullOrChoose();
    } catch (e) {
      console.error('Gym Diary auth:', e);
      alert('Не удалось выполнить действие: ' + (e.message || e));
      status('☁ Вход / синхронизация');
    }
  });
  // Existing app save() remains the source of truth locally; cloud writes are debounced.
  const originalSave = save;
  save = function() { originalSave(); writeCloud(); };
  loadSDK().then(() => {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    client.auth.getSession().then(({data}) => {
      updateAuthButton(data.session);
      if (currentUser) { ready = true; status('☁ ' + currentUser.email); }
    });
    client.auth.onAuthStateChange((_event, session) => updateAuthButton(session));
  }).catch(e => console.error('Gym Diary cloud sync:', e));
})();