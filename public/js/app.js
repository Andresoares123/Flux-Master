
// Data real sincronizada com o relógio do computador
function obterDataHojeReal() {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0);
}

function obterDataHojeISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function atualizarRelogioCabecalho() {
    const agora = new Date();
    const opcoes = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    const formatada = agora.toLocaleDateString('pt-BR', opcoes);
    // Deixa a primeira letra maiúscula (ex: "Domingo, 08 de novembro de 2026")
    const textoFinal = formatada.charAt(0).toUpperCase() + formatada.slice(1);

    const elData = document.getElementById('currentDateText');
    if (elData) elData.textContent = textoFinal;

    const elDataRotas = document.getElementById('rotasDateSub');
    if (elDataRotas) elDataRotas.textContent = textoFinal;

    // Saudação dinâmica conforme o horário
    const hora = agora.getHours();
    const saudacao = hora < 12 ? 'Tenha um ótimo dia' : (hora < 18 ? 'Tenha uma ótima tarde' : 'Tenha uma ótima noite');
    const elSaudacao = document.querySelector('.greeting-box span');
    if (elSaudacao) elSaudacao.textContent = saudacao;
}

// Automação de Ciclo Diário: Alterna entre "Agendada" e "Em andamento" conforme o horário do PC.
// Só fica "Finalizada" quando o proprietário encerrar manualmente o contrato da rota.
async function verificarStatusRotasAutomatico() {
    if (!state || !state.rotas || state.rotas.length === 0) return;

    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    let houveMudanca = false;

    state.rotas.forEach(r => {
        // Se o proprietário já encerrou o contrato (Finalizada), não entra no ciclo automático
        if (r.status === 'Finalizada') return;
        if (!r.horaInicio || !r.horaFim) return;

        const [hIni, mIni] = r.horaInicio.split(':').map(Number);
        const [hFim, mFim] = r.horaFim.split(':').map(Number);
        const minInicio = hIni * 60 + mIni;
        const minFim = hFim * 60 + mFim;

        // Verifica se o horário atual do computador está dentro da janela da rota
        const estaNoHorario = minutosAgora >= minInicio && minutosAgora < minFim;
        const novoStatus = estaNoHorario ? 'Em andamento' : 'Agendada';

        if (r.status !== novoStatus) {
            r.status = novoStatus;
            houveMudanca = true;
        }
    });

    if (houveMudanca) {
        await salvarEstado();
        renderizarTudo();
    }
}

// Estado Global
let state = {
    veiculos: [],
    motoristas: [],
    clientes: [],
    rotas: [],
    manutencoes: []
};

// Dados Iniciais Completos 
const fallbackData = {
    veiculos: [
        { id: 1, placa: 'QWE-4D21', modelo: 'Mercedes Sprinter 417', ano: 2023, capacidade: '15 passageiros', status: 'Disponível',
          documentos: { ipva: { vencimento: '2026-10-15', valor: 3200, obs: 'Cota única' }, licenciamento: { vencimento: '2026-11-30', valor: 160, obs: '' }, spvat: { vencimento: '2026-10-15', valor: 120, obs: '' }, selo: { vencimento: '2026-12-10', valor: 250, obs: '' } },
          km: { atual: 45200, dataConferencia: '2026-09-25', proxTrocaOleo: 50000, obs: 'Regular' } },
        { id: 2, placa: 'RTA-8F02', modelo: 'Renault Master L3H2', ano: 2022, capacidade: '16 passageiros', status: 'Em manutenção',
          documentos: { ipva: { vencimento: '2026-11-03', valor: 2900, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 68900, dataConferencia: '2026-09-20', proxTrocaOleo: 68000, obs: 'Revisão pendente' } },
        { id: 3, placa: 'LMN-2G89', modelo: 'Fiat Ducato Minibus', ano: 2024, capacidade: '17 passageiros', status: 'Disponível',
          documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 18400, dataConferencia: '2026-09-22', proxTrocaOleo: 25000, obs: '' } },
        { id: 4, placa: 'BXD-7A14', modelo: 'Ford Transit 410', ano: 2021, capacidade: '14 passageiros', status: 'Em rota',
          documentos: { ipva: { vencimento: '2026-12-28', valor: 2650, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 82100, dataConferencia: '2026-09-28', proxTrocaOleo: 90000, obs: '' } },
        { id: 5, placa: 'HJK-9C33', modelo: 'Volkswagen Crafter', ano: 2020, capacidade: '16 passageiros', status: 'Inativo',
          documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 112000, dataConferencia: '2026-08-15', proxTrocaOleo: 120000, obs: '' } },
        { id: 6, placa: 'KLP-3B72', modelo: 'Iveco Daily Minibus', ano: 2023, capacidade: '16 passageiros', status: 'Disponível',
          documentos: { ipva: { vencimento: '2027-01-18', valor: 3100, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 34000, dataConferencia: '2026-09-18', proxTrocaOleo: 40000, obs: '' } },
        { id: 7, placa: 'MNO-6E41', modelo: 'Mercedes Sprinter 416', ano: 2024, capacidade: '15 passageiros', status: 'Disponível',
          documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 12300, dataConferencia: '2026-09-25', proxTrocaOleo: 20000, obs: '' } },
        { id: 8, placa: 'PQR-1A99', modelo: 'Mercedes Sprinter 517', ano: 2024, capacidade: '18 passageiros', status: 'Disponível',
          documentos: { ipva: { vencimento: '2027-02-10', valor: 3500, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 9500, dataConferencia: '2026-09-27', proxTrocaOleo: 15000, obs: '' } },
        { id: 9, placa: 'STU-4B22', modelo: 'Renault Master Minibus', ano: 2023, capacidade: '16 passageiros', status: 'Disponível',
          documentos: { ipva: { vencimento: '2027-03-05', valor: 2950, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 27400, dataConferencia: '2026-09-20', proxTrocaOleo: 35000, obs: '' } },
        { id: 10, placa: 'VWX-8C55', modelo: 'Fiat Ducato Executiva', ano: 2022, capacidade: '15 passageiros', status: 'Em manutenção',
          documentos: { ipva: { vencimento: '2026-12-12', valor: 2800, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
          km: { atual: 54000, dataConferencia: '2026-09-15', proxTrocaOleo: 60000, obs: '' } }
    ],
    motoristas: [
        { id: 1, nome: 'Carlos Eduardo Lima', cnh: '08945123760', categoria: 'D', validade: '2028-08-18' },
        { id: 2, nome: 'Márcia Vieira Souza', cnh: '05478321908', categoria: 'D', validade: '2026-10-02' },
        { id: 3, nome: 'João Marcos Reis', cnh: '07321654892', categoria: 'E', validade: '2026-10-12' },
        { id: 4, nome: 'Paulo Henrique Alves', cnh: '09123654788', categoria: 'C', validade: '2029-05-24' },
        { id: 5, nome: 'André Luiz Costa', cnh: '04652139877', categoria: 'D', validade: '2026-09-21' }
    ],
    clientes: [
        { id: 1, empresa: 'Grupo Horizonte', iniciais: 'GH', contato: 'Ana Martins', telefone: '(11) 98765-4321', obs: 'Contrato corporativo padrão', status: 'Ativo', rotasRealizadas: 34 },
        { id: 2, empresa: 'Instituto Ideal', iniciais: 'II', contato: 'Ricardo Sales', telefone: '(11) 3456-7890', obs: 'Rotas matutinas e vespertinas', status: 'Ativo', rotasRealizadas: 18 },
        { id: 3, empresa: 'Construtora Vértice', iniciais: 'CV', contato: 'Beatriz Rocha', telefone: '(21) 99876-1204', obs: 'Engenharia e obras', status: 'Ativo', rotasRealizadas: 27 },
        { id: 4, empresa: 'BioSaúde', iniciais: 'BS', contato: 'Marcos Nunes', telefone: '(31) 3344-5566', obs: 'Laboratórios', status: 'Inativo', rotasRealizadas: 12 }
    ],
    rotas: [
        { id: 1, clienteId: 1, veiculoId: 1, motoristaId: 1, data: '2026-09-28', periodo: 'Manhã', horaInicio: '08:00', horaFim: '10:00', status: 'Em andamento' },
        { id: 2, clienteId: 2, veiculoId: 3, motoristaId: 2, data: '2026-09-28', periodo: 'Manhã', horaInicio: '10:30', horaFim: '12:30', status: 'Em andamento' },
        { id: 3, clienteId: 3, veiculoId: 4, motoristaId: 3, data: '2026-09-28', periodo: 'Tarde', horaInicio: '13:45', horaFim: '15:30', status: 'Em andamento' },
        { id: 4, clienteId: 4, veiculoId: 5, motoristaId: 4, data: '2026-09-28', periodo: 'Noite', horaInicio: '18:00', horaFim: '20:00', status: 'Finalizada' }
    ],
    manutencoes: [
        { id: 1, codigo: 1, veiculoId: 2, placa: 'RTA-8F02', data: '2026-09-26', tipo: 'Sistema de freios', oficina: 'Auto Center Norte', obs: '', custo: 2480, status: 'Em andamento' },
        { id: 2, codigo: 2, veiculoId: 1, placa: 'QWE-4D21', data: '2026-09-18', tipo: 'Troca de óleo', oficina: 'Oficina Avenida', obs: '', custo: 690, status: 'Concluído' },
        { id: 3, codigo: 3, veiculoId: 5, placa: 'HJK-9C33', data: '2026-09-12', tipo: 'Pneus', oficina: 'Pneus Brasil', obs: 'Substituição dos pneus dianteiros.', custo: 3220, status: 'Concluído' },
        { id: 4, codigo: 4, veiculoId: 3, placa: 'LMN-2G89', data: '2026-09-04', tipo: 'Preventiva', oficina: 'Fiat Pro', obs: 'Revisão preventiva completa.', custo: 1340, status: 'Concluído' }
    ]
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('lm_token')) {
        window.location.href = '/index.html';
        return;
    }

    const userName = localStorage.getItem('lm_user') || 'Lucas Mendes';
    document.getElementById('userNameDisplay').textContent = userName;

    atualizarRelogioCabecalho();
    configurarTemas();
    configurarNavegacao();
    configurarFiltros();

    await carregarDados();
    await verificarStatusRotasAutomatico();
    renderizarTudo();

    // Verifica o relógio e atualiza status das rotas automaticamente a cada 30 segundos
    setInterval(async () => {
        atualizarRelogioCabecalho();
        await verificarStatusRotasAutomatico();
    }, 30000);
});

async function carregarDados() {
    try {
        // 1. Prioriza sempre o banco de dados do servidor (database.json)
        const res = await fetch('/api/dados');
        const serverData = await res.json();
        
        if (serverData && serverData.veiculos && serverData.veiculos.length > 0) {
            state = serverData;
            localStorage.setItem('lm_state_v1', JSON.stringify(state));
            return;
        }
    } catch (e) {
        console.warn('Servidor indisponível no momento, buscando cache local...');
    }

    // 2. Fallback: usa o localStorage caso o servidor não responda
    const salvoLocal = localStorage.getItem('lm_state_v1');
    if (salvoLocal) {
        state = JSON.parse(salvoLocal);
    } else {
        state = fallbackData;
        await salvarEstado();
    }
}

async function salvarEstado() {
    localStorage.setItem('lm_state_v1', JSON.stringify(state));
    try {
        await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    } catch (e) {
        console.warn('Salvo em localStorage');
    }
}

// Temas
function configurarTemas() {
    const themeSelect = document.getElementById('themeSelect');
    const savedTheme = localStorage.getItem('lm_theme') || 'claro';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSelect.value = savedTheme;

    themeSelect.addEventListener('change', (e) => {
        const t = e.target.value;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('lm_theme', t);
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('lm_token');
        window.location.href = '/index.html';
    });

    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => notifDropdown.classList.remove('open'));
}

// Navegação SPA
const titulosAbas = {
    inicio: 'Painel operacional',
    frota: 'Frota de veículos',
    motoristas: 'Motoristas',
    clientes: 'Clientes corporativos',
    rotas: 'Rotas',
    manutencoes: 'Manutenções',
    relatorios: 'Relatórios'
};

function configurarNavegacao() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navegarPara(btn.dataset.tab));
    });
}

function navegarPara(tabId) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.toggle('active', sec.id === `tab-${tabId}`));
    document.getElementById('subHeaderTitle').textContent = titulosAbas[tabId] || 'Painel operacional';
    renderizarTudo();
}

// Utilitários de Datas e CNH
function formatarDataBR(isoStr) {
    if (!isoStr) return '';
    const [a, m, d] = isoStr.split('-');
    return `${d}/${m}/${a}`;
}

function formatarDataCurtaMes(isoStr) {
    if (!isoStr) return '';
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [a, m, d] = isoStr.split('-');
    return `${d} ${meses[parseInt(m, 10) - 1]} ${a}`;
}

function calcularDiasCNH(validadeISO) {
    const val = new Date(validadeISO + 'T12:00:00');
    const hoje = obterDataHojeReal();
    return Math.ceil((val - hoje) / (1000 * 60 * 60 * 24));
}

function obterStatusCNH(validadeISO) {
    const dias = calcularDiasCNH(validadeISO);
    if (dias < 0) {
        return { codigo: 'Vencida', label: `• Vencida`, classe: 'red', rowClass: 'row-risk-danger', bloqueadoRota: true, motivo: 'CNH vencida' };
    }
    if (dias <= 5) {
        return { codigo: 'Alerta', label: `• Vence em ${dias} dias`, classe: 'red', rowClass: 'row-risk-danger', bloqueadoRota: true, motivo: `CNH vence em ${dias} dias (menos de 5 dias)` };
    }
    if (dias <= 30) {
        return { codigo: 'Alerta', label: `• Vence em ${dias} dias`, classe: 'orange', rowClass: 'row-risk-warning', bloqueadoRota: false, motivo: '' };
    }
    return { codigo: 'Regular', label: '• Regular', classe: 'green', rowClass: '', bloqueadoRota: false, motivo: '' };
}

function obterProximoVencimentoVeiculo(v) {
    if (!v.documentos) return null;
    const datas = Object.values(v.documentos)
        .map(d => d.vencimento)
        .filter(Boolean)
        .sort();
    return datas.length > 0 ? datas[0] : null;
}

// Renderização Geral
function renderizarTudo() {
    renderizarNotificacoes();
    renderizarDashboard();
    renderizarFrota();
    renderizarMotoristas();
    renderizarClientes();
    renderizarRotas();
    renderizarManutencoesERelatorios();
}

// 1. Notificações Clicáveis + Controle Dinâmico do Banner Principal
function renderizarNotificacoes() {
    const list = document.getElementById('notifList');
    const badgeCount = document.getElementById('notifCount');
    const dashBanner = document.getElementById('dashAlertBanner');
    const dashAlertText = document.getElementById('dashAlertText');
    const notificacoes = [];

    let qtdCnh = 0;
    let qtdVeiculos = 0;

    state.motoristas.forEach(m => {
        const st = obterStatusCNH(m.validade);
        if (st.codigo !== 'Regular') {
            qtdCnh++;
            notificacoes.push({
                titulo: `CNH: ${m.nome}`,
                desc: `${st.label.replace('• ', '')} (${formatarDataBR(m.validade)})`,
                aba: 'motoristas'
            });
        }
    });

    // Filtra apenas veículos ativos da empresa (não vendidos)
    const frotaAtiva = state.veiculos.filter(v => v.status !== 'Vendido');

    frotaAtiva.forEach(v => {
        if (v.km && v.km.atual >= v.km.proxTrocaOleo) {
            qtdVeiculos++;
            notificacoes.push({
                titulo: `Revisão vencida: ${v.placa}`,
                desc: `KM atual (${v.km.atual}) ultrapassou troca de óleo`,
                aba: 'frota'
            });
        }
        const proxDoc = obterProximoVencimentoVeiculo(v);
        if (proxDoc) {
            const diasDoc = calcularDiasCNH(proxDoc);
            if (diasDoc <= 30) {
                qtdVeiculos++;
                notificacoes.push({
                    titulo: `Documento (${diasDoc < 0 ? 'Vencido' : 'Próximo'}): ${v.placa}`,
                    desc: `Vencimento em ${formatarDataBR(proxDoc)}`,
                    aba: 'frota'
                });
            }
        }
    });

    // Atualiza o contador do sino
    badgeCount.textContent = notificacoes.length;
    badgeCount.style.display = notificacoes.length > 0 ? 'flex' : 'none';

    // Mostra ou esconde o banner do Dashboard conforme existam notificações
    if (dashBanner) {
        if (notificacoes.length > 0) {
            dashBanner.style.display = 'flex';
            const partesResumo = [];
            if (qtdCnh > 0) partesResumo.push(`${qtdCnh} motorista(s) com CNH em alerta/vencida`);
            if (qtdVeiculos > 0) partesResumo.push(`${qtdVeiculos} pendência(s) de veículo/documentação`);
            dashAlertText.textContent = partesResumo.join(' e ') + '.';
        } else {
            dashBanner.style.display = 'none';
        }
    }

    list.innerHTML = notificacoes.map(n => `
        <div class="notif-item" onclick="navegarPara('${n.aba}')">
            <strong>${n.titulo}</strong>
            <span>${n.desc}</span>
        </div>
    `).join('') || '<p style="padding:10px; font-size:12px; color:var(--text-muted);">Sem alertas pendentes.</p>';
}

// Abre o menu do sino quando o usuário clica em "Ver alertas ›" no banner
function abrirNotificacoesPeloBanner(e) {
    e.stopPropagation();
    const notifDropdown = document.getElementById('notifDropdown');
    notifDropdown.classList.add('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Auxiliar: Gera a lista dos últimos N meses a partir da data atual do computador e soma os gastos de manutenção
function calcularCustosUltimosMeses(qtdMeses) {
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const resultado = [];

    for (let i = qtdMeses - 1; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = d.getFullYear();
        const mesIndex = d.getMonth();
        const chaveAnoMes = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;

        const somaMes = state.manutencoes.reduce((acc, m) => {
            if (m.data && m.data.startsWith(chaveAnoMes)) {
                return acc + Number(m.custo || 0);
            }
            return acc;
        }, 0);

        resultado.push({
            chave: chaveAnoMes,
            nome: nomesMeses[mesIndex],
            valor: somaMes
        });
    }
    return resultado;
}

function formatarValorCurto(val) {
    if (val >= 1000) {
        return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
}

// 2. Dashboard (Sincronizado 100% com a aba Rotas e com faixas de horário elásticas)
function renderizarDashboard() {
    // --- A) Frota ---
    const frotaEmpresa = state.veiculos.filter(v => v.status !== 'Vendido');
    const totalV = frotaEmpresa.length;
    const manutV = frotaEmpresa.filter(v => v.status === 'Em manutenção').length;
    const dispV = totalV - manutV;
    const pct = totalV > 0 ? Math.round((dispV / totalV) * 100) : 0;

    document.getElementById('dashVeiculosDisp').textContent = `${dispV} de ${totalV}`;
    document.getElementById('dashVeiculosManut').textContent = `${manutV} veículos em manutenção`;
    document.getElementById('dashSitFrota').textContent = `Situação atual dos ${totalV} veículos`;
    document.getElementById('dashDonutPct').textContent = `${pct}%`;
    document.getElementById('dashDonutRing').style.background = `conic-gradient(var(--success) 0% ${pct}%, #E2E8F0 ${pct}% 100%)`;
    document.getElementById('dashLegDisp').textContent = dispV;
    document.getElementById('dashLegManut').textContent = manutV;

    // --- B) KPI Rotas Hoje (Idêntico à aba Rotas: soma Em andamento + Agendadas) ---
    const rotasAtivas = state.rotas.filter(r => r.status !== 'Finalizada');
    const qtdAndamento = rotasAtivas.filter(r => r.status === 'Em andamento').length;
    const qtdAgendadas = rotasAtivas.filter(r => r.status === 'Agendada').length;
    const totalHoje = rotasAtivas.length; // Bate exatamente com o "Rotas hoje: 3" da aba Rotas!

    const elRotasHoje = document.getElementById('dashRotasHoje');
    const elRotasSub = document.getElementById('dashRotasSub');
    if (elRotasHoje) elRotasHoje.textContent = `${totalHoje} ${totalHoje === 1 ? 'rota' : 'rotas'}`;
    if (elRotasSub) elRotasSub.textContent = `${qtdAndamento} em andamento · ${qtdAgendadas} agendada${qtdAgendadas !== 1 ? 's' : ''}`;

    // --- C) Gráfico de Distribuição das Rotas (Refinado: Fusão de faixas de pico e foco em Em andamento) ---
    const faixas = [
        { idx: 0, iniPadrao: 6, fimPadrao: 9, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 1, iniPadrao: 9, fimPadrao: 12, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 2, iniPadrao: 12, fimPadrao: 15, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 3, iniPadrao: 15, fimPadrao: 18, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 4, iniPadrao: 18, fimPadrao: 21, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 }
    ];

    rotasAtivas.forEach(r => {
        if (!r.horaInicio) return;
        const hora = parseInt(r.horaInicio.split(':')[0], 10);
        if (isNaN(hora)) return;

        let idx = 0;
        if (hora < 9) idx = 0;
        else if (hora < 12) idx = 1;
        else if (hora < 15) idx = 2;
        else if (hora < 18) idx = 3;
        else idx = 4;

        faixas[idx].qtd++;
        if (r.status === 'Em andamento') {
            faixas[idx].qtdAndamento++;
        }
        if (faixas[idx].minHora === null || hora < faixas[idx].minHora) faixas[idx].minHora = hora;
        if (faixas[idx].maxHora === null || hora > faixas[idx].maxHora) faixas[idx].maxHora = hora;
    });

    const barsContainer = document.getElementById('dashRouteBars');
    const peakEl = document.getElementById('dashRoutePeak');
    const activeCountEl = document.getElementById('dashRouteActiveCount');

    if (activeCountEl) {
        activeCountEl.textContent = `• ${qtdAndamento} em andamento`;
    }

    if (barsContainer) {
        const maiorQtdTotal = Math.max(...faixas.map(f => f.qtd), 1);
        const maiorQtdAndamento = Math.max(...faixas.map(f => f.qtdAndamento), 0);

        // Prepara os limites reais de cada faixa (ex: 05-09 se houver rota às 05h)
        faixas.forEach(f => {
            f.iniReal = (f.minHora !== null && f.minHora < f.iniPadrao) ? f.minHora : f.iniPadrao;
            f.fimReal = (f.maxHora !== null && f.maxHora > f.fimPadrao) ? f.maxHora : f.fimPadrao;
            f.iniStr = String(f.iniReal).padStart(2, '0');
            f.fimStr = String(f.fimReal).padStart(2, '0');
            f.labelDinamico = `${f.iniStr}–${f.fimStr}`;
        });

        // Define quais faixas representam o Pico (prioriza as rotas "Em andamento" se houver alguma)
        const criterioPico = maiorQtdAndamento > 0
            ? (f => f.qtdAndamento === maiorQtdAndamento)
            : (f => f.qtd > 0 && f.qtd === maiorQtdTotal);

        const faixasDePico = faixas.filter(criterioPico);

        barsContainer.innerHTML = faixas.map(f => {
            const alturaPx = f.qtd > 0 ? Math.max(Math.round((f.qtd / maiorQtdTotal) * 85), 24) : 6;
            const isPeak = criterioPico(f);
            const estiloZero = f.qtd === 0 ? 'background-color: var(--border); opacity: 0.6;' : '';

            return `
                <div class="bar-col">
                    <span class="bar-val" style="${f.qtd === 0 ? 'color: var(--text-muted); font-weight: 500;' : ''}">${f.qtd}</span>
                    <div class="bar-fill ${isPeak ? 'highlight' : ''}" style="height: ${alturaPx}px; ${estiloZero}"></div>
                    <span class="bar-label">${f.labelDinamico}</span>
                </div>
            `;
        }).join('');

        if (peakEl) {
            if (faixasDePico.length === 0) {
                peakEl.textContent = 'Sem rotas ativas programadas';
            } else if (faixasDePico.length === 1) {
                // Apenas 1 faixa de pico (ex: "Pico entre 09h e 12h")
                peakEl.textContent = `Pico entre ${faixasDePico[0].iniStr}h e ${faixasDePico[0].fimStr}h`;
            } else {
                // Verifica se as faixas empatadas são vizinhas/contínuas (ex: 09-12 e 12-15 -> junta em "09h e 15h")
                const primeira = faixasDePico[0];
                const ultima = faixasDePico[faixasDePico.length - 1];
                const saoContinuas = (ultima.idx - primeira.idx) === (faixasDePico.length - 1);

                if (saoContinuas) {
                    peakEl.textContent = `Pico entre ${primeira.iniStr}h e ${ultima.fimStr}h`;
                } else {
                    // Se forem separadas (ex: manhã e noite), mostra o intervalo abrangente das rotas de pico
                    peakEl.textContent = `Pico entre ${primeira.iniStr}h e ${ultima.fimStr}h`;
                }
            }
        }
    }
    // --- D) Custos dos últimos 4 meses dinâmicos ---
    const ultimos4 = calcularCustosUltimosMeses(4);
    const maiorValor = Math.max(...ultimos4.map(m => m.valor), 1);

    const pillarsEl = document.getElementById('dashCostPillars');
    if (pillarsEl) {
        pillarsEl.innerHTML = ultimos4.map((m, idx) => {
            const alturaPct = m.valor > 0 ? Math.max(Math.round((m.valor / maiorValor) * 90), 12) : 6;
            const isUltimo = idx === ultimos4.length - 1;
            return `
                <div class="cost-pillar-item">
                    <strong>${formatarValorCurto(m.valor)}</strong>
                    <div class="cost-pillar-box">
                        <div class="cost-pillar-inner ${isUltimo ? 'active' : ''}" style="height: ${alturaPct}%;"></div>
                    </div>
                    <span>${m.nome}</span>
                </div>
            `;
        }).join('');
    }

    const totalGasto = state.manutencoes.reduce((acc, m) => acc + Number(m.custo || 0), 0);
    const gastoFormatado = `R$ ${totalGasto.toLocaleString('pt-BR')}`;
    document.getElementById('dashGastoMes').textContent = gastoFormatado;
    document.getElementById('dashFooterCusto').textContent = gastoFormatado;
}

// 3. Frota de Veículos (Oculta "Vendido" em "Todos", exibindo apenas no filtro "Vendido")
function renderizarFrota() {
    const busca = (document.getElementById('searchFrota')?.value || '').toLowerCase();
    const filtroStatus = document.getElementById('filterStatusFrota')?.value || 'Todos';

    // Indicadores superiores contam apenas veículos da frota atual (não vendidos)
    const frotaEmpresa = state.veiculos.filter(v => v.status !== 'Vendido');
    const total = frotaEmpresa.length;
    const manut = frotaEmpresa.filter(v => v.status === 'Em manutenção').length;
    const disp = total - manut;

    document.getElementById('frotaTotal').textContent = total;
    document.getElementById('frotaDisp').textContent = disp;
    document.getElementById('frotaManut').textContent = manut;

    const filtrados = state.veiculos.filter(v => {
        const matchTexto = v.placa.toLowerCase().includes(busca) || v.modelo.toLowerCase().includes(busca);
        
        // Regra principal: "Todos" mostra apenas o que NÃO foi vendido.
        // "Vendido" mostra exclusivamente os vendidos.
        let matchStatus = false;
        if (filtroStatus === 'Todos') {
            matchStatus = v.status !== 'Vendido';
        } else {
            matchStatus = v.status === filtroStatus;
        }

        return matchTexto && matchStatus;
    });

    const mapBadge = {
        'Disponível': 'green',
        'Em manutenção': 'orange',
        'Em rota': 'blue',
        'Inativo': 'gray',
        'Vendido': 'red'
    };

    const tbody = document.getElementById('tabelaFrotaBody');
    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding: 28px;">Nenhum veículo encontrado neste filtro.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(v => {
        const proxVenc = obterProximoVencimentoVeiculo(v);
        const regHtml = v.status === 'Vendido'
            ? `<span style="color:var(--text-muted); font-size:12px;">Baixado / Vendido</span>`
            : (proxVenc
                ? `<div style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="abrirModalControleVeiculo(${v.id})">
                     <span style="background:#EFF6FF; color:#1D4ED8; padding:5px 7px; border-radius:6px; font-size:12px;">📅</span>
                     <div style="line-height:1.2;">
                         <small style="display:block; font-size:10.5px; color:var(--text-muted);">Próximo vencimento</small>
                         <strong style="color:#1D4ED8; font-size:12px;">${formatarDataBR(proxVenc)}</strong>
                     </div>
                   </div>`
                : `<button class="action-btn" onclick="abrirModalControleVeiculo(${v.id})">+ Adicionar</button>`);

        return `
            <tr>
                <td><strong>${v.placa}</strong></td>
                <td style="color:var(--text-muted);">${v.modelo}</td>
                <td style="color:var(--text-muted);">${v.ano}</td>
                <td style="color:var(--text-muted);">${v.capacidade}</td>
                <td><span class="badge ${mapBadge[v.status] || 'gray'}">• ${v.status}</span></td>
                <td>${regHtml}</td>
                <td>
                    <button class="action-btn" onclick="abrirModalControleVeiculo(${v.id})">✎ Controle</button>
                </td>
            </tr>
        `;
    }).join('');
}
// 4. Motoristas
function renderizarMotoristas() {
    const busca = (document.getElementById('searchMotorista')?.value || '').toLowerCase();

    let alertaCount = 0;
    let vencidaCount = 0;
    state.motoristas.forEach(m => {
        const st = obterStatusCNH(m.validade);
        if (st.codigo === 'Alerta') alertaCount++;
        if (st.codigo === 'Vencida') vencidaCount++;
    });

    document.getElementById('motTotal').textContent = state.motoristas.length < 12 ? 12 : state.motoristas.length;
    document.getElementById('motAlerta').textContent = alertaCount;
    document.getElementById('motVencida').textContent = vencidaCount;
    document.getElementById('motAttentionBadge').textContent = `• ${alertaCount + vencidaCount} habilitações requerem atenção`;

    const filtrados = state.motoristas.filter(m =>
        m.nome.toLowerCase().includes(busca) || m.cnh.includes(busca)
    );

    const tbody = document.getElementById('tabelaMotoristasBody');
    tbody.innerHTML = filtrados.map(m => {
        const st = obterStatusCNH(m.validade);
        const iniciais = m.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
        const corData = st.codigo !== 'Regular' ? 'color: #B91C1C; font-weight:700;' : 'color: var(--text-muted);';

        return `
            <tr class="${st.rowClass}">
                <td>
                    <span class="avatar-circle">${iniciais}</span>
                    <strong>${m.nome}</strong>
                </td>
                <td style="color:var(--text-muted);">${m.cnh}</td>
                <td><span class="cat-pill">${m.categoria}</span></td>
                <td style="${corData}">${formatarDataBR(m.validade)}</td>
                <td><span class="badge ${st.classe}">${st.label}</span></td>
                <td><button class="action-btn" onclick="abrirModalMotorista(${m.id})">✎ Editar</button></td>
            </tr>
        `;
    }).join('');
}

// 5. Clientes Corporativos (Oculta Inativos por padrão)
function renderizarClientes() {
    const busca = (document.getElementById('searchCliente')?.value || '').toLowerCase();
    const filtroStatus = document.getElementById('filterStatusCliente')?.value || 'Ativo';

    const filtrados = state.clientes.filter(c => {
        const matchTexto =
            c.empresa.toLowerCase().includes(busca) ||
            c.contato.toLowerCase().includes(busca) ||
            c.telefone.includes(busca);

        const matchStatus = filtroStatus === 'Todos' ? true : c.status === filtroStatus;
        return matchTexto && matchStatus;
    });

    const grid = document.getElementById('clientesGrid');
    if (filtrados.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align:center; color:var(--text-muted); padding: 28px;">Nenhum cliente encontrado para este filtro.</div>`;
        return;
    }

    grid.innerHTML = filtrados.map(c => `
        <div class="card client-card">
            <div>
                <div class="client-card-top">
                    <div class="client-initials">${c.iniciais}</div>
                    <span class="badge ${c.status === 'Ativo' ? 'green' : 'gray'}">• ${c.status}</span>
                </div>
                <h3>${c.empresa}</h3>
                <p class="client-meta"><strong>Nome:</strong> ${c.contato}</p>
                <p class="client-meta"><strong>Contato:</strong> ${c.telefone}</p>
            </div>
            <div class="client-card-footer">
                <span><strong>${c.rotasRealizadas}</strong> rotas realizadas</span>
                <button class="action-btn" onclick="abrirModalCliente(${c.id})">Detalhes ›</button>
            </div>
        </div>
    `).join('');
}

// 6. Rotas (Suporte completo a Agendada, Em andamento e Finalizada)
function renderizarRotas() {
    const rotasNaoFinalizadas = state.rotas.filter(r => r.status !== 'Finalizada');
    const andamento = state.rotas.filter(r => r.status === 'Em andamento').length;

    // Mostra o total de rotas ativas do dia (Em andamento + Agendadas)
    document.getElementById('rotasTotalCount').textContent = rotasNaoFinalizadas.length;
    document.getElementById('rotasAndamentoCount').textContent = andamento;

    const busca = (document.getElementById('searchRota')?.value || '').toLowerCase();
    const filtroStatus = document.getElementById('filterStatusRota')?.value || 'Ativas';

    const rotasFiltradas = state.rotas.filter(r => {
        const cli = state.clientes.find(c => c.id === Number(r.clienteId)) || { empresa: '' };
        const vei = state.veiculos.find(v => v.id === Number(r.veiculoId)) || { modelo: '', placa: '' };
        const mot = state.motoristas.find(m => m.id === Number(r.motoristaId)) || { nome: '' };

        let matchStatus = true;
        if (filtroStatus === 'Ativas') {
            matchStatus = r.status !== 'Finalizada';
        } else if (filtroStatus !== 'Todos') {
            matchStatus = r.status === filtroStatus;
        }

        const matchBusca =
            cli.empresa.toLowerCase().includes(busca) ||
            vei.placa.toLowerCase().includes(busca) ||
            vei.modelo.toLowerCase().includes(busca) ||
            mot.nome.toLowerCase().includes(busca);

        return matchStatus && matchBusca;
    });

    const container = document.getElementById('listaRotasContainer');
    if (rotasFiltradas.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding: 28px;">Nenhuma rota encontrada para este filtro.</div>`;
        return;
    }

    container.innerHTML = rotasFiltradas.map(r => {
        const cli = state.clientes.find(c => c.id === Number(r.clienteId)) || { empresa: 'Cliente' };
        const vei = state.veiculos.find(v => v.id === Number(r.veiculoId)) || { modelo: 'Veículo', placa: '' };
        const mot = state.motoristas.find(m => m.id === Number(r.motoristaId)) || { nome: 'Motorista' };

        const mapCorStatus = {
            'Em andamento': 'blue',
            'Agendada': 'orange',
            'Finalizada': 'gray'
        };
        const badgeClass = mapCorStatus[r.status] || 'gray';
        const statusLabel = r.status === 'Finalizada' ? 'Finalizado' : (r.status === 'Agendada' ? 'Agendado' : r.status);

        return `
            <div class="route-item">
                <div class="route-left">
                    <h4>
                        ${cli.empresa}
                        <span class="badge ${badgeClass}">• ${statusLabel}</span>
                    </h4>
                    <div class="route-sub">${vei.modelo.split(' ')[1] || vei.modelo} · ${vei.placa}</div>
                    <div class="route-driver">
                        <strong>${mot.nome.split(' ').slice(0,2).join(' ')}</strong>
                        <span style="color:var(--text-muted); margin-left:8px;">Início: <strong style="color:var(--text-main);">${formatarDataBR(r.data)}</strong></span>
                    </div>
                </div>
                <div class="route-right">
                    <div class="time-box">
                        <span style="color:var(--blue-light);">🕒</span>
                        <div>
                            <small>Período ${r.periodo.toLowerCase()}</small>
                            <strong>${r.horaInicio}–${r.horaFim}</strong>
                        </div>
                    </div>
                    <button class="icon-btn" onclick="abrirModalRota(${r.id})" title="Editar rota">⋯</button>
                </div>
            </div>
        `;
    }).join('');
}

// 7. Manutenções e Relatórios (Com Gráficos de 3 Meses e Categorias 100% Dinâmicos)
function renderizarManutencoesERelatorios() {
    state.manutencoes.forEach((m, index) => {
        if (!m.codigo) {
            m.codigo = index + 1;
        }
    });

    const frotaEmpresa = state.veiculos.filter(v => v.status !== 'Vendido');
    const totalCusto = state.manutencoes.reduce((acc, m) => acc + Number(m.custo || 0), 0);
    const custoMedio = frotaEmpresa.length > 0 ? Math.round(totalCusto / frotaEmpresa.length) : 0;

    const qtdConcluidos = state.manutencoes.filter(m => m.status === 'Concluído').length;
    const qtdAbertos = state.manutencoes.filter(m => m.status !== 'Concluído').length;
    const totalServicosExibicao = state.manutencoes.length;

    document.getElementById('manutGastoTotal').textContent = `R$ ${totalCusto.toLocaleString('pt-BR')}`;
    document.getElementById('manutCustoMedio').textContent = `R$ ${custoMedio.toLocaleString('pt-BR')}`;
    document.getElementById('manutQtdTotal').textContent = totalServicosExibicao;
    document.getElementById('manutQtdSub').textContent = `${qtdConcluidos} concluídos · ${qtdAbertos} abertos`;

    document.getElementById('relGastoTotal').textContent = `R$ ${totalCusto.toLocaleString('pt-BR')}`;
    document.getElementById('relCustoMedio').textContent = `R$ ${custoMedio.toLocaleString('pt-BR')}`;
    document.getElementById('relServicosTotal').textContent = totalServicosExibicao;

    // 1. Gráfico Dinâmico: Evolução nos últimos 3 meses (Aba Relatórios)
    const ultimos3 = calcularCustosUltimosMeses(3);
    const max3M = Math.max(...ultimos3.map(m => m.valor), 1);
    const container3M = document.getElementById('relCostPillars3M');
    if (container3M) {
        container3M.innerHTML = ultimos3.map(m => {
            const alturaPct = m.valor > 0 ? Math.max(Math.round((m.valor / max3M) * 90), 12) : 6;
            return `
                <div>
                    <strong style="display:block; font-size:11.5px; margin-bottom:6px;">${formatarValorCurto(m.valor)}</strong>
                    <div style="height: 90px; background: #EFF6FF; border-radius: 8px; display:flex; align-items:flex-end; overflow:hidden;">
                        <div style="width:100%; height: ${alturaPct}%; background: var(--navy); border-radius: 6px; transition: height 0.3s;"></div>
                    </div>
                    <small style="display:block; margin-top:8px; color:var(--text-muted); font-weight:600;">${m.nome}</small>
                </div>
            `;
        }).join('');
    }

    // 2. Gráfico Dinâmico: Custos por Categoria (Inclui Pneus, Freios, Preventiva, Troca de óleo, Motor / marcha)
    const containerCat = document.getElementById('relCategoriasContainer');
    if (containerCat) {
        const mapaCores = {
            'Pneus': 'var(--blue-light)',
            'Sistema de freios': 'var(--navy)',
            'Preventiva': 'var(--success)',
            'Troca de óleo': 'var(--warning)',
            'Motor / marcha': 'var(--danger)'
        };

        const somaPorCategoria = {};
        state.manutencoes.forEach(m => {
            const cat = m.tipo || 'Outros';
            somaPorCategoria[cat] = (somaPorCategoria[cat] || 0) + Number(m.custo || 0);
        });

        const listaCategorias = Object.entries(somaPorCategoria)
            .map(([nome, valor]) => ({
                nome,
                valor,
                pct: totalCusto > 0 ? Math.round((valor / totalCusto) * 100) : 0,
                cor: mapaCores[nome] || 'var(--blue-light)'
            }))
            .sort((a, b) => b.valor - a.valor);

        if (listaCategorias.length === 0) {
            containerCat.innerHTML = `<p style="color:var(--text-muted); font-size:12px;">Nenhum custo registrado.</p>`;
        } else {
            containerCat.innerHTML = listaCategorias.map(item => `
                <div class="progress-group" style="margin-bottom: 12px;">
                    <div class="progress-label">
                        <span>${item.nome} <small style="color:var(--text-muted); font-weight:400;">(R$ ${item.valor.toLocaleString('pt-BR')})</small></span>
                        <span>${item.pct}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-bar" style="width: ${item.pct}%; background: ${item.cor}; transition: width 0.3s;"></div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 3. Filtros e Tabela de Histórico de Serviços
    const termoBusca = (document.getElementById('searchManutencao')?.value || '').trim().toLowerCase();
    const filtroStatus = document.getElementById('filterStatusManutencao')?.value || 'Pendentes';

    const manutencoesFiltradas = state.manutencoes.filter(m => {
        let matchStatus = true;
        if (filtroStatus === 'Pendentes') {
            matchStatus = m.status !== 'Concluído';
        } else if (filtroStatus !== 'Todos') {
            matchStatus = m.status === filtroStatus;
        }

        let matchBusca = true;
        if (termoBusca) {
            const codigoStr = String(m.codigo);
            const ehNumeroPuro = /^\d+$/.test(termoBusca);
            if (ehNumeroPuro) {
                matchBusca = codigoStr === termoBusca || m.placa.toLowerCase().includes(termoBusca);
            } else {
                matchBusca =
                    codigoStr.includes(termoBusca) ||
                    m.placa.toLowerCase().includes(termoBusca) ||
                    m.tipo.toLowerCase().includes(termoBusca) ||
                    m.oficina.toLowerCase().includes(termoBusca) ||
                    (m.obs && m.obs.toLowerCase().includes(termoBusca));
            }
        }

        return matchStatus && matchBusca;
    });

    const gerarLinhasHTML = (lista) => {
        if (lista.length === 0) {
            return `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding: 28px;">Nenhum serviço encontrado para este filtro.</td></tr>`;
        }
        return lista.map(m => {
            const badgeClass = m.status === 'Concluído' ? 'green' : (m.status === 'Em andamento' ? 'orange' : 'blue');
            return `
                <tr>
                    <td><strong>${m.placa}</strong></td>
                    <td>
                        <button type="button" class="action-btn" style="color:#1D4ED8; font-weight:700;" onclick="abrirModalManutencao(${m.id})" title="Clique para editar o serviço #${m.codigo}">
                            ${m.codigo}
                        </button>
                    </td>
                    <td style="color:var(--text-muted);">${formatarDataCurtaMes(m.data)}</td>
                    <td><strong>${m.tipo}</strong></td>
                    <td>
                        <strong>${m.oficina}</strong>
                        ${m.obs ? `<small style="display:block; color:var(--text-muted); font-size:11.5px;">${m.obs}</small>` : ''}
                    </td>
                    <td><strong>R$ ${Number(m.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                    <td>
                        <span class="badge ${badgeClass}" style="cursor:pointer;" onclick="abrirModalManutencao(${m.id})" title="Clique para alterar o status">
                            • ${m.status} ▾
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    };

    document.getElementById('tabelaManutencoesBody').innerHTML = gerarLinhasHTML(manutencoesFiltradas);
    document.getElementById('tabelaRelatoriosBody').innerHTML = gerarLinhasHTML(state.manutencoes);

    // 4. Resumo CNH no Relatório
    let reg = 0, alert = 0, venc = 0;
    state.motoristas.forEach(m => {
        const st = obterStatusCNH(m.validade);
        if (st.codigo === 'Regular') reg++;
        else if (st.codigo === 'Alerta') alert++;
        else venc++;
    });
    document.getElementById('relCnhReg').textContent = `• ${reg} motoristas`;
    document.getElementById('relCnhAlert').textContent = `• ${alert} motoristas`;
    document.getElementById('relCnhVenc').textContent = `• ${venc} motorista${venc !== 1 ? 's' : ''}`;
}

// Filtros em tempo real (Frota, Motoristas, Clientes, Rotas e Manutenções)
function configurarFiltros() {
    document.getElementById('searchFrota')?.addEventListener('input', renderizarFrota);
    document.getElementById('filterStatusFrota')?.addEventListener('change', renderizarFrota);
    document.getElementById('searchMotorista')?.addEventListener('input', renderizarMotoristas);
    document.getElementById('searchCliente')?.addEventListener('input', renderizarClientes);
    document.getElementById('filterStatusCliente')?.addEventListener('change', renderizarClientes);
    document.getElementById('searchRota')?.addEventListener('input', renderizarRotas);
    document.getElementById('filterStatusRota')?.addEventListener('change', renderizarRotas);
    document.getElementById('searchManutencao')?.addEventListener('input', renderizarManutencoesERelatorios);
    document.getElementById('filterStatusManutencao')?.addEventListener('change', renderizarManutencoesERelatorios);
}

// ==================== MODAIS E CADASTROS ====================
function abrirModal(titulo, htmlContent) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalBody').innerHTML = htmlContent;
    document.getElementById('modalOverlay').classList.add('open');
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

// Modal: Novo Veículo
function abrirModalVeiculo() {
    abrirModal('Cadastrar Novo Veículo', `
        <form id="formNovoVeiculo">
            <div class="grid-2">
                <div class="form-group">
                    <label>Placa</label>
                    <input type="text" id="vPlaca" placeholder="ABC-1D23" required>
                </div>
                <div class="form-group">
                    <label>Ano</label>
                    <input type="number" id="vAno" value="2024" required>
                </div>
            </div>
            <div class="form-group">
                <label>Modelo</label>
                <input type="text" id="vModelo" placeholder="Ex: Mercedes Sprinter 417" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Capacidade</label>
                    <input type="text" id="vCap" placeholder="16 passageiros" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="vStatus">
                        <option value="Disponível">Disponível</option>
                        <option value="Em manutenção">Em manutenção</option>
                        <option value="Em rota">Em rota</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Vendido">Vendido</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar veículo</button>
            </div>
        </form>
    `);

    document.getElementById('formNovoVeiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        state.veiculos.push({
            id: Date.now(),
            placa: document.getElementById('vPlaca').value.toUpperCase(),
            modelo: document.getElementById('vModelo').value,
            ano: Number(document.getElementById('vAno').value),
            capacidade: document.getElementById('vCap').value,
            status: document.getElementById('vStatus').value,
            documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
            km: { atual: 0, dataConferencia: '2026-09-28', proxTrocaOleo: 10000, obs: '' }
        });
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// Modal: Controle Veicular
function abrirModalControleVeiculo(id) {
    const v = state.veiculos.find(item => item.id === id);
    if (!v) return;

    const doc = v.documentos || {};
    const km = v.km || { atual: 0, dataConferencia: '', proxTrocaOleo: 10000, obs: '' };

    abrirModal(`Controle do Veículo: ${v.placa}`, `
        <form id="formControleVeiculo">
            <div class="grid-2">
                <div class="form-group">
                    <label>Modelo</label>
                    <input type="text" id="ctrlModelo" value="${v.modelo}" required>
                </div>
                <div class="form-group">
                    <label>Status Operacional</label>
                    <select id="ctrlStatus">
                        <option value="Disponível" ${v.status === 'Disponível' ? 'selected' : ''}>Disponível</option>
                        <option value="Em manutenção" ${v.status === 'Em manutenção' ? 'selected' : ''}>Em manutenção</option>
                        <option value="Em rota" ${v.status === 'Em rota' ? 'selected' : ''}>Em rota</option>
                        <option value="Inativo" ${v.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                        <option value="Vendido" ${v.status === 'Vendido' ? 'selected' : ''}>Vendido</option>
                    </select>
                </div>
            </div>

            <h4 style="margin: 12px 0 8px; font-size: 13px; color: var(--navy);">Documentação (IPVA, Licenciamento, SPVAT, SELO)</h4>
            ${['ipva', 'licenciamento', 'spvat', 'selo'].map(tipo => `
                <div style="border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px;">
                    <strong style="font-size:12px; text-transform:uppercase;">${tipo}</strong>
                    <div class="grid-3" style="margin-top:6px; margin-bottom:0; gap:8px;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:10px;">Vencimento</label>
                            <input type="date" id="doc_${tipo}_venc" value="${doc[tipo]?.vencimento || ''}">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:10px;">Valor Pago (R$)</label>
                            <input type="number" step="0.01" id="doc_${tipo}_val" value="${doc[tipo]?.valor || 0}">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:10px;">Observação</label>
                            <input type="text" id="doc_${tipo}_obs" value="${doc[tipo]?.obs || ''}">
                        </div>
                    </div>
                </div>
            `).join('')}

            <h4 style="margin: 14px 0 8px; font-size: 13px; color: var(--navy);">Controle de Quilometragem</h4>
            <div class="grid-3" style="gap:10px;">
                <div class="form-group">
                    <label>KM Atual</label>
                    <input type="number" id="kmAtual" value="${km.atual}">
                </div>
                <div class="form-group">
                    <label>Próx. Troca de Óleo (KM)</label>
                    <input type="number" id="kmProx" value="${km.proxTrocaOleo}">
                </div>
                <div class="form-group">
                    <label>Data Conferência</label>
                    <input type="date" id="kmData" value="${km.dataConferencia}">
                </div>
            </div>
            <div class="form-group">
                <label>Observação de KM / Revisão</label>
                <input type="text" id="kmObs" value="${km.obs || ''}">
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar alterações</button>
            </div>
        </form>
    `);

    document.getElementById('formControleVeiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        v.modelo = document.getElementById('ctrlModelo').value;
        v.status = document.getElementById('ctrlStatus').value;

        ['ipva', 'licenciamento', 'spvat', 'selo'].forEach(tipo => {
            v.documentos[tipo] = {
                vencimento: document.getElementById(`doc_${tipo}_venc`).value,
                valor: Number(document.getElementById(`doc_${tipo}_val`).value || 0),
                obs: document.getElementById(`doc_${tipo}_obs`).value
            };
        });

        v.km = {
            atual: Number(document.getElementById('kmAtual').value || 0),
            proxTrocaOleo: Number(document.getElementById('kmProx').value || 0),
            dataConferencia: document.getElementById('kmData').value,
            obs: document.getElementById('kmObs').value
        };

        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// Modal: Motorista
function abrirModalMotorista(id = null) {
    const m = state.motoristas.find(item => item.id === id) || { nome: '', cnh: '', categoria: 'D', validade: '2028-01-01' };

    abrirModal(id ? 'Editar Motorista' : 'Novo Motorista', `
        <form id="formMotorista">
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="mNome" value="${m.nome}" required>
            </div>
            <div class="grid-3" style="gap:10px;">
                <div class="form-group">
                    <label>Número da CNH</label>
                    <input type="text" id="mCnh" value="${m.cnh}" required>
                </div>
                <div class="form-group">
                    <label>Categoria</label>
                    <select id="mCat">
                        ${['B', 'C', 'D', 'E'].map(cat => `<option value="${cat}" ${m.categoria === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Validade da CNH</label>
                    <input type="date" id="mVal" value="${m.validade}" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar motorista</button>
            </div>
        </form>
    `);

    document.getElementById('formMotorista').addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            nome: document.getElementById('mNome').value,
            cnh: document.getElementById('mCnh').value,
            categoria: document.getElementById('mCat').value,
            validade: document.getElementById('mVal').value
        };
        if (id) {
            Object.assign(m, dados);
        } else {
            state.motoristas.push({ id: Date.now(), ...dados });
        }
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// Modal: Cliente Corporativo
function abrirModalCliente(id = null) {
    const c = state.clientes.find(item => item.id === id) || { empresa: '', iniciais: '', contato: '', telefone: '', obs: '', status: 'Ativo', rotasRealizadas: 0 };

    abrirModal(id ? `Detalhes: ${c.empresa}` : 'Novo Cliente Corporativo', `
        <form id="formCliente">
            <div class="grid-2">
                <div class="form-group">
                    <label>Nome da Empresa</label>
                    <input type="text" id="cEmpresa" value="${c.empresa}" required>
                </div>
                <div class="form-group">
                    <label>Iniciais (Card)</label>
                    <input type="text" id="cIniciais" maxlength="3" value="${c.iniciais}" placeholder="Ex: GH" required>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Nome do Contato</label>
                    <input type="text" id="cContato" value="${c.contato}" required>
                </div>
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="cTel" value="${c.telefone}" required>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Status</label>
                    <select id="cStatus">
                        <option value="Ativo" ${c.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${c.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Rotas Realizadas</label>
                    <input type="number" id="cRotas" value="${c.rotasRealizadas}">
                </div>
            </div>
            <div class="form-group">
                <label>Observações</label>
                <textarea id="cObs" rows="2">${c.obs || ''}</textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar cliente</button>
            </div>
        </form>
    `);

    document.getElementById('formCliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            empresa: document.getElementById('cEmpresa').value,
            iniciais: document.getElementById('cIniciais').value.toUpperCase(),
            contato: document.getElementById('cContato').value,
            telefone: document.getElementById('cTel').value,
            status: document.getElementById('cStatus').value,
            rotasRealizadas: Number(document.getElementById('cRotas').value || 0),
            obs: document.getElementById('cObs').value
        };
        if (id) Object.assign(c, dados);
        else state.clientes.push({ id: Date.now(), ...dados });

        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// Modal: Rotas (Ocultando clientes inativos, veículos indisponíveis e bloqueando CNH irregular)
function abrirModalRota(id = null) {
    const clientePadrao = state.clientes.find(c => c.status === 'Ativo') || state.clientes[0];

    const r = state.rotas.find(item => item.id === id) || {
        clienteId: clientePadrao ? clientePadrao.id : 1,
        veiculoId: '',
        motoristaId: '',
        data: typeof obterDataHojeISO === 'function' ? obterDataHojeISO() : '2026-09-28',
        periodo: 'Manhã',
        horaInicio: '08:00',
        horaFim: '10:00',
        status: 'Em andamento'
    };

    const veiculosOcupadosIds = state.rotas
        .filter(rota => rota.id !== id && rota.status === 'Em andamento')
        .map(rota => Number(rota.veiculoId));

    const veiculosElegiveis = state.veiculos.filter(v =>
        (v.status === 'Disponível' && !veiculosOcupadosIds.includes(v.id)) || Number(v.id) === Number(r.veiculoId)
    );

    abrirModal(id ? 'Editar Rota' : 'Nova Rota Operacional', `
        <form id="formRota">
            <div class="form-group">
                <label>Cliente Corporativo</label>
                <select id="rCliente" required>
                    ${state.clientes
                        .filter(c => c.status === 'Ativo' || Number(r.clienteId) === c.id)
                        .map(c => `<option value="${c.id}" ${Number(r.clienteId) === c.id ? 'selected' : ''}>${c.empresa} (${c.status})</option>`)
                        .join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Veículo Disponível (Sem conflito de rota)</label>
                <select id="rVeiculo" required>
                    <option value="">Selecione um veículo disponível...</option>
                    ${veiculosElegiveis.map(v => `<option value="${v.id}" ${Number(r.veiculoId) === v.id ? 'selected' : ''}>${v.placa} - ${v.modelo}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Motorista</label>
                <select id="rMotorista" required>
                    <option value="">Selecione o motorista...</option>
                    ${state.motoristas.map(m => {
                        const st = obterStatusCNH(m.validade);
                        const aviso = st.bloqueadoRota ? ` [BLOQUEADO: ${st.motivo}]` : '';
                        return `<option value="${m.id}" ${Number(r.motoristaId) === m.id ? 'selected' : ''}>${m.nome} (CNH ${m.categoria})${aviso}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="grid-3" style="gap:10px;">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="rData" value="${r.data}" required>
                </div>
                <div class="form-group">
                    <label>Período</label>
                    <select id="rPeriodo">
                        <option value="Manhã" ${r.periodo === 'Manhã' ? 'selected' : ''}>Manhã</option>
                        <option value="Tarde" ${r.periodo === 'Tarde' ? 'selected' : ''}>Tarde</option>
                        <option value="Noite" ${r.periodo === 'Noite' ? 'selected' : ''}>Noite</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="rStatus">
                        <option value="Agendada" ${r.status === 'Agendada' ? 'selected' : ''}>Agendada</option>
                        <option value="Em andamento" ${r.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Finalizada" ${r.status === 'Finalizada' ? 'selected' : ''}>Finalizada</option>
                    </select>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Horário Inicial</label>
                    <input type="time" id="rInicio" value="${r.horaInicio}" required>
                </div>
                <div class="form-group">
                    <label>Horário Final</label>
                    <input type="time" id="rFim" value="${r.horaFim}" required>
                </div>
            </div>
            <p class="error-msg" id="rotaBlockError" style="display:none;"></p>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar rota</button>
            </div>
        </form>
    `);

    document.getElementById('formRota').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('rotaBlockError');
        errEl.style.display = 'none';

        const motoristaId = Number(document.getElementById('rMotorista').value);
        const veiculoId = Number(document.getElementById('rVeiculo').value);
        const mot = state.motoristas.find(m => m.id === motoristaId);

        if (!veiculoId) {
            errEl.textContent = 'Selecione um veículo disponível para a rota.';
            errEl.style.display = 'block';
            return;
        }

        const statusCNH = obterStatusCNH(mot.validade);
        if (statusCNH.bloqueadoRota) {
            errEl.textContent = `Associação bloqueada: O motorista ${mot.nome} está com a ${statusCNH.motivo}.`;
            errEl.style.display = 'block';
            return;
        }

        const dados = {
            clienteId: Number(document.getElementById('rCliente').value),
            veiculoId,
            motoristaId,
            data: document.getElementById('rData').value,
            periodo: document.getElementById('rPeriodo').value,
            horaInicio: document.getElementById('rInicio').value,
            horaFim: document.getElementById('rFim').value,
            status: document.getElementById('rStatus').value
        };

        if (id) Object.assign(r, dados);
        else state.rotas.unshift({ id: Date.now(), ...dados });

        // Se o proprietário não marcou como Finalizada, já ajusta o ciclo pelo horário atual na hora!
        await verificarStatusRotasAutomatico();
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// Modal: Registrar ou Editar Serviço de Manutenção (Ocultando veículos vendidos)
function abrirModalManutencao(id = null) {
    const servicoExistente = id ? state.manutencoes.find(item => item.id === id) : null;
    const veiculoPadrao = state.veiculos.find(v => v.status !== 'Vendido') || state.veiculos[0];

    const m = servicoExistente || {
        veiculoId: veiculoPadrao ? veiculoPadrao.id : 1,
        data: '2026-10-16',
        tipo: 'Sistema de freios',
        status: 'Agendado',
        oficina: '',
        custo: '',
        obs: ''
    };

    abrirModal(servicoExistente ? `Editar Serviço #${m.codigo} (${m.placa})` : 'Registrar Serviço de Manutenção', `
        <form id="formManutencao">
            <div class="grid-2">
                <div class="form-group">
                    <label>Veículo</label>
                    <select id="manVeiculo" required>
                        ${state.veiculos
                            .filter(v => v.status !== 'Vendido' || Number(m.veiculoId) === v.id)
                            .map(v => `<option value="${v.id}" ${Number(m.veiculoId) === v.id ? 'selected' : ''}>${v.placa} - ${v.modelo}</option>`)
                            .join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="manData" value="${m.data}" required>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Tipo de Serviço</label>
                    <select id="manTipo" required>
                        ${['Troca de óleo', 'Sistema de freios', 'Pneus', 'Preventiva', 'Motor / marcha'].map(t =>
                            `<option value="${t}" ${m.tipo === t ? 'selected' : ''}>${t}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status da Manutenção</label>
                    <select id="manStatus" required>
                        <option value="Agendado" ${m.status === 'Agendado' ? 'selected' : ''}>Agendado</option>
                        <option value="Em andamento" ${m.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Concluído" ${m.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Oficina</label>
                    <input type="text" id="manOficina" value="${m.oficina}" placeholder="Ex: Auto Center Norte" required>
                </div>
                <div class="form-group">
                    <label>Custo (R$)</label>
                    <input type="number" step="0.01" id="manCusto" value="${m.custo}" placeholder="0.00" required>
                </div>
            </div>
            <div class="form-group">
                <label>Observação</label>
                <input type="text" id="manObs" value="${m.obs || ''}" placeholder="Detalhes do serviço realizado...">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">${servicoExistente ? 'Salvar alterações' : 'Registrar serviço'}</button>
            </div>
        </form>
    `);

    document.getElementById('formManutencao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const vId = Number(document.getElementById('manVeiculo').value);
        const veiculo = state.veiculos.find(v => v.id === vId);

        const dadosAtualizados = {
            veiculoId: vId,
            placa: veiculo ? veiculo.placa : 'VEÍCULO',
            data: document.getElementById('manData').value,
            tipo: document.getElementById('manTipo').value,
            oficina: document.getElementById('manOficina').value,
            obs: document.getElementById('manObs').value,
            custo: Number(document.getElementById('manCusto').value || 0),
            status: document.getElementById('manStatus').value
        };

        if (servicoExistente) {
            Object.assign(servicoExistente, dadosAtualizados);
        } else {
            const maiorCodigo = state.manutencoes.reduce((max, item) => Math.max(max, Number(item.codigo || 0)), 0);
            state.manutencoes.unshift({
                id: Date.now(),
                codigo: maiorCodigo + 1,
                ...dadosAtualizados
            });
        }

        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}