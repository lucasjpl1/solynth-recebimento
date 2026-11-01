/* Dados de demonstração — tudo aqui é fictício.
   Empresas, fornecedores, clientes, pessoas, CNPJs e chaves de acesso são inventados.
   As chaves de 44 dígitos têm dígito verificador válido (mesmo cálculo da NF-e),
   mas o trecho do CNPJ começa sempre com 000 para não coincidir com empresas reais. */

(function () {
  "use strict";

  // gerador pseudoaleatório com semente fixa: todo visitante vê o mesmo cenário inicial
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const EMPRESA = "Aurora Cosméticos";
  const UNIDADES = ["Matriz", "Filial Norte"];
  const CANAIS = ["Transportadora", "Fornecedor (veículo próprio)", "Correios", "Retirada"];
  const OPERADORES = ["Marina", "Rafael", "Joana", "Diego"];

  const FORNECEDORES = [
    { nome: "Embalagens Vale Azul Ltda", itens: ["Frasco PET 250 ml cristal", "Frasco PET 500 ml âmbar", "Pote PP 200 g branco"] },
    { nome: "Plásticos Serra Norte S.A.", itens: ["Tampa flip-top 24/410 branca", "Válvula pump 28/410", "Tampa rosca 28 mm preta"] },
    { nome: "Gráfica Horizonte Rótulos", itens: ["Rótulo BOPP 80×50 mm", "Rótulo BOPP 60×40 mm", "Cartucho cartão 300 g"] },
    { nome: "Química Pratense Ltda", itens: ["Base emoliente 20 kg", "Glicerina vegetal 25 kg", "Conservante 5 kg"] },
    { nome: "Essências Ribeira", itens: ["Fragrância floral 1 kg", "Fragrância cítrica 1 kg", "Óleo essencial lavanda 500 ml"] },
    { nome: "Papelão Três Rios", itens: ["Caixa de embarque 40×30×25", "Divisória de papelão", "Fita adesiva 48 mm"] },
    { nome: "Vidraria Campo Alto", itens: ["Frasco vidro 30 ml âmbar", "Conta-gotas 18 mm", "Frasco vidro 50 ml"] },
  ];

  const CLIENTES = [
    { nome: "Bella Pele Dermocosméticos", email: "compras@bellapele.exemplo" },
    { nome: "Casa Ipê Naturais", email: "suprimentos@casaipe.exemplo" },
    { nome: "Linha Verde Cosmética", email: "pcp@linhaverde.exemplo" },
    { nome: "Studio Nara", email: "contato@studionara.exemplo" },
  ];

  function pad(n, len) { return String(n).padStart(len, "0"); }

  function dvChave(chave43) {
    let soma = 0, peso = 2;
    for (let i = chave43.length - 1; i >= 0; i--) {
      soma += Number(chave43[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    const dv = 11 - resto;
    return dv >= 10 ? 0 : dv;
  }

  function cnpjFicticio(r) {
    return "000" + pad(Math.floor(r() * 1e5), 5) + "0001" + pad(Math.floor(r() * 100), 2);
  }

  function gerarChave(r, data, cnpj, numero, serie) {
    const aamm = pad(data.getFullYear() % 100, 2) + pad(data.getMonth() + 1, 2);
    const base = "35" + aamm + cnpj + "55" + pad(serie, 3) + pad(numero, 9) + "1" + pad(Math.floor(r() * 1e8), 8);
    return base + dvChave(base);
  }

  function chaveValida(chave) {
    if (!/^\d{44}$/.test(chave)) return false;
    return dvChave(chave.slice(0, 43)) === Number(chave[43]);
  }

  function lerChave(chave) {
    return {
      uf: chave.slice(0, 2),
      aamm: chave.slice(2, 6),
      cnpj: chave.slice(6, 20),
      modelo: chave.slice(20, 22),
      serie: Number(chave.slice(22, 25)),
      numero: Number(chave.slice(25, 34)),
    };
  }

  function itensPara(r, forn) {
    const n = 1 + Math.floor(r() * 3);
    const lista = forn.itens.slice().sort(() => r() - 0.5).slice(0, n);
    return lista.map(function (desc) {
      const caixas = 2 + Math.floor(r() * 30);
      return { descricao: desc, quantidade: caixas * (desc.includes("kg") ? 1 : 50), unidade: desc.includes("kg") || desc.includes("ml") ? "un" : "un", volumes: caixas };
    });
  }

  // Monta o cenário inicial em relação a "agora", para os dias sempre parecerem atuais.
  function gerarCenario(agora) {
    const r = rng(20261101);
    const fornCnpj = FORNECEDORES.map(function () { return cnpjFicticio(r); });
    const notas = [];
    let numero = 18240;
    const dias = 14;

    for (let d = dias - 1; d >= 0; d--) {
      const qtd = d === 0 ? 4 : 2 + Math.floor(r() * 4);
      for (let k = 0; k < qtd; k++) {
        const fi = Math.floor(r() * FORNECEDORES.length);
        const forn = FORNECEDORES[fi];
        const data = new Date(agora);
        data.setDate(data.getDate() - d);
        data.setHours(7 + Math.floor(r() * 10), Math.floor(r() * 60), 0, 0);
        if (data > agora) data.setTime(agora.getTime() - (k + 1) * 23 * 60000);
        numero += 1 + Math.floor(r() * 40);
        const serie = 1;
        const chave = gerarChave(r, data, fornCnpj[fi], numero, serie);

        let status;
        const p = r();
        if (d >= 3) status = p < 0.86 ? "concluido" : p < 0.93 ? "recebido_corrigido" : "cancelada";
        else if (d >= 1) status = p < 0.5 ? "concluido" : p < 0.75 ? "recebido" : p < 0.9 ? "aguardando_correcao" : "aguardando_sefaz";
        else status = p < 0.45 ? "recebido" : p < 0.6 ? "aguardando_sefaz" : "concluido";

        const operador = OPERADORES[Math.floor(r() * OPERADORES.length)];
        const comFoto = status === "concluido" || status === "recebido_corrigido" || r() < 0.5;
        const nota = {
          id: "n" + numero,
          chave: chave,
          numero: numero,
          serie: serie,
          unidade: UNIDADES[r() < 0.7 ? 0 : 1],
          fornecedor: forn.nome,
          canal: CANAIS[Math.floor(r() * CANAIS.length)],
          operador: operador,
          recebidoEm: data.toISOString(),
          status: status,
          foto: comFoto,
          itens: itensPara(r, forn),
          historico: [],
        };
        nota.historico.push({ em: data.toISOString(), texto: "Nota bipada na doca por " + operador + " (" + nota.canal.toLowerCase() + ")" });
        if (comFoto) nota.historico.push({ em: new Date(data.getTime() + 4 * 60000).toISOString(), texto: "Foto de comprovação anexada" });
        if (status === "aguardando_sefaz") nota.historico.push({ em: new Date(data.getTime() + 60000).toISOString(), texto: "SEFAZ ainda não confirmou a autorização da nota" });
        if (status === "aguardando_correcao") nota.historico.push({ em: new Date(data.getTime() + 90 * 60000).toISOString(), texto: "Divergência de quantidade: fornecedor vai emitir carta de correção" });
        if (status === "recebido_corrigido") nota.historico.push({ em: new Date(data.getTime() + 26 * 3600000).toISOString(), texto: "Carta de correção recebida e vinculada" });
        if (status === "concluido") nota.historico.push({ em: new Date(data.getTime() + 2 * 3600000).toISOString(), texto: "Conferência física concluída por " + OPERADORES[(OPERADORES.indexOf(operador) + 1) % OPERADORES.length] });
        if (status === "cancelada") nota.historico.push({ em: new Date(data.getTime() + 3 * 3600000).toISOString(), texto: "Nota cancelada pelo emitente" });
        notas.push(nota);
      }
    }

    // acompanhamentos de pedidos de clientes: algumas notas já chegaram, outras são esperadas
    const pedidos = [];
    const recentes = notas.filter(function (n) { return n.status !== "cancelada"; }).slice(-14);
    CLIENTES.forEach(function (cli, i) {
      const esperadas = [];
      const chegou = recentes.splice(0, i % 2 === 0 ? 2 : 1);
      chegou.forEach(function (n) { esperadas.push({ chave: n.chave, fornecedor: n.fornecedor, numero: n.numero, notaId: n.id }); });
      const pendentes = i === 3 ? 0 : 1 + (i % 2);
      for (let k = 0; k < pendentes; k++) {
        const fi = Math.floor(r() * FORNECEDORES.length);
        numero += 3 + Math.floor(r() * 20);
        esperadas.push({ chave: gerarChave(r, agora, fornCnpj[fi], numero, 1), fornecedor: FORNECEDORES[fi].nome, numero: numero, notaId: null });
      }
      pedidos.push({
        id: "p" + (i + 1),
        cliente: cli.nome,
        email: cli.email,
        pedido: "PV-" + pad(4120 + i * 7, 5),
        responsavel: OPERADORES[(i + 2) % OPERADORES.length],
        esperadas: esperadas,
        avisoAprovado: false,
      });
    });

    return { versao: 1, geradoEm: agora.toISOString(), notas: notas, pedidos: pedidos, fornCnpj: fornCnpj };
  }

  // nova chave aleatória para o botão "gerar chave de exemplo"
  function chaveDeExemplo(estado) {
    const r = rng(Date.now() % 2147483647);
    const fi = Math.floor(r() * FORNECEDORES.length);
    const maior = estado.notas.reduce(function (m, n) { return Math.max(m, n.numero); }, 18000);
    return gerarChave(r, new Date(), estado.fornCnpj[fi], maior + 1 + Math.floor(r() * 30), 1);
  }

  function fornecedorPorCnpj(estado, cnpj) {
    const i = estado.fornCnpj.indexOf(cnpj);
    return i >= 0 ? FORNECEDORES[i] : null;
  }

  window.DemoData = {
    EMPRESA: EMPRESA, UNIDADES: UNIDADES, CANAIS: CANAIS, OPERADORES: OPERADORES, FORNECEDORES: FORNECEDORES,
    gerarCenario: gerarCenario, chaveValida: chaveValida, lerChave: lerChave,
    chaveDeExemplo: chaveDeExemplo, fornecedorPorCnpj: fornecedorPorCnpj, itensPara: itensPara, rng: rng,
  };
})();
