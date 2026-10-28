(() => {
  'use strict';
  function feedback(scope, message, error = false) {
    let el = scope.querySelector('[data-feedback]');
    if (!el) { el = document.createElement('p'); el.dataset.feedback = ''; scope.appendChild(el); }
    el.hidden = false;
    el.textContent = message;
    el.className = error ? 'alert-error' : 'alert-success';
    el.setAttribute('role', error ? 'alert' : 'status');
    el.setAttribute('aria-atomic', 'true');
  }
  function setAttributeState(element, name, state) {
    if (!element) return;
    if (state.present) element.setAttribute(name, state.value);
    else element.removeAttribute(name);
  }
  function beginLoading(button, scope, label) {
    const buttonState = button && {
      html: button.innerHTML,
      disabled: button.disabled,
      busy: { present: button.hasAttribute('aria-busy'), value: button.getAttribute('aria-busy') },
    };
    const scopeBusy = scope && { present: scope.hasAttribute('aria-busy'), value: scope.getAttribute('aria-busy') };

    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = label;
    }
    if (scope) scope.setAttribute('aria-busy', 'true');

    // Sempre restaura rótulo e atributos originais, inclusive após falha de rede.
    return () => {
      if (button && buttonState) {
        button.innerHTML = buttonState.html;
        button.disabled = buttonState.disabled;
        setAttributeState(button, 'aria-busy', buttonState.busy);
      }
      if (scope && scopeBusy) setAttributeState(scope, 'aria-busy', scopeBusy);
    };
  }
  async function send(url, method, body) {
    const multipart = body instanceof FormData;
    const response = await fetch(url, { method, headers: { Accept: 'application/json', ...(multipart ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }) });
    const result = await response.json().catch(() => ({ message: 'Resposta inesperada do servidor.' }));
    if (!response.ok || result.success === false) throw new Error(result.message || 'Não foi possível concluir a operação.');
    return result;
  }
  const roomSelect = document.querySelector('#book-sala');
  if (roomSelect) {
    const choices = document.querySelectorAll('[name=salaChoice]');
    const syncRoom = () => choices.forEach(choice => {
      choice.checked = choice.value === roomSelect.value;
      choice.closest('.sala-card').classList.toggle('sala-selecionada', choice.checked);
    });
    choices.forEach(choice => choice.addEventListener('change', () => {
      roomSelect.value = choice.value;
      syncRoom();
    }));
    roomSelect.addEventListener('change', syncRoom);
    syncRoom();
  }
  const formsInFlight = new WeakSet();
  document.querySelectorAll('[data-api-form]').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      // O bloqueio por formulário protege também submits disparados por teclado ou script.
      if (formsInFlight.has(form)) return;
      if (!form.reportValidity()) return;
      const button = event.submitter || form.querySelector('[type=submit]');
      if (button?.disabled) return;
      let data = {};
      for (const input of form.elements) {
        if (!input.name || input.disabled) continue;
        data[input.name] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? (input.value === '' ? undefined : Number(input.value)) : input.hasAttribute('data-array') ? input.value.split(',').map(s => s.trim()).filter(Boolean) : input.value;
      }
      if ('confirmarSenha' in data && data.confirmarSenha !== data.novaSenha) { feedback(form, 'A confirmação da senha não corresponde.', true); return; }
      if (form.enctype === 'multipart/form-data') {
        const file = form.querySelector('[type=file]').files[0];
        if (file && file.size > 2 * 1024 * 1024) { feedback(form, 'A imagem deve ter no máximo 2 MB.', true); return; }
        data = new FormData(form);
      }
      formsInFlight.add(form);
      const restore = beginLoading(button, form, button?.dataset.loadingLabel || 'Salvando...');
      try {
        const result = await send(form.action, form.dataset.method || 'POST', data);
        feedback(form, result.message || 'Salvo com sucesso.');
        if (form.hasAttribute('data-reset')) form.reset();
        const redirect = form.dataset.redirect || result.redirect;
        if (redirect) window.location.assign(redirect);
      } catch (error) { feedback(form, error.message, true); }
      finally {
        restore();
        formsInFlight.delete(form);
      }
    });
  });
  const actionsInFlight = new WeakSet();
  document.querySelectorAll('[data-api-action]').forEach(button => {
    button.addEventListener('click', async () => {
      if (button.disabled || actionsInFlight.has(button) || (button.dataset.confirm && !window.confirm(button.dataset.confirm))) return;
      const scope = button.closest('article, td, section') || button.parentElement;
      actionsInFlight.add(button);
      const restore = beginLoading(button, scope, button.dataset.loadingLabel || 'Processando...');
      try {
        await send(button.dataset.apiAction, button.dataset.method || 'POST', {});
        if (button.dataset.redirect) window.location.assign(button.dataset.redirect);
        else window.location.reload();
      } catch (error) { feedback(scope, error.message, true); }
      finally {
        restore();
        actionsInFlight.delete(button);
      }
    });
  });
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== tab.dataset.tab; });
    });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(tabs); const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = items[(items.indexOf(tab) + step + items.length) % items.length]; next.focus(); next.click();
    });
  });
  const filter = document.querySelector('[data-filter-form]');
  if (filter) {
    filter.addEventListener('submit', e => e.preventDefault());
    filter.addEventListener('input', () => {
      const q = filter.elements.q.value.trim().toLocaleLowerCase('pt-BR');
      const status = filter.elements.status.value; let visible = 0;
      document.querySelectorAll('[data-filter-item]').forEach(item => { item.hidden = !item.dataset.search.includes(q) || Boolean(status && status !== item.dataset.status); if (!item.hidden) visible++; });
      document.querySelector('[data-filter-empty]').hidden = visible !== 0;
    });
  }
  const profile = document.querySelector('[data-profile-select]');
  if (profile) {
    const update = () => document.querySelectorAll('[data-profile-field]').forEach(group => { group.hidden = group.dataset.profileField !== profile.value; group.querySelectorAll('input').forEach(input => { input.disabled = group.hidden; input.required = !group.hidden && input.hasAttribute('data-required'); }); });
    profile.addEventListener('change', update); update();
  }
})();
