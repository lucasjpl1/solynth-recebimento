/* Solynth Recebimento — demo navegável.
   Roda inteiro no navegador. O estado fica na memória e, quando o navegador permite,
   no localStorage deste visitante. Nenhum dado sai da página. */

(function () {
  "use strict";
  const D = window.DemoData;
  const CHAVE_STORAGE = "solynth-recebimento-demo-v1";

  const STATUS = {
    recebido: { rotulo: "Recebido", tom: "info" },
    aguardando_sefaz: { rotulo: "Aguardando SEFAZ", tom: "warning" },
    aguardando_correcao: { rotulo: "Aguardando correção", tom: "warning" },
    recebido_corrigido: { rotulo: "Recebida e corrigida", tom: "info" },
    concluido: { rotulo: "Concluído", tom: "success" },
    cancelada: { rotulo: "Cancelada", tom: "danger" },
  };
  const ATIVOS = ["recebido", "aguardando_sefaz", "aguardando_correcao", "recebido_corrigido"];

  // ---------- estado ----------
  let estado = carregar();
  const sessao = { recebidos: [], foto: null, chave: "", filtro: { status: "ativas", busca: "", unidade: "" }, pedidoAberto: null, simular: true, form: { unidade: D.UNIDADES[0], canal: D.CANAIS[0], operador: D.OPERADORES[0] } };

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "null");
      if (salvo && salvo.versao === 1 && Array.isArray(salvo.notas)) return salvo;
    } catch (e) { /* armazenamento indisponível: segue com o cenário padrão */ }
    return D.gerarCenario(new Date());
  }
  function salvar() {
    try { localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado)); } catch (e) { /* ignora */ }
  }
  function restaurar() {
    try { localStorage.removeItem(CHAVE_STORAGE); } catch (e) { /* ignora */ }
    estado = D.gerarCenario(new Date());
    sessao.recebidos = []; sessao.foto = null; sessao.chave = "";
    toast("Dados de exemplo restaurados");
    render();
  }

  // ---------- utilidades ----------
  const $ = (sel, el) => (el || document).querySelector(sel);
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function badge(st) { const s = STATUS[st]; return '<span class="status status--' + s.tom + '">' + s.rotulo + "</span>"; }
  function fmtData(iso) { const d = new Date(iso); return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  function fmtHora(iso) { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  function mesmoDia(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function hoje(n) { return mesmoDia(new Date(n.recebidoEm), new Date()); }
  function fmtChave(c) { return c.replace(/(\d{4})(?=\d)/g, "$1 "); }
  function nf(n) { return pad(n.numero, 6); }
  function pad(n, l) { return String(n).padStart(l, "0"); }
  function iniciais(nome) { return nome.slice(0, 2).toUpperCase(); }
  function totalVolumes(n) { return n.itens.reduce((s, i) => s + i.volumes, 0); }
  function notasOrdenadas() { return estado.notas.slice().sort((a, b) => b.recebidoEm.localeCompare(a.recebidoEm)); }
  function pedidoDaChave(chave) {
    for (const p of estado.pedidos) for (const e of p.esperadas) if (e.chave === chave) return { pedido: p, esperada: e };
    return null;
  }

  function opts(lista, sel) { return lista.map((v) => "<option" + (v === sel ? " selected" : "") + ">" + esc(v) + "</option>").join(""); }
  function toast(msg) {
    const z = $("#toasts");
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    z.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  const ICON = {
    doca: '<svg viewBox="0 0 24 24"><path d="M4 7V5h2M18 5h2v2M20 17v2h-2M6 19H4v-2"/><path d="M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>',
    painel: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/></svg>',
    pedidos: '<svg viewBox="0 0 24 24"><path d="M7 4h10l3 4v12H4V8z"/><path d="M4 8h16M9 13h6"/></svg>',
    relatorios: '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/></svg>',
    tv: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    tema: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/></svg>',
  };

  const ROTAS = [
    { id: "doca", nome: "Bipagem", icone: ICON.doca },
    { id: "painel", nome: "Painel de notas", icone: ICON.painel },
    { id: "pedidos", nome: "Pedidos de clientes", icone: ICON.pedidos },
    { id: "relatorios", nome: "Relatórios", icone: ICON.relatorios },
    { id: "tv", nome: "Painel de TV", icone: ICON.tv },
  ];
  function rotaAtual() { const h = location.hash.replace("#", ""); return ROTAS.some((r) => r.id === h) ? h : "doca"; }

  // ---------- tema ----------
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("solynth-tema", t); } catch (e) { /* ignora */ }
  }
  function temaInicial() {
    try { const t = localStorage.getItem("solynth-tema"); if (t === "light" || t === "dark") return t; } catch (e) { /* ignora */ }
    return "dark"; // telas de operação abrem no escuro
  }

  // ---------- casco ----------
  function casco(conteudo, rota) {
    return '<a class="skip" href="#conteudo">Pular para o conteúdo</a>' +
      '<div class="app">' +
      '<aside class="side">' +
      '<a class="brand" href="#doca" aria-label="Solynth Recebimento">' +
      '<span><img class="lock-light" src="assets/solynth-lockup.svg" alt="Solynth"><img class="lock-dark" src="assets/solynth-lockup-dark.svg" alt="Solynth"><small>Recebimento</small></span></a>' +
      '<nav class="nav" aria-label="Seções">' +
      ROTAS.map((r) => '<a href="#' + r.id + '"' + (r.id === rota ? ' aria-current="page"' : "") + ">" + r.icone + "<span>" + r.nome + "</span></a>").join("") +
      "</nav>" +
      '<div class="side__foot"><div class="op"><span class="avatar">MA</span><span>Marina<br><span class="muted">Doca 1 · Matriz</span></span></div>' +
      '<button class="btn btn--secondary btn--sm" type="button" data-acao="tema">' + ICON.tema + "Trocar tema</button></div>" +
      "</aside>" +
      '<div class="main">' +
      '<div class="demo-bar"><span><strong>Demonstração.</strong> Empresas, notas e pessoas são fictícias. O que você fizer aqui fica só no seu navegador.</span>' +
      '<span class="actions"><button class="btn btn--ghost btn--sm" type="button" data-acao="restaurar">' + ICON.reset + "Restaurar dados de exemplo</button></span></div>" +
      '<main class="content" id="conteudo" tabindex="-1">' + conteudo + "</main>" +
      "</div></div>";
  }

  // ---------- Bipagem ----------
  function telaDoca() {
    const chave = sessao.chave;
    const valida = D.chaveValida(chave);
    const parcial = chave.length > 0 && !valida;
    let previa = "";
    if (valida) {
      const info = D.lerChave(chave);
      const jaExiste = estado.notas.find((n) => n.chave === chave);
      const forn = D.fornecedorPorCnpj(estado, info.cnpj);
      const vinculo = pedidoDaChave(chave);
      previa = '<div class="lookup" aria-live="polite">' +
        (jaExiste ? '<div><span class="status status--danger">Já recebida</span> <span class="small muted">Esta nota foi bipada em ' + fmtData(jaExiste.recebidoEm) + " por " + esc(jaExiste.operador) + ".</span></div>" : '<div><span class="status status--success">Chave válida</span></div>') +
        "<dl><dt>NF</dt><dd class=\"code\">" + pad(info.numero, 6) + " · série " + info.serie + "</dd>" +
        "<dt>Emissão</dt><dd class=\"code\">" + info.aamm.slice(2) + "/20" + info.aamm.slice(0, 2) + "</dd>" +
        "<dt>Fornecedor</dt><dd>" + (forn ? esc(forn.nome) : "Fornecedor novo (será cadastrado)") + "</dd>" +
        (vinculo ? "<dt>Pedido</dt><dd>Esperada por <strong>" + esc(vinculo.pedido.cliente) + "</strong> (" + esc(vinculo.pedido.pedido) + ")</dd>" : "") +
        "</dl></div>";
    }
    const esperadas = estado.pedidos.flatMap((p) => p.esperadas.filter((e) => !e.notaId).map((e) => ({ e: e, p: p })));

    const lista = sessao.recebidos.length
      ? '<div class="session-list">' + sessao.recebidos.map((id) => {
          const n = estado.notas.find((x) => x.id === id);
          return '<div class="session-item"><div><strong class="code">NF ' + nf(n) + "</strong> · " + esc(n.fornecedor) + '<div class="small muted">' + fmtHora(n.recebidoEm) + " · " + n.itens.length + " " + (n.itens.length > 1 ? "itens" : "item") + " · " + totalVolumes(n) + " volumes</div></div><div>" + badge(n.status) + "</div></div>";
        }).join("") + "</div>"
      : '<div class="empty"><strong>Nenhuma nota nesta sessão</strong>Bipe ou cole uma chave ao lado para registrar o primeiro recebimento.</div>';

    return '<div class="page-head"><div><h1>Bipagem</h1><p>Bipe a chave de acesso da nota, anexe a foto de comprovação e conclua o recebimento.</p></div></div>' +
      '<div class="grid-2">' +
      '<section class="card" aria-labelledby="t-novo"><div class="card__head"><h2 id="t-novo">Novo recebimento</h2><span class="small muted">Doca 1</span></div>' +
      '<form class="card__body" id="form-doca" style="display:grid;gap:var(--space-6)" novalidate>' +
      '<div class="form-grid">' +
      '<label class="field"><span class="field__label">Unidade</span><select class="field__input" id="f-unidade">' + opts(D.UNIDADES, sessao.form.unidade) + "</select></label>" +
      '<label class="field"><span class="field__label">Como chegou</span><select class="field__input" id="f-canal">' + opts(D.CANAIS, sessao.form.canal) + "</select></label>" +
      '<label class="field"><span class="field__label">Quem recebe</span><select class="field__input" id="f-operador">' + opts(D.OPERADORES, sessao.form.operador) + "</select></label>" +
      "</div>" +
      '<div class="chave field' + (parcial ? " field--error" : "") + '">' +
      '<label class="field__label" for="f-chave">Chave de acesso (44 dígitos)</label>' +
      '<div class="chave__row"><input class="field__input field__input--code field__input--big" id="f-chave" inputmode="numeric" autocomplete="off" maxlength="54" placeholder="Bipe o código de barras do DANFE" value="' + esc(chave) + '" aria-describedby="h-chave"></div>' +
      '<span class="field__hint" id="h-chave">' + (parcial ? (chave.length < 44 ? "Faltam " + (44 - chave.length) + " dígitos." : "Dígito verificador não confere. Bipe de novo ou confira a digitação.") : "No celular, o leitor pela câmera preenche este campo. Aqui, use um dos atalhos abaixo.") + "</span>" +
      '<div class="sy-row" style="display:flex;flex-wrap:wrap;gap:var(--space-2)"><button class="btn btn--secondary btn--sm" type="button" data-acao="chave-exemplo">Gerar chave de exemplo</button>' +
      (esperadas.length ? '<button class="btn btn--ghost btn--sm" type="button" data-acao="chave-esperada">Usar uma nota esperada por cliente</button>' : "") + "</div>" +
      "</div>" +
      previa +
      '<div class="photo"><div class="photo__thumb" aria-hidden="true">' + (sessao.foto ? '<img src="' + sessao.foto + '" alt="">' : "sem foto") + "</div>" +
      '<div style="display:grid;gap:var(--space-2)"><span class="field__label">Foto de comprovação</span>' +
      '<div style="display:flex;flex-wrap:wrap;gap:var(--space-2)"><label class="btn btn--secondary btn--sm" for="f-foto">Escolher foto</label><input type="file" id="f-foto" accept="image/*" hidden>' +
      '<button class="btn btn--ghost btn--sm" type="button" data-acao="foto-exemplo">Usar foto de exemplo</button></div>' +
      '<span class="small muted">A foto mostra a carga na doca e protege a empresa em caso de divergência.</span></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:var(--space-2);justify-content:flex-end"><button class="btn btn--secondary" type="button" data-acao="limpar">Limpar</button>' +
      '<button class="btn btn--primary" type="submit"' + (valida && !estado.notas.find((n) => n.chave === chave) ? "" : " disabled") + ">Registrar recebimento</button></div>" +
      "</form></section>" +
      '<section class="card" aria-labelledby="t-sessao"><div class="card__head"><h2 id="t-sessao">Recebidas nesta sessão</h2><span class="small muted">' + sessao.recebidos.length + "</span></div>" + lista + "</section>" +
      "</div>";
  }

  function registrarRecebimento() {
    const chave = sessao.chave;
    if (!D.chaveValida(chave) || estado.notas.find((n) => n.chave === chave)) return;
    const info = D.lerChave(chave);
    const forn = D.fornecedorPorCnpj(estado, info.cnpj) || { nome: "Fornecedor " + info.cnpj.slice(5, 10), itens: ["Material diverso"] };
    const agora = new Date();
    const r = D.rng(Number(chave.slice(-8)));
    const operador = $("#f-operador").value;
    const nota = {
      id: "n" + info.numero + "-" + Date.now().toString(36),
      chave: chave, numero: info.numero, serie: info.serie,
      unidade: $("#f-unidade").value, fornecedor: forn.nome, canal: $("#f-canal").value, operador: operador,
      recebidoEm: agora.toISOString(),
      status: r() < 0.2 ? "aguardando_sefaz" : "recebido",
      foto: !!sessao.foto,
      itens: D.itensPara(r, forn),
      historico: [{ em: agora.toISOString(), texto: "Nota bipada na doca por " + operador + " (" + $("#f-canal").value.toLowerCase() + ")" }],
    };
    if (nota.foto) nota.historico.push({ em: agora.toISOString(), texto: "Foto de comprovação anexada" });
    if (nota.status === "aguardando_sefaz") nota.historico.push({ em: agora.toISOString(), texto: "SEFAZ ainda não confirmou a autorização da nota" });
    const vinculo = pedidoDaChave(chave);
    if (vinculo) {
      vinculo.esperada.notaId = nota.id;
      nota.historico.push({ em: agora.toISOString(), texto: "Vinculada ao pedido " + vinculo.pedido.pedido + " de " + vinculo.pedido.cliente });
    }
    estado.notas.push(nota);
    sessao.recebidos.unshift(nota.id);
    sessao.chave = ""; sessao.foto = null;
    salvar();
    toast("NF " + nf(nota) + " registrada" + (vinculo ? " · aviso pronto para " + vinculo.pedido.cliente : ""));
    render();
    $("#f-chave") && $("#f-chave").focus();
  }

  function fotoExemplo() {
    // desenha uma "foto" de paletes na doca: sem imagem externa, sem pessoas
    const c = document.createElement("canvas"); c.width = 320; c.height = 240;
    const g = c.getContext("2d");
    g.fillStyle = "#3a3f4a"; g.fillRect(0, 0, 320, 240);
    g.fillStyle = "#555b67"; g.fillRect(0, 170, 320, 70);
    const caixa = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(x, y, w, h); g.strokeStyle = "rgba(0,0,0,.25)"; g.strokeRect(x + .5, y + .5, w - 1, h - 1); };
    for (let col = 0; col < 3; col++) for (let lin = 0; lin < 3; lin++) caixa(40 + col * 46, 70 + lin * 33, 44, 31, lin % 2 ? "#c9a46a" : "#d6b27a");
    for (let col = 0; col < 2; col++) for (let lin = 0; lin < 2; lin++) caixa(196 + col * 46, 103 + lin * 33, 44, 31, "#b98f55");
    g.fillStyle = "#7a5a32"; g.fillRect(36, 170, 146, 10); g.fillRect(192, 170, 100, 10);
    g.fillStyle = "rgba(255,255,255,.85)"; g.font = "600 12px monospace"; g.fillText(new Date().toLocaleString("pt-BR"), 10, 228);
    sessao.foto = c.toDataURL("image/jpeg", 0.8);
    render();
  }

  // ---------- Painel de notas ----------
  function filtrarNotas() {
    const f = sessao.filtro;
    const busca = f.busca.trim().toLowerCase();
    return notasOrdenadas().filter((n) => {
      if (f.status === "ativas" && !ATIVOS.includes(n.status)) return false;
      if (f.status !== "ativas" && f.status !== "todos" && n.status !== f.status) return false;
      if (f.unidade && n.unidade !== f.unidade) return false;
      if (busca && !(String(n.numero).includes(busca) || n.fornecedor.toLowerCase().includes(busca) || n.chave.includes(busca.replace(/\s/g, "")))) return false;
      return true;
    });
  }
  function telaPainel() {
    const f = sessao.filtro;
    const lista = filtrarNotas();
    const contagem = (st) => estado.notas.filter((n) => n.status === st).length;
    const linhas = lista.map((n) =>
      '<tr class="clickable" data-nota="' + n.id + '" tabindex="0"><td class="code">' + nf(n) + '</td><td>' + esc(n.fornecedor) + '<div class="small muted">' + esc(n.unidade) + "</div></td>" +
      "<td>" + fmtData(n.recebidoEm) + '</td><td class="num">' + totalVolumes(n) + "</td><td>" + (n.foto ? "Sim" : '<span class="muted">Falta</span>') + "</td><td>" + badge(n.status) + "</td></tr>").join("");
    const opcoes = [["ativas", "Ativas (sem concluídas)"], ["todos", "Todos"]].concat(Object.keys(STATUS).map((k) => [k, STATUS[k].rotulo + " (" + contagem(k) + ")"]));
    return '<div class="page-head"><div><h1>Painel de notas</h1><p>Notas lidas na doca. Recebido quer dizer que a nota foi bipada e registrada; a conferência física vem depois.</p></div></div>' +
      '<section class="card">' +
      '<div class="toolbar">' +
      '<label class="field field--grow"><span class="field__label">Buscar</span><input class="field__input" id="p-busca" placeholder="NF, fornecedor ou chave" value="' + esc(f.busca) + '"></label>' +
      '<label class="field"><span class="field__label">Status</span><select class="field__input" id="p-status">' + opcoes.map((o) => '<option value="' + o[0] + '"' + (o[0] === f.status ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></label>" +
      '<label class="field"><span class="field__label">Unidade</span><select class="field__input" id="p-unidade"><option value="">Todas</option>' + D.UNIDADES.map((u) => '<option value="' + esc(u) + '"' + (u === f.unidade ? " selected" : "") + ">" + esc(u) + "</option>").join("") + "</select></label>" +
      "</div>" +
      (lista.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>NF</th><th>Fornecedor</th><th>Recebida em</th><th class="num">Volumes</th><th>Foto</th><th>Status</th></tr></thead><tbody>' + linhas + "</tbody></table></div>"
        : '<div class="empty"><strong>Nenhuma nota com estes filtros</strong>Limpe a busca ou escolha "Todos" no status.</div>') +
      "</section>";
  }

  function abrirNota(id) {
    const n = estado.notas.find((x) => x.id === id);
    if (!n) return;
    const vinculo = pedidoDaChave(n.chave);
    const acoes = [];
    if (n.status === "recebido" || n.status === "recebido_corrigido") acoes.push('<button class="btn btn--primary" type="button" data-acao="concluir" data-id="' + n.id + '">Concluir conferência</button>');
    if (n.status === "recebido") acoes.push('<button class="btn btn--secondary" type="button" data-acao="divergencia" data-id="' + n.id + '">Registrar divergência</button>');
    if (n.status === "aguardando_correcao") acoes.push('<button class="btn btn--primary" type="button" data-acao="corrigida" data-id="' + n.id + '">Carta de correção recebida</button>');
    if (n.status === "aguardando_sefaz") acoes.push('<button class="btn btn--primary" type="button" data-acao="sefaz" data-id="' + n.id + '">Consultar SEFAZ de novo</button>');
    const el = document.createElement("div");
    el.id = "drawer";
    el.innerHTML = '<div class="drawer-bg" data-acao="fechar"></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="d-titulo">' +
      '<div style="display:flex;justify-content:space-between;gap:var(--space-4);align-items:flex-start"><div><h2 id="d-titulo">NF ' + nf(n) + "</h2><div style=\"margin-top:var(--space-2)\">" + badge(n.status) + "</div></div>" +
      '<button class="btn btn--secondary btn--sm" type="button" data-acao="fechar">Fechar</button></div>' +
      '<section><h3>Nota</h3><dl class="kv"><dt>Fornecedor</dt><dd>' + esc(n.fornecedor) + "</dd><dt>Unidade</dt><dd>" + esc(D.EMPRESA + " · " + n.unidade) + "</dd><dt>Chegou por</dt><dd>" + esc(n.canal) + "</dd><dt>Recebida</dt><dd>" + fmtData(n.recebidoEm) + " por " + esc(n.operador) + "</dd>" +
      (vinculo ? "<dt>Pedido</dt><dd>" + esc(vinculo.pedido.cliente) + " · " + esc(vinculo.pedido.pedido) + "</dd>" : "") +
      '<dt>Chave</dt><dd class="chave-fmt">' + fmtChave(n.chave) + "</dd></dl></section>" +
      '<section><h3>Itens</h3><div class="table-wrap"><table class="table"><thead><tr><th>Descrição</th><th class="num">Volumes</th><th class="num">Qtd.</th></tr></thead><tbody>' +
      n.itens.map((i) => "<tr><td>" + esc(i.descricao) + '</td><td class="num">' + i.volumes + '</td><td class="num">' + i.quantidade.toLocaleString("pt-BR") + "</td></tr>").join("") + "</tbody></table></div></section>" +
      '<section><h3>Histórico</h3><ol class="timeline">' + n.historico.slice().reverse().map((h) => "<li><div><time>" + fmtData(h.em) + "</time>" + esc(h.texto) + "</div></li>").join("") + "</ol></section>" +
      (acoes.length ? '<div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">' + acoes.join("") + "</div>" : "") +
      "</aside>";
    fecharDrawer();
    document.body.appendChild(el);
    $(".drawer [data-acao=fechar]", el).focus();
  }
  function fecharDrawer() { const d = $("#drawer"); if (d) d.remove(); }
  function mudarStatus(id, novo, texto, msg) {
    const n = estado.notas.find((x) => x.id === id);
    n.status = novo;
    n.historico.push({ em: new Date().toISOString(), texto: texto });
    salvar(); toast(msg); render(); abrirNota(id);
  }

  // ---------- Pedidos de clientes ----------
  function telaPedidos() {
    const linhas = estado.pedidos.map((p) => {
      const total = p.esperadas.length, chegou = p.esperadas.filter((e) => e.notaId).length;
      const completo = chegou === total;
      const sit = p.avisoAprovado ? '<span class="status status--success">Cliente avisado</span>' : completo ? '<span class="status status--warning">Aviso para aprovar</span>' : '<span class="status status--info">Aguardando notas</span>';
      return '<tr class="clickable" data-pedido="' + p.id + '" tabindex="0"><td><strong>' + esc(p.cliente) + '</strong><div class="small muted code">' + esc(p.pedido) + "</div></td>" +
        '<td><div style="display:flex;align-items:center;gap:var(--space-3)"><div class="progress" style="flex:1"><span style="width:' + Math.round((chegou / total) * 100) + '%"></span></div><span class="code">' + chegou + "/" + total + "</span></div></td>" +
        "<td>" + sit + "</td><td>" + esc(p.responsavel) + "</td></tr>";
    }).join("");
    const aberto = estado.pedidos.find((p) => p.id === sessao.pedidoAberto);
    return '<div class="page-head"><div><h1>Pedidos de clientes</h1><p>Acompanhe as notas que precisam chegar para cada cliente. Quando todas chegarem, aprove o aviso.</p></div></div>' +
      '<div class="grid-2"><section class="card"><div class="card__head"><h2>Acompanhamentos</h2></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Notas</th><th>Situação</th><th>Responsável</th></tr></thead><tbody>' + linhas + "</tbody></table></div></section>" +
      '<section class="card" aria-live="polite">' + (aberto ? detalhePedido(aberto) : '<div class="empty"><strong>Escolha um acompanhamento</strong>Clique em um cliente para ver as notas esperadas e o aviso.</div>') + "</section></div>";
  }
  function detalhePedido(p) {
    const completo = p.esperadas.every((e) => e.notaId);
    const notasLinhas = p.esperadas.map((e) => {
      const n = e.notaId && estado.notas.find((x) => x.id === e.notaId);
      return "<tr><td class=\"code\">" + pad(e.numero, 6) + "</td><td>" + esc(e.fornecedor) + "</td><td>" + (n ? '<span class="status status--success">Chegou ' + fmtData(n.recebidoEm).split(" ")[0] + "</span>" : '<span class="status status--info">Aguardando</span>') + "</td></tr>";
    }).join("");
    const texto = "Olá, equipe " + p.cliente + ".\n\nTodas as notas do pedido " + p.pedido + " chegaram à nossa doca:\n" +
      p.esperadas.map((e) => "• NF " + pad(e.numero, 6) + " — " + e.fornecedor).join("\n") +
      "\n\nO material segue para conferência e entra na programação de produção.\n\nAtenciosamente,\n" + D.EMPRESA;
    return '<div class="card__head"><h2>' + esc(p.cliente) + '</h2><span class="code small muted">' + esc(p.pedido) + "</span></div>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>NF</th><th>Fornecedor</th><th>Chegada</th></tr></thead><tbody>' + notasLinhas + "</tbody></table></div>" +
      '<div class="card__body" style="display:grid;gap:var(--space-3)">' +
      (completo
        ? '<span class="field__label">Aviso para ' + esc(p.email) + '</span><div class="email-preview">' + esc(texto) + "</div>" +
          (p.avisoAprovado ? '<span class="status status--success">Aviso aprovado</span>' : '<div><button class="btn btn--primary" type="button" data-acao="aprovar" data-id="' + p.id + '">Aprovar aviso</button></div>') +
          '<span class="small muted">No demo nenhum e-mail é enviado.</span>'
        : '<span class="small muted">Faltam ' + p.esperadas.filter((e) => !e.notaId).length + ' nota(s). Para ver o vínculo automático, vá em Bipagem e use "Usar uma nota esperada por cliente".</span>') +
      "</div>";
  }

  // ---------- Relatórios ----------
  function telaRelatorios() {
    const agora = new Date();
    const dias = [];
    for (let d = 13; d >= 0; d--) { const dt = new Date(agora); dt.setDate(dt.getDate() - d); dias.push(dt); }
    const porDia = dias.map((dt) => estado.notas.filter((n) => mesmoDia(new Date(n.recebidoEm), dt)).length);
    const total = estado.notas.filter((n) => n.status !== "cancelada").length;
    const volumes = estado.notas.reduce((s, n) => s + (n.status === "cancelada" ? 0 : totalVolumes(n)), 0);
    const semFoto = estado.notas.filter((n) => !n.foto && n.status !== "cancelada").length;
    const porOp = D.OPERADORES.map((o) => ({ o: o, n: estado.notas.filter((x) => x.operador === o).length })).sort((a, b) => b.n - a.n);
    const porCanal = D.CANAIS.map((c) => ({ c: c, n: estado.notas.filter((x) => x.canal === c).length }));

    // gráfico de barras em escala
    const W = 700, H = 220, padL = 32, padB = 28, padT = 12;
    const max = Math.max(4, Math.ceil(Math.max.apply(null, porDia) / 2) * 2);
    const bw = (W - padL - 8) / dias.length;
    const y = (v) => padT + (H - padT - padB) * (1 - v / max);
    let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Notas recebidas por dia, últimos 14 dias">';
    for (let v = 0; v <= max; v += max / 2) svg += '<line class="grid" x1="' + padL + '" x2="' + (W - 4) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (padL - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>";
    porDia.forEach((v, i) => {
      const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
      svg += '<rect class="bar' + (i === dias.length - 1 ? " bar--today" : "") + '" x="' + x.toFixed(1) + '" y="' + y(v).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(0) - y(v)).toFixed(1) + '" rx="3"><title>' + dias[i].toLocaleDateString("pt-BR") + ": " + v + " notas</title></rect>";
      if (i % 2 === 1 || i === dias.length - 1) svg += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + dias[i].toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + "</text>";
    });
    svg += "</svg>";

    return '<div class="page-head"><div><h1>Relatórios</h1><p>Volume recebido e produtividade da doca nos últimos 14 dias.</p></div></div>' +
      '<div class="kpis">' +
      kpi("Notas recebidas", total, "sem contar canceladas") + kpi("Volumes", volumes.toLocaleString("pt-BR"), "caixas e embalagens") +
      kpi("Média por dia", (total / 14).toFixed(1).replace(".", ","), "notas") + kpi("Sem foto", semFoto, "precisam de comprovação") + "</div>" +
      '<div class="grid-2"><section class="card"><div class="card__head"><h2>Notas por dia</h2><span class="small muted">hoje em destaque</span></div><div class="card__body chart">' + svg + "</div></section>" +
      '<section class="card"><div class="card__head"><h2>Por operador</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Operador</th><th class="num">Notas</th></tr></thead><tbody>' +
      porOp.map((x) => '<tr><td><span style="display:inline-flex;align-items:center;gap:var(--space-2)"><span class="avatar">' + iniciais(x.o) + "</span>" + esc(x.o) + '</span></td><td class="num">' + x.n + "</td></tr>").join("") +
      '</tbody></table></div><div class="card__head" style="border-top:1px solid var(--line)"><h2>Por canal</h2></div><div class="table-wrap"><table class="table"><tbody>' +
      porCanal.map((x) => "<tr><td>" + esc(x.c) + '</td><td class="num">' + x.n + "</td></tr>").join("") + "</tbody></table></div></section></div>";
  }
  function kpi(rot, val, nota) { return '<div class="card kpi"><div class="kpi__label">' + rot + '</div><div class="kpi__value">' + val + '</div><div class="kpi__note">' + nota + "</div></div>"; }

  // ---------- TV ----------
  let relogio = null, simulador = null;
  function telaTV() {
    const doDia = estado.notas.filter(hoje);
    const ult = notasOrdenadas()[0];
    const divergencias = estado.notas.filter((n) => n.status === "aguardando_correcao" || n.status === "aguardando_sefaz").length;
    const semFoto = doDia.filter((n) => !n.foto).length;
    return '<a class="btn btn--secondary btn--sm tv__exit" href="#painel">Sair da TV</a>' +
      '<div class="tv"><div class="tv__head"><div><span class="tv__live">Ao vivo</span><h1>Controle de doca</h1><span class="muted">' + esc(D.EMPRESA + " · " + D.UNIDADES[0]) + '</span></div>' +
      '<div style="text-align:right"><div class="tv__clock" id="tv-relogio">' + new Date().toLocaleTimeString("pt-BR") + '</div><label class="small muted"><input type="checkbox" id="tv-sim"' + (sessao.simular ? " checked" : "") + "> Simular chegadas no demo</label></div></div>" +
      '<div class="kpis">' + kpi("Recebidas hoje", doDia.length, "notas bipadas") + kpi("Concluídas", doDia.filter((n) => n.status === "concluido").length, "conferência feita") +
      kpi("Aguardando", estado.notas.filter((n) => n.status === "recebido").length, "conferência física") + kpi("Divergências", divergencias, "SEFAZ ou correção") + kpi("Sem foto", semFoto, "de hoje") + "</div>" +
      '<div class="tv__grid"><section class="card tv__last" id="tv-ultima"><div class="kpi__label">Última nota bipada</div>' +
      (ult ? '<div class="tv__nf">NF ' + nf(ult) + "</div><div style=\"font-size:20px;line-height:28px\">" + esc(ult.fornecedor) + '</div><div class="muted">' + fmtHora(ult.recebidoEm) + " · " + esc(ult.operador) + " · " + totalVolumes(ult) + " volumes</div><div>" + badge(ult.status) + "</div>" : "") +
      "</section>" +
      '<section class="card"><div class="card__head"><h2>Últimas entradas</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Hora</th><th>NF</th><th>Fornecedor</th><th>Status</th></tr></thead><tbody>' +
      notasOrdenadas().slice(0, 6).map((n, i) => "<tr" + (i === 0 ? ' class="flash"' : "") + '><td class="code">' + fmtHora(n.recebidoEm) + '</td><td class="code">' + nf(n) + "</td><td>" + esc(n.fornecedor) + "</td><td>" + badge(n.status) + "</td></tr>").join("") +
      "</tbody></table></div></section></div></div>";
  }
  function chegadaSimulada() {
    if (rotaAtual() !== "tv" || !sessao.simular) return;
    sessao.chave = D.chaveDeExemplo(estado);
    const info = D.lerChave(sessao.chave);
    const forn = D.fornecedorPorCnpj(estado, info.cnpj);
    const r = D.rng(Date.now() % 100000);
    const op = D.OPERADORES[Math.floor(r() * D.OPERADORES.length)];
    const canal = D.CANAIS[Math.floor(r() * D.CANAIS.length)];
    const agora = new Date().toISOString();
    estado.notas.push({ id: "n" + info.numero + "-" + Date.now().toString(36), chave: sessao.chave, numero: info.numero, serie: 1, unidade: D.UNIDADES[0], fornecedor: forn.nome, canal: canal, operador: op, recebidoEm: agora, status: "recebido", foto: r() < 0.6, itens: D.itensPara(r, forn), historico: [{ em: agora, texto: "Nota bipada na doca por " + op + " (" + canal.toLowerCase() + ")" }] });
    sessao.chave = "";
    salvar(); render();
  }

  // ---------- render ----------
  function render() {
    const rota = rotaAtual();
    const raiz = $("#app");
    fecharDrawer();
    clearInterval(relogio); clearInterval(simulador);
    if (rota === "tv") {
      raiz.innerHTML = telaTV();
      relogio = setInterval(() => { const el = $("#tv-relogio"); if (el) el.textContent = new Date().toLocaleTimeString("pt-BR"); }, 1000);
      simulador = setInterval(chegadaSimulada, 15000);
    } else {
      const telas = { doca: telaDoca, painel: telaPainel, pedidos: telaPedidos, relatorios: telaRelatorios };
      raiz.innerHTML = casco(telas[rota](), rota);
    }
    document.title = (ROTAS.find((r) => r.id === rota).nome) + " · Solynth Recebimento";
  }

  // ---------- eventos ----------
  document.addEventListener("click", (ev) => {
    const alvo = ev.target.closest("[data-acao], [data-nota], [data-pedido]");
    if (!alvo) return;
    if (alvo.dataset.nota) return abrirNota(alvo.dataset.nota);
    if (alvo.dataset.pedido) { sessao.pedidoAberto = alvo.dataset.pedido; return render(); }
    const a = alvo.dataset.acao, id = alvo.dataset.id;
    if (a === "tema") aplicarTema(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    else if (a === "restaurar") restaurar();
    else if (a === "chave-exemplo") { sessao.chave = D.chaveDeExemplo(estado); render(); }
    else if (a === "chave-esperada") {
      const livres = estado.pedidos.flatMap((p) => p.esperadas.filter((e) => !e.notaId));
      if (livres.length) { sessao.chave = livres[Math.floor(Math.random() * livres.length)].chave; render(); }
    }
    else if (a === "foto-exemplo") fotoExemplo();
    else if (a === "limpar") { sessao.chave = ""; sessao.foto = null; render(); }
    else if (a === "fechar") fecharDrawer();
    else if (a === "concluir") mudarStatus(id, "concluido", "Conferência física concluída por Marina", "Conferência concluída");
    else if (a === "divergencia") mudarStatus(id, "aguardando_correcao", "Divergência registrada por Marina: aguardando carta de correção", "Divergência registrada");
    else if (a === "corrigida") mudarStatus(id, "recebido_corrigido", "Carta de correção recebida e vinculada", "Correção vinculada");
    else if (a === "sefaz") mudarStatus(id, "recebido", "SEFAZ confirmou a autorização da nota", "Autorização confirmada");
    else if (a === "aprovar") {
      const p = estado.pedidos.find((x) => x.id === id);
      p.avisoAprovado = true; salvar(); toast("Aviso aprovado para " + p.cliente); render();
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") fecharDrawer();
    if (ev.key === "Enter" && ev.target.matches("tr[data-nota], tr[data-pedido]")) ev.target.click();
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "f-chave") {
      const pos = ev.target.selectionStart;
      sessao.chave = ev.target.value.replace(/\D/g, "").slice(0, 44);
      render();
      const el = $("#f-chave"); if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    }
    if (ev.target.id === "p-busca") {
      sessao.filtro.busca = ev.target.value; render();
      const el = $("#p-busca"); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
    }
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.id === "p-status") { sessao.filtro.status = ev.target.value; render(); }
    if (ev.target.id === "p-unidade") { sessao.filtro.unidade = ev.target.value; render(); }
    if (ev.target.id === "f-unidade") sessao.form.unidade = ev.target.value;
    if (ev.target.id === "f-canal") sessao.form.canal = ev.target.value;
    if (ev.target.id === "f-operador") sessao.form.operador = ev.target.value;
    if (ev.target.id === "tv-sim") { sessao.simular = ev.target.checked; }
    if (ev.target.id === "f-foto" && ev.target.files[0]) {
      const leitor = new FileReader();
      leitor.onload = () => { sessao.foto = leitor.result; render(); };
      leitor.readAsDataURL(ev.target.files[0]);
    }
  });
  document.addEventListener("submit", (ev) => { if (ev.target.id === "form-doca") { ev.preventDefault(); registrarRecebimento(); } });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  aplicarTema(temaInicial());
  render();
})();
